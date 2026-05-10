import { NextRequest, NextResponse } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/pipeline",
  "/pacientes",
  "/inativos",
  "/agendamentos",
  "/financeiro",
  "/configuracoes",
  "/api/patients",
  "/api/appointments",
  "/api/payments",
  "/api/installments",
  "/api/transactions",
  "/api/service-types",
  "/api/dashboard",
  "/api/follow-up",
  "/api/templates",
  "/api/whatsapp",
];

const adminProtectedPaths = [
  "/admin/dashboard",
  "/admin/assinantes",
  "/admin/planos",
  "/api/admin/dashboard",
  "/api/admin/tenants",
  "/api/admin/plans",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes — protected by admin-token cookie
  const isAdminProtected = adminProtectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isAdminProtected) {
    const adminToken = request.cookies.get("admin-token")?.value;
    if (!adminToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
    return NextResponse.next();
  }

  // Tenant routes — protected by next-auth session
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!isProtected) return NextResponse.next();

  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
