import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ezmacro-secret-key-change-in-production-2024"
);

const ALG = "HS256";
const COOKIE_NAME = "ezmacro-token";

export async function createToken(userId: string, rememberMe: boolean = false): Promise<string> {
  const jwt = new SignJWT({ userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt();
  
  // If remember me, set expiration to 1 year, otherwise 30 days
  if (rememberMe) {
    jwt.setExpirationTime("365d");
  } else {
    jwt.setExpirationTime("30d");
  }
  
  return jwt.sign(SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function tokenCookieOptions(token: string, rememberMe: boolean = false) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 30; // 365 days if remember me, otherwise 30 days
  
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000), // Explicit expiration date
  };
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
