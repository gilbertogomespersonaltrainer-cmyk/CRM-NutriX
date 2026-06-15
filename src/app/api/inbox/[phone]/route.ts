import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { wahaSendText } from "@/lib/waha";

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

// POST: envia mensagem para o contato
export async function POST(req: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const tenantId = await getTenantId();
    const { phone } = await params;
    const { body } = await req.json();

    if (!body?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    // Busca o chatId original da conversa (JID do WAHA) para garantir entrega correta
    // Especialmente importante para contas com LID (Linked ID) em vez de número padrão
    const lastMsg = await prisma.inboxMessage.findFirst({
      where: { tenantId, phone, fromMe: false, chatId: { not: null } },
      orderBy: { timestamp: "desc" },
      select: { chatId: true },
    });

    const chatId = lastMsg?.chatId ?? null;

    // Envia via WAHA usando chatId original se disponível, senão usa phone
    await wahaSendText(tenantId, phone, body.trim(), chatId ?? undefined);

    // Salva no inbox
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

    return NextResponse.json(msg);
  } catch (err) {
    console.error("[inbox/send] erro:", err);
    return NextResponse.json({ error: "Erro ao enviar mensagem. Verifique se o WhatsApp está conectado." }, { status: 500 });
  }
}
