import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Marca como EXPIRED todos os trials cujo prazo já passou
  const result = await prisma.subscription.updateMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  console.log(`[expire-trials] ${result.count} trial(s) expirado(s)`);

  return NextResponse.json({ expired: result.count });
}
