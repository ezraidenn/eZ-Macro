/**
 * Food Search API — powered by Open Food Facts (free, no API key required)
 * https://world.openfoodfacts.org
 *
 * GET /api/foods/search?q=chicken          — text search
 * GET /api/foods/search?barcode=3017620422003 — barcode lookup
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const OFF_BASE = "https://world.openfoodfacts.org";
const FIELDS = "code,product_name,brands,serving_size,serving_quantity,nutriments,image_front_small_url";

// Simple server-side LRU-ish cache to reduce OFF API calls
const searchCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key: string) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  // Evict oldest entries when cache grows too large
  if (searchCache.size >= 200) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, ts: Date.now() });
}

interface NormalizedFood {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;   // grams
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  barcode?: string;
  imageUrl?: string;
}

/**
 * Normalize an Open Food Facts product into our internal FoodItem format.
 * Calorie value is always recalculated from macros to ensure mathematical
 * consistency (kcal = P×4 + C×4 + F×9).
 */
function normalizeProduct(product: any): NormalizedFood | null {
  const name = (product.product_name || "").trim();
  if (!name) return null;

  const n = product.nutriments || {};

  // Preferred serving quantity (grams). Fall back to 100g.
  const servingQty = Number(product.serving_quantity) || 100;

  // Helper: prefer _serving values, fall back to _100g scaled to serving size.
  const getVal = (key: string): number => {
    const byServing = n[`${key}_serving`];
    if (byServing != null && !isNaN(Number(byServing))) return Number(byServing);
    const per100 = n[`${key}_100g`];
    if (per100 != null && !isNaN(Number(per100))) {
      return (Number(per100) * servingQty) / 100;
    }
    return 0;
  };

  const protein = Math.max(0, getVal("proteins"));
  const carbs   = Math.max(0, getVal("carbohydrates"));
  const fat     = Math.max(0, getVal("fat"));
  const fiber   = Math.max(0, getVal("fiber"));

  // Always derive calories from macros — never trust OFF calorie field blindly.
  // Fallback to OFF's kcal only when the product has no macro data at all.
  // If both are zero the product has no nutritional data — skip it.
  const calculatedKcal = protein * 4 + carbs * 4 + fat * 9;
  const offKcal = getVal("energy-kcal");

  if (calculatedKcal < 1 && offKcal < 1) return null;

  const calories = Math.round(calculatedKcal > 0 ? calculatedKcal : offKcal);

  // Unidad de porción: primera palabra alfabética del serving_size
  // ("30 g" → "g", "2 tbsp (30g)" → "tbsp")
  const rawServingSize = (product.serving_size || "").toString().trim();
  const servingUnit = rawServingSize.match(/[a-zA-Z]+/)?.[0] || "g";

  return {
    id: product.code || `off-${Math.random().toString(36).slice(2)}`,
    name,
    brand: product.brands?.split(",")[0]?.trim() || undefined,
    servingSize: servingQty,
    servingUnit: servingUnit || "g",
    calories,
    protein: Math.round(protein * 10) / 10,
    carbs:   Math.round(carbs   * 10) / 10,
    fat:     Math.round(fat     * 10) / 10,
    fiber:   Math.round(fiber   * 10) / 10,
    barcode: product.code || undefined,
    imageUrl: product.image_front_small_url || undefined,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query   = searchParams.get("q")?.trim();
  const barcode = searchParams.get("barcode")?.trim();

  if (!query && !barcode) {
    return NextResponse.json({ error: "Provide q or barcode param" }, { status: 400 });
  }

  // ── Barcode lookup ────────────────────────────────────────────────────────
  if (barcode) {
    // Validate: barcode should be numeric, 8-14 digits
    if (!/^\d{8,14}$/.test(barcode)) {
      return NextResponse.json({ error: "Invalid barcode format" }, { status: 400 });
    }

    const cacheKey = `barcode:${barcode}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    try {
      const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "eZMacro/1.0 (nutrition tracking app)" },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return NextResponse.json({ found: false, product: null });
      }

      const data = await res.json();

      if (data.status !== 1 || !data.product) {
        return NextResponse.json({ found: false, product: null });
      }

      const product = normalizeProduct(data.product);
      const result = { found: !!product, product };
      setCache(cacheKey, result);
      return NextResponse.json(result);
    } catch (err: any) {
      console.error("Barcode lookup error:", err);
      return NextResponse.json({ found: false, product: null, error: "Lookup failed" });
    }
  }

  // ── Text search ───────────────────────────────────────────────────────────
  if (query) {
    if (query.length < 2) {
      return NextResponse.json({ results: [], total: 0 });
    }
    if (query.length > 100) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    const cacheKey = `search:${query.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    try {
      const params = new URLSearchParams({
        search_terms: query,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "20",
        fields: FIELDS,
        // Prefer products with complete nutritional info
        sort_by: "popularity_key",
      });

      const url = `${OFF_BASE}/cgi/search.pl?${params.toString()}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "eZMacro/1.0 (nutrition tracking app)" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ results: [], total: 0 });
      }

      const data = await res.json();
      const products: any[] = data.products || [];

      const results: NormalizedFood[] = products
        .map(normalizeProduct)
        .filter((p): p is NormalizedFood => p !== null)
        // Prefer products with brand info and non-trivial macros
        .slice(0, 15);

      const result = { results, total: data.count || results.length };
      setCache(cacheKey, result);
      return NextResponse.json(result);
    } catch (err: any) {
      console.error("Food search error:", err);
      return NextResponse.json(
        { error: "Search failed", results: [], total: 0 },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ results: [], total: 0 });
}
