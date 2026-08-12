import { NextRequest } from "next/server";
import { POST, GET, PUT, DELETE } from "@/app/api/sync/meals/route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mealEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    foodEntry: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = getSession as jest.Mock;
const mockCreate = prisma.mealEntry.create as jest.Mock;
const mockFindMany = prisma.mealEntry.findMany as jest.Mock;
const mockFindUnique = prisma.mealEntry.findUnique as jest.Mock;
const mockFindFirst = prisma.mealEntry.findFirst as jest.Mock;
const mockUpdate = prisma.mealEntry.update as jest.Mock;
const mockUpdateMany = prisma.mealEntry.updateMany as jest.Mock;

function makeRequest(body: object, method = "POST", url = "http://localhost/api/sync/meals"): NextRequest {
  const isBodyless = method === "GET" || method === "HEAD";
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(isBodyless ? {} : { body: JSON.stringify(body) }),
  });
}

const validFood = {
  name: "Chicken Breast",
  servingSize: 150,
  servingUnit: "g",
  servings: 1,
  calories: 247,
  protein: 46,
  carbs: 0,
  fat: 5,
  fiber: 0,
};

const validMeal = {
  type: "lunch",
  name: "Lunch",
  time: "13:00",
  foods: [validFood],
  aiAnalyzed: false,
  verified: true,
};

const savedMeal = {
  id: "meal-1",
  date: "2024-06-15",
  type: "lunch",
  name: "Lunch",
  time: "13:00",
  aiAnalyzed: false,
  verified: true,
  deletedAt: null,
  foods: [{ id: "food-1", mealId: "meal-1", ...validFood }],
};

// ─── POST tests ──────────────────────────────────────────────────────────────

describe("POST /api/sync/meals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockCreate.mockResolvedValue(savedMeal);
    mockFindUnique.mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest({ meal: validMeal, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing meal", async () => {
    const req = makeRequest({ date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing date", async () => {
    const req = makeRequest({ meal: validMeal });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid date format", async () => {
    const req = makeRequest({ meal: validMeal, date: "15/06/2024" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid meal type", async () => {
    const req = makeRequest({ meal: { ...validMeal, type: "brunch" }, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid time format", async () => {
    const req = makeRequest({ meal: { ...validMeal, time: "1:30pm" }, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when foods array is empty", async () => {
    const req = makeRequest({ meal: { ...validMeal, foods: [] }, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with created meal on success", async () => {
    const req = makeRequest({ meal: validMeal, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.meal).toBeDefined();
    expect(data.meal.id).toBe("meal-1");
  });

  it("accepts all valid meal types", async () => {
    for (const type of ["breakfast", "lunch", "dinner", "snack"]) {
      mockCreate.mockResolvedValue({ ...savedMeal, type });
      const req = makeRequest({ meal: { ...validMeal, type }, date: "2024-06-15" });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }
  });

  it("accepts nested food format (food: { name, ... })", async () => {
    const nestedFoodMeal = {
      ...validMeal,
      foods: [{
        food: { name: "Rice", servingSize: 150, servingUnit: "g" },
        servings: 1,
        calories: 195,
        protein: 4,
        carbs: 43,
        fat: 1,
        fiber: 0.5,
      }],
    };
    const req = makeRequest({ meal: nestedFoodMeal, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("creates with the client-provided id (idempotency key)", async () => {
    const clientId = "11111111-2222-3333-4444-555555555555";
    const req = makeRequest({ meal: { ...validMeal, id: clientId }, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: clientId }),
      })
    );
  });

  it("is idempotent: returns the existing meal instead of duplicating when id already exists for this user", async () => {
    const clientId = "11111111-2222-3333-4444-555555555555";
    mockFindUnique.mockResolvedValue({ ...savedMeal, id: clientId, userId: "user-1" });
    const req = makeRequest({ meal: { ...validMeal, id: clientId }, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.existed).toBe(true);
    expect(data.meal.id).toBe(clientId);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates with a fresh server id when the client id belongs to another user", async () => {
    const clientId = "11111111-2222-3333-4444-555555555555";
    mockFindUnique.mockResolvedValue({ ...savedMeal, id: clientId, userId: "OTHER-user" });
    const req = makeRequest({ meal: { ...validMeal, id: clientId }, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const createArgs = mockCreate.mock.calls[0][0];
    expect(createArgs.data.id).toBeUndefined();
  });

  it("returns 500 on database error", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    const req = makeRequest({ meal: validMeal, date: "2024-06-15" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ─── PUT tests ───────────────────────────────────────────────────────────────

describe("PUT /api/sync/meals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindFirst.mockResolvedValue({ id: "meal-1" });
    (prisma.foodEntry.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    mockUpdate.mockResolvedValue({ ...savedMeal, name: "Comida editada" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest({ mealId: "meal-1", meal: { foods: [validFood] } }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when foods are missing", async () => {
    const req = makeRequest({ mealId: "meal-1", meal: {} }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the meal does not belong to the user", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = makeRequest({ mealId: "meal-1", meal: { foods: [validFood] } }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(404);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "meal-1", userId: "user-1", deletedAt: null }),
      })
    );
  });

  it("replaces foods atomically and returns the updated meal", async () => {
    const req = makeRequest(
      { mealId: "meal-1", meal: { name: "Comida editada", foods: [validFood] } },
      "PUT"
    );
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.meal.name).toBe("Comida editada");
    expect(prisma.foodEntry.deleteMany).toHaveBeenCalledWith({ where: { mealId: "meal-1" } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("returns 500 on database error", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error("DB error"));
    const req = makeRequest({ mealId: "meal-1", meal: { foods: [validFood] } }, "PUT");
    const res = await PUT(req);
    expect(res.status).toBe(500);
  });
});

// ─── GET tests ───────────────────────────────────────────────────────────────

describe("GET /api/sync/meals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindMany.mockResolvedValue([savedMeal]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns all meals for authenticated user", async () => {
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.meals)).toBe(true);
    expect(data.meals.length).toBe(1);
  });

  it("filters by date when date param is provided", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals?date=2024-06-15");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: "2024-06-15" }),
      })
    );
  });

  it("excludes soft-deleted meals by default", async () => {
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it("includes tombstones when includeDeleted=1 (needed by the sync)", async () => {
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals?includeDeleted=1");
    await GET(req);
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeUndefined();
  });

  it("never selects photoUrl (payload/localStorage bloat)", async () => {
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals");
    await GET(req);
    const args = mockFindMany.mock.calls[0][0];
    expect(args.select.photoUrl).toBeUndefined();
    expect(args.select.id).toBe(true);
  });

  it("returns 500 on database error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error"));
    const req = makeRequest({}, "GET", "http://localhost/api/sync/meals");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ─── DELETE tests ────────────────────────────────────────────────────────────

describe("DELETE /api/sync/meals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest({ mealId: "meal-1" }, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when mealId is missing", async () => {
    const req = makeRequest({}, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("soft-deletes (sets deletedAt) instead of removing the row", async () => {
    const req = makeRequest({ mealId: "meal-1" }, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("scopes delete to authenticated user (prevents deleting other users' meals)", async () => {
    const req = makeRequest({ mealId: "meal-1" }, "DELETE");
    await DELETE(req);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockUpdateMany.mockRejectedValue(new Error("DB error"));
    const req = makeRequest({ mealId: "meal-1" }, "DELETE");
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
