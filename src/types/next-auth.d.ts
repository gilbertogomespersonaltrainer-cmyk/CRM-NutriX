import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      clinicName?: string;
      subscriptionStatus?: string;
      trialEndsAt?: string | null;
    };
  }

  interface User {
    id: string;
    clinicName?: string;
    subscriptionStatus?: string;
    trialEndsAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    clinicName?: string;
    subscriptionStatus?: string;
    trialEndsAt?: string | null;
  }
}
