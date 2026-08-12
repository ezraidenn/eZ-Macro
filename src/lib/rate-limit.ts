import { NextRequest } from "next/server";

/**
 * Rate limiter en memoria, compartido por todos los endpoints.
 *
 * LIMITACIÓN CONOCIDA (serverless): cada instancia lambda tiene su propio Map,
 * y se resetea en cold starts — el límite efectivo es "por instancia".
 * Suficiente como primera barrera; para un límite global usar Redis/Upstash.
 */
const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Purga periódica para evitar crecimiento sin límite
  if (buckets.size > MAX_TRACKED_KEYS) {
    buckets.forEach((times, k) => {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    });
  }

  return true;
}

/** Primera IP del header x-forwarded-for (Vercel la setea siempre). */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Solo para tests: limpia todos los buckets. */
export function resetRateLimits() {
  buckets.clear();
}
