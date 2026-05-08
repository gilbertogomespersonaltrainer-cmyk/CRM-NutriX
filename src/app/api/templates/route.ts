import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const templates = await prisma.messageTemplate.findMany({
      where: { tenantId },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar templates" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await req.json();

    const template = await prisma.messageTemplate.upsert({
      where: {
        tenantId_type: { tenantId, type: body.type },
      },
      update: { content: body.content },
      create: {
        tenantId,
        type: body.type,
        content: body.content,
      },
    });

    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar template" }, { status: 500 });
  }
}
