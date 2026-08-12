import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { resetRateLimits } from "@/lib/rate-limit";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/email", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => null),
    set: jest.fn(),
  })),
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests-minimum-32-chars!!";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    mockFindUnique.mockResolvedValue(null); // no existing user by default
    mockCreate.mockResolvedValue({ id: "new-user-id", email: "test@example.com" });
  });

  it("returns 400 for missing email", async () => {
    const req = makeRequest({ password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const req = makeRequest({ email: "not-an-email", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for password shorter than 6 characters", async () => {
    const req = makeRequest({ email: "test@example.com", password: "abc" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("6");
  });

  it("returns 409 when email is already registered", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing-user", email: "test@example.com" });
    const req = makeRequest({ email: "test@example.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("registered");
  });

  it("creates user and returns 200 with userId on success", async () => {
    const req = makeRequest({ email: "newuser@example.com", password: "securepass123" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.userId).toBe("new-user-id");
  });

  it("sets auth cookie on successful registration", async () => {
    const req = makeRequest({ email: "newuser@example.com", password: "securepass123" });
    const res = await POST(req);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("ezmacro-token");
  });

  it("does NOT expose hashedPassword in response", async () => {
    const req = makeRequest({ email: "newuser@example.com", password: "securepass123" });
    const res = await POST(req);
    const data = await res.json();
    expect(data.password).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("hashed");
  });

  it("calls prisma.user.create with hashed password (not plaintext)", async () => {
    const plaintext = "mypassword";
    const req = makeRequest({ email: "newuser@example.com", password: plaintext });
    await POST(req);
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.password).not.toBe(plaintext);
    expect(createCall.data.password.startsWith("$2")).toBe(true); // bcrypt hash
  });

  it("returns 500 on database error", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    const req = makeRequest({ email: "test@example.com", password: "password123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
