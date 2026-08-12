import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ezmacro-token";

/**
 * Protección de rutas a nivel de request (corre en Edge).
 *
 * Sin esto, /dashboard y /log renderizaban sin sesión: la PWA (start_url
 * /dashboard) dejaba a un usuario deslogueado atrapado en un skeleton eterno
 * sin barra de URL, y el shortcut "Registrar" permitía componer una comida
 * completa que moría con 401 al guardar.
 */
async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authenticated = await hasValidSession(req);

  // Usuario ya logueado en /auth → directo al dashboard
  if (pathname.startsWith("/auth")) {
    if (authenticated) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Rutas de la app: requieren sesión
  if (!authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth",
    "/dashboard/:path*",
    "/log/:path*",
    "/weight/:path*",
    "/analytics/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/shakes/:path*",
    "/recommendations/:path*",
    "/onboarding/:path*",
  ],
};
