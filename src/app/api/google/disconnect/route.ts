import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { revokeGoogleAccess } from "@/lib/google-calendar";

export async function DELETE() {
  try {
    const tenantId = await getTenantId();
    await revokeGoogleAccess(tenantId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desconectar Google" }, { status: 500 });
  }
}
