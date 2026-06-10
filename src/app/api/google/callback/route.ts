import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

const APP_URL = (process.env.NEXTAUTH_URL || "https://crmnutrix.com.br").replace(/\/$/, "");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // tenantId
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/configuracoes?tab=agenda&error=cancelled`);
  }

  try {
    const { access_token, refresh_token } = await exchangeCodeForTokens(code);

    await prisma.tenant.update({
      where: { id: state },
      data: {
        googleCalendarEnabled: true,
        googleAccessToken: access_token,
        googleRefreshToken: refresh_token,
        googleCalendarId: "primary",
      },
    });

    return NextResponse.redirect(`${APP_URL}/configuracoes?tab=agenda&success=1`);
  } catch (err) {
    console.error("[google/callback]", err);
    return NextResponse.redirect(`${APP_URL}/configuracoes?tab=agenda&error=token`);
  }
}
