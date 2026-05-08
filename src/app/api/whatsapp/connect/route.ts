import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, getQRCode } from "@/lib/whatsapp";

export async function POST() {
  try {
    const tenantId = await getTenantId();

    await createInstance(tenantId);
    const qrData = await getQRCode(tenantId);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING" },
    });

    return NextResponse.json(qrData);
  } catch {
    return NextResponse.json({ error: "Erro ao conectar WhatsApp" }, { status: 500 });
  }
}
