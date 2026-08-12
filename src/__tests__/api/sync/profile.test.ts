import { NextRequest } from "next/server";
import { POST, GET, PATCH } from "@/app/api/sync/profile/route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = getSession as jest.Mock;
const mockUpsert = prisma.profile.upsert as jest.Mock;
const mockFindUnique = prisma.profile.findUnique as jest.Mock;
const mockUpdateMany = prisma.profile.updateMany as jest.Mock;

function makeRequest(body: object, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/sync/profile", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validProfile = {
  name: "Test User",
  gender: "male",
  age: 25,
  height: 175,
  weight: 80,
  activityLevel: "moderate",
  trainingLevel: "intermediate",
  goalType: "cut",
};

const savedProfile = { id: "profile-1", userId: "user-1", ...validProfile };

// ─── POST tests ──────────────────────────────────────────────────────────────

describe("POST /api/sync/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockUpsert.mockResolvedValue(savedProfile);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest(validProfile);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const req = makeRequest({ name: "Test" }); // missing most fields
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid goalType", async () => {
    const req = makeRequest({ ...validProfile, goalType: "maintenance" }); // wrong value
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("does NOT touch locale/theme on update when the body omits them (preserva preferencias)", async () => {
    const req = makeRequest(validProfile); // sin locale ni theme
    const res = await POST(req);
    expect(res.status).toBe(200);
    const upsertArgs = mockUpsert.mock.calls[0][0];
    expect(upsertArgs.update.locale).toBeUndefined();
    expect(upsertArgs.update.theme).toBeUndefined();
    // create sí lleva defaults (perfil nuevo)
    expect(upsertArgs.create.locale).toBe("es");
    expect(upsertArgs.create.theme).toBe("dark");
  });

  it("updates locale/theme when explicitly provided", async () => {
    const req = makeRequest({ ...validProfile, locale: "en", theme: "light" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const upsertArgs = mockUpsert.mock.calls[0][0];
    expect(upsertArgs.update.locale).toBe("en");
    expect(upsertArgs.update.theme).toBe("light");
  });

  it("accepts all valid goalTypes", async () => {
    for (const goalType of ["cut", "bulk", "maintain", "recomp"]) {
      mockUpsert.mockResolvedValue({ ...savedProfile, goalType });
      const req = makeRequest({ ...validProfile, goalType });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }
  });

  it("returns 400 for invalid activityLevel", async () => {
    const req = makeRequest({ ...validProfile, activityLevel: "extreme" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for age out of range (< 10)", async () => {
    const req = makeRequest({ ...validProfile, age: 5 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for age out of range (> 120)", async () => {
    const req = makeRequest({ ...validProfile, age: 150 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for weight out of range (< 20)", async () => {
    const req = makeRequest({ ...validProfile, weight: 10 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with profile on success", async () => {
    const req = makeRequest(validProfile);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.profile).toBeDefined();
  });

  it("calls prisma.profile.upsert with correct userId", async () => {
    const req = makeRequest(validProfile);
    await POST(req);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      })
    );
  });

  it("accepts optional locale and theme fields", async () => {
    const req = makeRequest({ ...validProfile, locale: "en", theme: "light" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 500 on database error", async () => {
    mockUpsert.mockRejectedValue(new Error("DB error"));
    const req = makeRequest(validProfile);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ─── GET tests ───────────────────────────────────────────────────────────────

describe("GET /api/sync/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns profile when it exists", async () => {
    mockFindUnique.mockResolvedValue(savedProfile);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile).toBeDefined();
    expect(data.profile.name).toBe("Test User");
  });

  it("returns null profile when user has no profile yet", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile).toBeNull();
  });

  it("returns 500 on database error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ─── PATCH tests ─────────────────────────────────────────────────────────────

describe("PATCH /api/sync/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest({ locale: "en" }, "PATCH");
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("updates locale successfully", async () => {
    const req = makeRequest({ locale: "en" }, "PATCH");
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("updates theme successfully", async () => {
    const req = makeRequest({ theme: "light" }, "PATCH");
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid locale", async () => {
    const req = makeRequest({ locale: "fr" }, "PATCH"); // only es|en allowed
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid theme", async () => {
    const req = makeRequest({ theme: "blue" }, "PATCH");
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("does nothing (but succeeds) when no update fields provided", async () => {
    const req = makeRequest({}, "PATCH");
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    // updateMany should NOT be called since there's nothing to update
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});
