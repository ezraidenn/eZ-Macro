import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("key-a", 5, 60_000)).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("key-a", 5, 60_000);
    expect(checkRateLimit("key-a", 5, 60_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("key-a", 5, 60_000);
    expect(checkRateLimit("key-a", 5, 60_000)).toBe(false);
    expect(checkRateLimit("key-b", 5, 60_000)).toBe(true);
  });

  it("allows again after the window expires", () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      for (let i = 0; i < 3; i++) checkRateLimit("key-a", 3, 60_000);
      expect(checkRateLimit("key-a", 3, 60_000)).toBe(false);
      now += 60_001;
      expect(checkRateLimit("key-a", 3, 60_000)).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it("resetRateLimits clears all buckets", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("key-a", 3, 60_000);
    expect(checkRateLimit("key-a", 3, 60_000)).toBe(false);
    resetRateLimits();
    expect(checkRateLimit("key-a", 3, 60_000)).toBe(true);
  });
});
