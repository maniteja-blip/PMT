import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = new Set(["/login"]);

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api");
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get("pmt_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const key = secretKey();
  if (!key) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.set("pmt_session", "", { path: "/", maxAge: 0 });
    return res;
  }

  // Verify signature and expiry; block junk cookies.
  return jwtVerify(token, key)
    .then(() => NextResponse.next())
    .catch(() => {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      const res = NextResponse.redirect(url);
      res.cookies.set("pmt_session", "", { path: "/", maxAge: 0 });
      return res;
    });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
