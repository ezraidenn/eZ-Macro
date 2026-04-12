/**
 * Manual mock for `jose` that runs in Node CJS environment.
 * Uses simple HMAC-SHA256 + JSON for JWT-compatible tokens (test only).
 */
import { createHmac } from "crypto";

function b64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

function sign(header: object, payload: object, key: Uint8Array): string {
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", Buffer.from(key)).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verify(token: string, key: Uint8Array): object {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = b64url(
    createHmac("sha256", Buffer.from(key)).update(data).digest()
  );
  if (expectedSig !== sigB64) throw new Error("Signature verification failed");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return payload;
}

export class SignJWT {
  private _header: Record<string, string> = {};
  private _payload: Record<string, unknown>;

  constructor(payload: Record<string, unknown>) {
    this._payload = { ...payload };
  }

  setProtectedHeader(header: Record<string, string>) {
    this._header = header;
    return this;
  }

  setIssuedAt() {
    this._payload.iat = Math.floor(Date.now() / 1000);
    return this;
  }

  setExpirationTime(exp: string) {
    const now = Math.floor(Date.now() / 1000);
    const match = exp.match(/^(\d+)(d|h|m|s)$/);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[2];
      const seconds = unit === "d" ? val * 86400
        : unit === "h" ? val * 3600
        : unit === "m" ? val * 60
        : val;
      this._payload.exp = now + seconds;
    }
    return this;
  }

  async sign(key: Uint8Array): Promise<string> {
    return sign(this._header, this._payload, key);
  }
}

export async function jwtVerify(token: string, key: Uint8Array) {
  const payload = verify(token, key) as Record<string, unknown>;
  return { payload };
}
