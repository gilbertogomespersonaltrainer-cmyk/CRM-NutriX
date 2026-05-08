import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pacientes/:path*",
    "/inativos/:path*",
    "/agendamentos/:path*",
    "/financeiro/:path*",
    "/configuracoes/:path*",
    "/api/patients/:path*",
    "/api/appointments/:path*",
    "/api/payments/:path*",
    "/api/installments/:path*",
    "/api/transactions/:path*",
    "/api/service-types/:path*",
    "/api/dashboard/:path*",
    "/api/follow-up/:path*",
    "/api/templates/:path*",
    "/api/whatsapp/:path*",
  ],
};
