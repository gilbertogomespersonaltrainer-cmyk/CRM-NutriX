import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Vincula um contato LID/desconhecido a um paciente existente.
// Atualiza patient.whatsappChatId e redireciona as mensagens do inbox.
export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { phone, patientId } = await req.json();

    if (!phone || !patientId) {
      return NextResponse.json({ error: "phone e patientId são obrigatórios" }, { status: 400 });
    }

    // Valida que o paciente pertence ao tenant
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, name: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    // Busca o chatId real nas mensagens deste phone (pode ser @lid ou @c.us)
    const inboxMsg = await prisma.inboxMessage.findFirst({
      where: { tenantId, phone, chatId: { not: null } },
      orderBy: { timestamp: "desc" },
      select: { chatId: true },
    });

    // Atualiza o whatsappChatId do paciente para uso em envios futuros
    await prisma.patient.update({
      where: { id: patientId },
      data: { whatsappChatId: inboxMsg?.chatId ?? null },
    });

    // Redireciona todas as mensagens deste phone para o paciente correto
    await prisma.inboxMessage.updateMany({
      where: { tenantId, phone },
      data: { patientId },
    });

    return NextResponse.json({ ok: true, patientName: patient.name, chatId: inboxMsg?.chatId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
