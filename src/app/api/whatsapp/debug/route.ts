import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { instanceName, getQRCode, getStatus, fetchAllInstances } from "@/lib/whatsapp";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const name = instanceName(tenantId);

    const [allInstances, qrData, statusData] = await Promise.allSettled([
      fetchAllInstances(),
      getQRCode(tenantId),
      getStatus(tenantId),
    ]);

    return NextResponse.json({
      instanceName: name,
      tenantId,
      allInstances: allInstances.status === "fulfilled" ? allInstances.value : String(allInstances.reason),
      qrcode: qrData.status === "fulfilled" ? qrData.value : String(qrData.reason),
      status: statusData.status === "fulfilled" ? statusData.value : String(statusData.reason),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
