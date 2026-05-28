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
          include: { subscription: true },
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
          trialEndsAt: tenant.subscription?.trialEndsAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.clinicName = (user as { clinicName?: string }).clinicName;
        token.subscriptionStatus = (user as { subscriptionStatus?: string }).subscriptionStatus;
        token.trialEndsAt = (user as { trialEndsAt?: string | null }).trialEndsAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { clinicName?: string }).clinicName = token.clinicName as string;
        (session.user as { subscriptionStatus?: string }).subscriptionStatus = token.subscriptionStatus as string;
        (session.user as { trialEndsAt?: string | null }).trialEndsAt = token.trialEndsAt as string | null;
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
