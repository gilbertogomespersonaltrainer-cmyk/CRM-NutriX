import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { evoSendText } from "@/lib/evolution";

// GET: busca mensagens de uma conversa e marca como lidas
export async function GET(req: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const tenantId = await getTenantId();
    const { phone } = await params;

    const messages = await prisma.inboxMessage.findMany({
      where: { tenantId, phone },
      orderBy: { timestamp: "asc" },
    });

    // Marca todas como lidas
    await prisma.inboxMessage.updateMany({
      where: { tenantId, phone, read: false, fromMe: false },
      data: { read: true },
    });

    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
  }
}

// DELETE: apaga todas as mensagens da conversa
export async function DELETE(req: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const tenantId = await getTenantId();
    const { phone } = await params;

    await prisma.inboxMessage.deleteMany({ where: { tenantId, phone } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao apagar conversa" }, { status: 500 });
  }
}

// POST: envia mensagem para o contato
export async function POST(req: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const tenantId = await getTenantId();
    const { phone } = await params;
    const { body } = await req.json();

    if (!body?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    // Busca o chatId original da conversa para garantir entrega correta (LID)
    const lastMsg = await prisma.inboxMessage.findFirst({
      where: { tenantId, phone, fromMe: false, chatId: { not: null } },
      orderBy: { timestamp: "desc" },
      select: { chatId: true },
    });

    const chatId = lastMsg?.chatId ?? null;

    // Salva no inbox primeiro — mensagem aparece na tela independente do resultado da Evolution
    const msg = await prisma.inboxMessage.create({
      data: {
        tenantId,
        phone,
        chatId: chatId ?? undefined,
        body: body.trim(),
        fromMe: true,
        timestamp: new Date(),
        read: true,
      },
    });

    // Envia via Evolution API (não-bloqueante para a resposta ao cliente)
    try {
      await evoSendText(tenantId, phone, body.trim(), chatId ?? undefined);
    } catch (evoErr) {
      console.error("[inbox/send] Evolution API falhou:", evoErr);
      // Retorna a mensagem salva mas com flag de erro para o cliente mostrar aviso
      return NextResponse.json({ ...msg, sendError: true });
    }

    return NextResponse.json(msg);
  } catch (err) {
    console.error("[inbox/send] erro:", err);
    return NextResponse.json({ error: "Erro ao enviar mensagem. Verifique se o WhatsApp está conectado." }, { status: 500 });
  }
}
