import { createToken, verifyToken, tokenCookieOptions } from "@/lib/auth";

// Set a test JWT secret before running
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests-minimum-32-chars!!";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ─── createToken ─────────────────────────────────────────────────────────────

describe("createToken", () => {
  it("returns a non-empty JWT string", async () => {
    const token = await createToken("user-123");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    // JWT format: three base64-encoded parts separated by dots
    expect(token.split(".").length).toBe(3);
  });

  it("creates different tokens for different users", async () => {
    const token1 = await createToken("user-aaa");
    const token2 = await createToken("user-bbb");
    expect(token1).not.toBe(token2);
  });

  it("creates a token without rememberMe (default 30d)", async () => {
    const token = await createToken("user-123");
    expect(token).toBeTruthy();
  });

  it("creates a token with rememberMe=true (365d)", async () => {
    const token = await createToken("user-123", true);
    expect(token).toBeTruthy();
    // Both should be valid JWTs
    expect(token.split(".").length).toBe(3);
  });
});

// ─── verifyToken ─────────────────────────────────────────────────────────────

describe("verifyToken", () => {
  it("returns userId for a valid token", async () => {
    const userId = "user-test-verify";
    const token = await createToken(userId);
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(userId);
  });

  it("returns null for an invalid/tampered token", async () => {
    const result = await verifyToken("not.a.valid.jwt");
    expect(result).toBeNull();
  });

  it("returns null for empty string", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    // Craft a token with a different secret
    const { SignJWT } = await import("jose");
    const fakeSecret = new TextEncoder().encode("a-different-secret-entirely!!");
    const badToken = await new SignJWT({ userId: "attacker" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(fakeSecret);
    const result = await verifyToken(badToken);
    expect(result).toBeNull();
  });

  it("round-trip: token encodes and decodes userId correctly", async () => {
    const users = ["user-abc123", "user-xyz789", "user-with-dashes"];
    for (const userId of users) {
      const token = await createToken(userId);
      const result = await verifyToken(token);
      expect(result?.userId).toBe(userId);
    }
  });
});

// ─── tokenCookieOptions ───────────────────────────────────────────────────────

describe("tokenCookieOptions", () => {
  const sampleToken = "sample.jwt.token";

  it("returns object with correct cookie name", () => {
    const options = tokenCookieOptions(sampleToken);
    expect(options.name).toBe("ezmacro-token");
  });

  it("sets the token as the value", () => {
    const options = tokenCookieOptions(sampleToken);
    expect(options.value).toBe(sampleToken);
  });

  it("is httpOnly", () => {
    const options = tokenCookieOptions(sampleToken);
    expect(options.httpOnly).toBe(true);
  });

  it("sameSite is lax", () => {
    const options = tokenCookieOptions(sampleToken);
    expect(options.sameSite).toBe("lax");
  });

  it("path is /", () => {
    const options = tokenCookieOptions(sampleToken);
    expect(options.path).toBe("/");
  });

  it("default maxAge is 30 days in seconds", () => {
    const options = tokenCookieOptions(sampleToken);
    expect(options.maxAge).toBe(60 * 60 * 24 * 30);
  });

  it("rememberMe=true sets maxAge to 365 days", () => {
    const options = tokenCookieOptions(sampleToken, true);
    expect(options.maxAge).toBe(60 * 60 * 24 * 365);
  });

  it("includes an expires Date", () => {
    const before = Date.now();
    const options = tokenCookieOptions(sampleToken);
    const after = Date.now();
    expect(options.expires).toBeInstanceOf(Date);
    const expiresMs = options.expires!.getTime();
    // Should be approximately now + 30 days
    const thirtyDaysMs = 60 * 60 * 24 * 30 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs + 1000);
  });

  it("in non-production: secure is false", () => {
    const original = process.env.NODE_ENV;
    // In test env, NODE_ENV is 'test', not 'production'
    const options = tokenCookieOptions(sampleToken);
    expect(options.secure).toBe(false);
    // Restore
    Object.defineProperty(process.env, "NODE_ENV", { value: original });
  });
});
