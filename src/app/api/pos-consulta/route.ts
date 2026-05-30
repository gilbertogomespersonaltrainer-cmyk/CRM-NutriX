import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.id },
    select: {
      postConsultEnabled: true,
      postConsultDayOfWeek: true,
      postConsultDaysAfter: true,
    },
  });

  const template = await prisma.messageTemplate.findUnique({
    where: { tenantId_type: { tenantId: session.user.id, type: "POST_CONSULTATION" } },
  });

  return NextResponse.json({
    enabled: tenant?.postConsultEnabled ?? false,
    dayOfWeek: tenant?.postConsultDayOfWeek ?? 1,
    daysAfter: tenant?.postConsultDaysAfter ?? 3,
    message: template?.content ?? "Olá {nome_paciente}! Passando para saber como você está se sentindo após nossa consulta. Está conseguindo seguir as orientações? Qualquer dúvida, pode me chamar! 😊",
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enabled, dayOfWeek, daysAfter, message } = await req.json();

  await prisma.tenant.update({
    where: { id: session.user.id },
    data: {
      ...(enabled !== undefined && { postConsultEnabled: enabled }),
      ...(dayOfWeek !== undefined && { postConsultDayOfWeek: dayOfWeek }),
      ...(daysAfter !== undefined && { postConsultDaysAfter: daysAfter }),
    },
  });

  if (message !== undefined) {
    await prisma.messageTemplate.upsert({
      where: { tenantId_type: { tenantId: session.user.id, type: "POST_CONSULTATION" } },
      update: { content: message },
      create: { tenantId: session.user.id, type: "POST_CONSULTATION", content: message },
    });
  }

  return NextResponse.json({ ok: true });
}
