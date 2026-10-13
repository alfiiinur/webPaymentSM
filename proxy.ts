import { type NextRequest, NextResponse } from "next/server";
import {
  getAdminSessionFromRequest,
  getUserSessionFromRequest,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin API routes: /api/admin/** ─────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return Response.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // ── User API routes: /api/user/** ────────────────────────────────────────────
  if (pathname.startsWith("/api/user/")) {
    const session = await getUserSessionFromRequest(request);
    if (!session) {
      return Response.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // ── Admin pages: /admin/** ────────────────────────────────────────────────
  // Login page is excluded via matcher — proxy never runs on /admin/login
  if (pathname.startsWith("/admin/") || pathname === "/admin") {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── User dashboard pages: /dashboard/** ──────────────────────────────────
  // Login page is excluded via matcher — proxy never runs on /dashboard/login
  if (pathname.startsWith("/dashboard/") || pathname === "/dashboard") {
    const session = await getUserSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL("/dashboard/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Admin pages — EXCLUDE /admin/login
    "/admin",
    "/admin/((?!login$).*)",
    // Dashboard pages — EXCLUDE /dashboard/login
    "/dashboard",
    "/dashboard/((?!login$).*)",
    // All API admin & user routes
    "/api/admin/:path*",
    "/api/user/:path*",
  ],
};
