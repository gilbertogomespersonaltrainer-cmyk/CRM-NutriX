import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { wahaGetStatus, wahaSessionName } from "@/lib/waha";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const sessionName = wahaSessionName(tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappStatus: true, whatsappConnectedAt: true },
    });

    const wahaStatus = await wahaGetStatus(tenantId);

    return NextResponse.json({
      tenantId,
      sessionName,
      dbStatus: tenant?.whatsappStatus,
      wahaStatus,
      waha_url: process.env.WAHA_URL,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
