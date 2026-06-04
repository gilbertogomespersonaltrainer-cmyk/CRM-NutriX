import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappQRCode: true, whatsappStatus: true },
    });

    return NextResponse.json({
      base64: tenant?.whatsappQRCode ?? null,
      status: tenant?.whatsappStatus ?? "DISCONNECTED",
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar QR Code" }, { status: 500 });
  }
}
