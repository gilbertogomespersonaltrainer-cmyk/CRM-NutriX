import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const tenant = await prisma.tenant.findUnique({
          where: { email: credentials.email },
          include: { subscription: { include: { plan: true } } },
        });

        if (!tenant) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          tenant.password
        );

        if (!isValid) return null;

        return {
          id: tenant.id,
          email: tenant.email,
          name: tenant.name,
          clinicName: tenant.clinicName || undefined,
          subscriptionStatus: tenant.subscription?.status ?? "TRIAL",
          subscriptionPlan: tenant.subscription?.plan?.name ?? "Essential",
          trialEndsAt: tenant.subscription?.trialEndsAt?.toISOString() ?? null,
          expiresAt: tenant.subscription?.expiresAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Login fresh — carrega dados do banco
        token.id = user.id;
        token.clinicName = user.clinicName;
        token.subscriptionStatus = user.subscriptionStatus;
        token.subscriptionPlan = user.subscriptionPlan;
        token.trialEndsAt = user.trialEndsAt;
        token.expiresAt = user.expiresAt;
        token.lastRefreshed = Date.now();
        return token;
      }

      // Atualiza status da assinatura a cada 5 minutos
      const FIVE_MINUTES = 5 * 60 * 1000;
      const lastRefreshed = (token.lastRefreshed as number) || 0;
      if (Date.now() - lastRefreshed > FIVE_MINUTES) {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: token.id as string },
            select: { subscription: { select: { status: true, trialEndsAt: true, expiresAt: true, plan: { select: { name: true } } } } },
          });
          if (tenant?.subscription) {
            token.subscriptionStatus = tenant.subscription.status;
            token.subscriptionPlan = tenant.subscription.plan?.name ?? token.subscriptionPlan;
            token.trialEndsAt = tenant.subscription.trialEndsAt?.toISOString() ?? null;
            token.expiresAt = tenant.subscription.expiresAt?.toISOString() ?? null;
          }
        } catch {
          // Mantém dados anteriores se o banco falhar
        }
        token.lastRefreshed = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.clinicName = token.clinicName;
        session.user.subscriptionStatus = token.subscriptionStatus;
        session.user.subscriptionPlan = token.subscriptionPlan as string | undefined;
        session.user.trialEndsAt = token.trialEndsAt;
        session.user.expiresAt = token.expiresAt;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
