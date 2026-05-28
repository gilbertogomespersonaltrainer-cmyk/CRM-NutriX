import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Rotas que não precisam de assinatura ativa
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next();
    }

    const status = token?.subscriptionStatus as string | undefined;
    const trialEndsAt = token?.trialEndsAt as string | null | undefined;

    // Verifica se o trial expirou
    const trialExpired =
      status === "TRIAL" &&
      trialEndsAt &&
      new Date(trialEndsAt) < new Date();

    const blocked =
      trialExpired ||
      status === "EXPIRED" ||
      status === "CANCELLED";

    // Se bloqueado e não está já na página de expirado, redireciona
    if (blocked && !pathname.startsWith("/plano-expirado")) {
      return NextResponse.redirect(new URL("/plano-expirado", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agendamentos/:path*",
    "/pacientes/:path*",
    "/financeiro/:path*",
    "/configuracoes/:path*",
    "/documentos/:path*",
    "/automacoes/:path*",
    "/relatorios/:path*",
    "/plano-expirado",
  ],
};
