import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Expira trials vencidos
  const expiredTrials = await prisma.subscription.updateMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // Expira assinaturas ACTIVE com expiresAt vencido
  const expiredActive = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now },
      NOT: { expiresAt: null },
    },
    data: { status: "EXPIRED" },
  });

  console.log(`[expire-trials] ${expiredTrials.count} trial(s) expirado(s), ${expiredActive.count} assinatura(s) ACTIVE expirada(s)`);

  return NextResponse.json({ expiredTrials: expiredTrials.count, expiredActive: expiredActive.count });
}
