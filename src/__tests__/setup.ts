// Global test setup

// Polyfill TextEncoder/TextDecoder for jose JWT tests in Node
import { TextEncoder, TextDecoder } from "util";
if (typeof global.TextEncoder === "undefined") {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  (global as any).TextDecoder = TextDecoder;
}

// Mock next/headers (server-only module unavailable in Jest)
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => false),
  })),
  headers: jest.fn(() => new Map()),
}));

// Silence console.warn in tests
global.console.warn = jest.fn();
