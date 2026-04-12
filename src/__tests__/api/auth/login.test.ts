import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => null),
    set: jest.fn(),
  })),
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.user.findUnique as jest.Mock;

// Fixture helpers
function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Pre-hashed "password123" with bcryptjs cost 12
// We'll use a simple hash at cost 4 for test speed
let hashedPassword: string;
beforeAll(async () => {
  const { hashSync } = await import("bcryptjs");
  hashedPassword = hashSync("password123", 4);
  process.env.JWT_SECRET = "test-secret-for-unit-tests-minimum-32-chars!!";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 for missing body fields", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid email format", async () => {
    const req = makeRequest({ email: "not-an-email", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = makeRequest({ email: "ghost@example.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid credentials");
  });

  it("returns 401 for wrong password", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: hashedPassword,
      profile: null,
    });
    const req = makeRequest({ email: "user@example.com", password: "wrongpassword" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid credentials");
  });

  it("returns 200 with userId and hasProfile=false when credentials are valid (no profile)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-abc",
      email: "user@example.com",
      password: hashedPassword,
      profile: null,
    });
    const req = makeRequest({ email: "user@example.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.userId).toBe("user-abc");
    expect(data.hasProfile).toBe(false);
  });

  it("returns hasProfile=true when user has a profile", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-xyz",
      email: "user@example.com",
      password: hashedPassword,
      profile: { id: "profile-1", name: "Test User" },
    });
    const req = makeRequest({ email: "user@example.com", password: "password123" });
    const res = await POST(req);
    const data = await res.json();
    expect(data.hasProfile).toBe(true);
  });

  it("sets an auth cookie on successful login", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-abc",
      email: "user@example.com",
      password: hashedPassword,
      profile: null,
    });
    const req = makeRequest({ email: "user@example.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Cookie should be set in Set-Cookie header
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("ezmacro-token");
  });

  it("accepts rememberMe flag", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-abc",
      email: "user@example.com",
      password: hashedPassword,
      profile: null,
    });
    const req = makeRequest({
      email: "user@example.com",
      password: "password123",
      rememberMe: true,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 500 on database error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB connection lost"));
    const req = makeRequest({ email: "user@example.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
