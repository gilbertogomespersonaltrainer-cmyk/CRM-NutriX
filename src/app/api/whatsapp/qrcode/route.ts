import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { getQRCode } from "@/lib/whatsapp";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const qrData = await getQRCode(tenantId);
    return NextResponse.json(qrData);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar QR Code" }, { status: 500 });
  }
}
