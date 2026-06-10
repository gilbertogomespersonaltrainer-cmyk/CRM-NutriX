import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { buildGoogleOAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const url = buildGoogleOAuthUrl(tenantId);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || ""}/configuracoes?tab=agenda&error=auth`
    );
  }
}
