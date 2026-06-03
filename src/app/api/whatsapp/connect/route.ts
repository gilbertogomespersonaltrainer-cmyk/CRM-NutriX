import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { createInstance, getQRCode } from "@/lib/whatsapp";

export async function POST() {
  try {
    const tenantId = await getTenantId();

    const instanceResult = await createInstance(tenantId);
    console.log("[whatsapp/connect] createInstance:", JSON.stringify(instanceResult));

    const qrData = await getQRCode(tenantId);
    console.log("[whatsapp/connect] getQRCode:", JSON.stringify(qrData));

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappStatus: "CONNECTING" },
    });

    return NextResponse.json(qrData);
  } catch (err) {
    console.error("[whatsapp/connect] error:", err);
    return NextResponse.json({ error: "Erro ao conectar WhatsApp", detail: String(err) }, { status: 500 });
  }
}
