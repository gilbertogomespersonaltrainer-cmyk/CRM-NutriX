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
      },
    });
    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
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
      },
    });

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
