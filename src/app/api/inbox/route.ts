import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

// Lista conversas agrupadas por telefone (última mensagem + não lidas)
export async function GET() {
  try {
    const tenantId = await getTenantId();

    const messages = await prisma.inboxMessage.findMany({
      where: { tenantId },
      orderBy: { timestamp: "desc" },
      include: {
        patient: { select: { id: true, name: true, stage: true } },
      },
    });

    // Agrupa por telefone
    const convMap = new Map<string, {
      phone: string;
      name: string | null;
      lastMessage: string;
      lastAt: Date;
      unread: number;
      patientId: string | null;
      patientName: string | null;
      patientStage: string | null;
    }>();

    for (const msg of messages) {
      if (!convMap.has(msg.phone)) {
        convMap.set(msg.phone, {
          phone: msg.phone,
          name: msg.name,
          lastMessage: msg.body,
          lastAt: msg.timestamp,
          unread: msg.read || msg.fromMe ? 0 : 1,
          patientId: msg.patientId,
          patientName: msg.patient?.name ?? null,
          patientStage: msg.patient?.stage ?? null,
        });
      } else {
        const conv = convMap.get(msg.phone)!;
        if (!msg.read && !msg.fromMe) conv.unread++;
      }
    }

    return NextResponse.json(Array.from(convMap.values()));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar conversas" }, { status: 500 });
  }
}
