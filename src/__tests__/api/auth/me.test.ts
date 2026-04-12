import { GET } from "@/app/api/auth/me/route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = getSession as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.user).toBeNull();
  });

  it("returns 401 when session userId does not match any user", async () => {
    mockGetSession.mockResolvedValue({ userId: "ghost-id" });
    mockFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user data without profile when user has no profile", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed",
      profile: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe("user-1");
    expect(data.user.email).toBe("test@example.com");
    expect(data.user.profile).toBeNull();
  });

  it("returns user data with profile when profile exists", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed",
      profile: {
        id: "profile-1",
        name: "Test User",
        gender: "male",
        age: 25,
        height: 175,
        weight: 80,
        activityLevel: "moderate",
        trainingLevel: "intermediate",
        goalType: "cut",
        locale: "es",
        theme: "dark",
      },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.profile).not.toBeNull();
    expect(data.user.profile.name).toBe("Test User");
    expect(data.user.profile.goalType).toBe("cut");
  });

  it("does NOT expose password in the response", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "super-secret-hash",
      profile: null,
    });
    const res = await GET();
    const data = await res.json();
    expect(JSON.stringify(data)).not.toContain("super-secret-hash");
    expect(data.user.password).toBeUndefined();
  });

  it("queries user with profile included", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockFindUnique.mockResolvedValue(null);
    await GET();
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ include: { profile: true } })
    );
  });
});
