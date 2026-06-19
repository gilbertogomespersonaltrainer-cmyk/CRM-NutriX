import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        crn: true,
        phone: true,
        clinicName: true,
        inactiveDaysThreshold: true,
        defaultDuration: true,
        workingHours: true,
        whatsappStatus: true,
        appointmentTypes: true,
        zapiInstanceId: true,
        zapiClientToken: true,
        googleCalendarEnabled: true,
        googleCalendarId: true,
        googleRefreshToken: true, // só para verificar se está conectado (não exposto raw)
      },
    });
    // Expõe apenas se está conectado (não expõe o token em si)
    // googleCalendarError: tinha token mas googleCalendarEnabled foi desativado por falha de renovação
    const result = {
      ...tenant,
      googleCalendarConnected: !!(tenant?.googleRefreshToken && tenant?.googleCalendarEnabled),
      googleCalendarError: !!(tenant?.googleRefreshToken && !tenant?.googleCalendarEnabled),
      googleRefreshToken: undefined, // nunca expõe o token ao frontend
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

// PATCH — salva credenciais Zapi
export async function PATCH(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.zapiInstanceId !== undefined) data.zapiInstanceId = body.zapiInstanceId;
    if (body.zapiClientToken !== undefined) data.zapiClientToken = body.zapiClientToken;
    await prisma.tenant.update({ where: { id: tenantId }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar credenciais Zapi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.clinicName !== undefined) data.clinicName = body.clinicName;
    if (body.crn !== undefined) data.crn = body.crn;
    if (body.inactiveDaysThreshold !== undefined)
      data.inactiveDaysThreshold = body.inactiveDaysThreshold;
    if (body.defaultDuration !== undefined)
      data.defaultDuration = body.defaultDuration;
    if (body.workingHours !== undefined)
      data.workingHours = body.workingHours;
    if (body.appointmentTypes !== undefined)
      data.appointmentTypes = body.appointmentTypes;
    if (body.password) {
      data.password = await bcrypt.hash(body.password, 12);
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        crn: true,
        phone: true,
        clinicName: true,
        inactiveDaysThreshold: true,
        defaultDuration: true,
        workingHours: true,
        appointmentTypes: true,
      },
    });

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
