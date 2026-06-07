import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wahaSessionName } from "@/lib/waha";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Log completo do payload para debug — remover após diagnóstico
    console.log("[webhook/waha] FULL_PAYLOAD:", JSON.stringify(body).slice(0, 1200));

    const sessionName: string = body.session ?? "";
    if (!sessionName) return NextResponse.json({ received: true });

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    const tenant = tenants.find(t => wahaSessionName(t.id) === sessionName);

    if (!tenant) {
      console.warn("[webhook/waha] tenant não encontrado para session:", sessionName);
      return NextResponse.json({ received: true });
    }

    const event: string = (body.event ?? "").toLowerCase();
    const status: string = body.payload?.status ?? "";
    console.log("[webhook/waha] event:", event, "status:", status, "tenantId:", tenant.id);

    if (event === "session.status" && status === "WORKING") {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappStatus: "CONNECTED", whatsappConnectedAt: new Date(), whatsappQRCode: null },
      });
    }

    if (event === "session.status" && (status === "STOPPED" || status === "FAILED")) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
      });
    }

    if (event === "session.status" && status === "SCAN_QR_CODE") {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappStatus: "CONNECTING", whatsappQRCode: null },
      });
    }

    // Mensagem recebida — salva no inbox e cria lead se número desconhecido
    if (event === "message") {
      const payload = body.payload ?? {};
      const fromMe: boolean = payload.fromMe ?? false;

      // rawChatId = JID original ex: "5511999999999@c.us" ou "123456789@lid"
      // Guardamos intacto para usar no envio de respostas (especialmente LIDs)
      const rawChatId: string = payload.from ?? payload.chatId ?? "";

      // Para grupos ignoramos (chatId termina em @g.us)
      if (rawChatId.endsWith("@g.us")) return NextResponse.json({ received: true });

      // phone = apenas os dígitos do número (para exibição e busca de pacientes)
      const phoneDigits = rawChatId.replace(/@\S+/g, "").replace(/\D/g, "");
      const messageBody: string = payload.body ?? payload.text ?? "";
      const contactName: string | null =
        payload._data?.notifyName ?? payload.notifyName ?? payload.pushName ?? null;
      const timestamp = payload.timestamp
        ? new Date(payload.timestamp * 1000)
        : new Date();

      if (phoneDigits && messageBody) {
        // Normaliza phone: garante prefixo 55 se tiver tamanho brasileiro (10-11 dígitos sem DDI)
        const phone = phoneDigits.length <= 11
          ? `55${phoneDigits}`
          : phoneDigits;

        // Verifica se já existe um paciente com esse número (últimos 10 dígitos)
        const existing = await prisma.patient.findFirst({
          where: {
            tenantId: tenant.id,
            phone: { contains: phone.slice(-10) },
          },
        });

        let patientId: string | null = existing?.id ?? null;

        // Se não existe e a mensagem é de fora (não enviada por mim), cria Lead
        if (!existing && !fromMe) {
          const newPatient = await prisma.patient.create({
            data: {
              tenantId: tenant.id,
              name: contactName ?? `Contato ${phone}`,
              phone,
              stage: "LEAD",
              isActive: true,
            },
          });
          patientId = newPatient.id;
        }

        await prisma.inboxMessage.create({
          data: {
            tenantId: tenant.id,
            phone,
            chatId: rawChatId, // JID original — essencial para responder corretamente
            name: contactName,
            body: messageBody,
            fromMe,
            timestamp,
            patientId,
            read: fromMe,
          },
        });
      }
    }

    // QR code gerado pelo WAHA — salva no banco para o frontend buscar
    if (event === "qr") {
      const qrPayload = body.payload?.qr ?? body.payload ?? null;
      if (qrPayload) {
        const qrBase64 = typeof qrPayload === "string"
          ? (qrPayload.startsWith("data:") ? qrPayload : `data:image/png;base64,${qrPayload}`)
          : null;
        if (qrBase64) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { whatsappQRCode: qrBase64, whatsappStatus: "CONNECTING" },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/waha] erro:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
