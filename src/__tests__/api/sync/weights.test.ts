import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/sync/weights/route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    weightEntry: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = getSession as jest.Mock;
const mockUpsert = prisma.weightEntry.upsert as jest.Mock;
const mockFindMany = prisma.weightEntry.findMany as jest.Mock;

function makeRequest(body: object, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/sync/weights", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const savedEntry = {
  id: "weight-1",
  userId: "user-1",
  date: "2024-06-15",
  weight: 80.5,
  movingAvg: null,
};

// ─── POST tests ──────────────────────────────────────────────────────────────

describe("POST /api/sync/weights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockUpsert.mockResolvedValue(savedEntry);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest({ date: "2024-06-15", weight: 80.5 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing date", async () => {
    const req = makeRequest({ weight: 80.5 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid date format", async () => {
    const req = makeRequest({ date: "15-06-2024", weight: 80.5 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for weight below minimum (< 20kg)", async () => {
    const req = makeRequest({ date: "2024-06-15", weight: 10 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for weight above maximum (> 500kg)", async () => {
    const req = makeRequest({ date: "2024-06-15", weight: 600 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with entry on success", async () => {
    const req = makeRequest({ date: "2024-06-15", weight: 80.5 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.entry).toBeDefined();
  });

  it("upserts by (userId, date) — second log same day replaces first", async () => {
    const req = makeRequest({ date: "2024-06-15", weight: 80.5 });
    await POST(req);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_date: { userId: "user-1", date: "2024-06-15" } },
      })
    );
  });

  it("accepts optional movingAvg field", async () => {
    const req = makeRequest({ date: "2024-06-15", weight: 80.5, movingAvg: 80.2 });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("accepts boundary weight values", async () => {
    for (const weight of [20, 500]) {
      mockUpsert.mockResolvedValue({ ...savedEntry, weight });
      const req = makeRequest({ date: "2024-06-15", weight });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }
  });

  it("returns 500 on database error", async () => {
    mockUpsert.mockRejectedValue(new Error("DB error"));
    const req = makeRequest({ date: "2024-06-15", weight: 80.5 });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ─── GET tests ───────────────────────────────────────────────────────────────

describe("GET /api/sync/weights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindMany.mockResolvedValue([savedEntry]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns weight history for authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.weights)).toBe(true);
    expect(data.weights.length).toBe(1);
    expect(data.weights[0].weight).toBe(80.5);
  });

  it("orders results by date ascending", async () => {
    await GET();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: "asc" },
      })
    );
  });

  it("returns empty array when no weights logged", async () => {
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.weights).toEqual([]);
  });

  it("scopes query to authenticated user only", async () => {
    await GET();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
