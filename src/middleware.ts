import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Defense-in-depth: fast cookie presence check before page render.
// Pages and API routes enforce their own authorization; this middleware
// only catches the obvious "no session cookie at all" case.

const PROTECTED = {
  student: ["/account", "/checkout", "/learn"],
  admin: ["/admin"],
};

function isProtected(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API routes (they handle auth internally).
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const hasSessionCookie =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("session_token");

  if (!hasSessionCookie) {
    if (isProtected(pathname, PROTECTED.student) || isProtected(pathname, PROTECTED.admin)) {
      const loginUrl = new URL("/login", request.url);
      // Prefer the Referer URL when redirecting from a non-GET (e.g. form
      // POST to /checkout/start). Sending the user back to the POST path
      // after login would just 405; the page that submitted the form is
      // the right place to land.
      const isMutation = request.method !== "GET" && request.method !== "HEAD";
      const referer = request.headers.get("referer");
      let nextPath = pathname + (request.nextUrl.search || "");
      if (isMutation && referer) {
        try {
          const u = new URL(referer);
          if (u.origin === request.nextUrl.origin) {
            nextPath = u.pathname + u.search;
          }
        } catch {
          // ignore malformed referer
        }
      }
      loginUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
