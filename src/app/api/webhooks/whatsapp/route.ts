import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evoInstanceName, evoGetContactPhone } from "@/lib/evolution";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[webhook/evo] FULL_PAYLOAD:", JSON.stringify(body).slice(0, 1200));

    // Evolution envia: { event: "...", instance: "...", data: {...} }
    const event: string = (body.event ?? "").toLowerCase();
    const instanceName: string = body.instance ?? "";

    if (!instanceName) return NextResponse.json({ received: true });

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    const tenant = tenants.find(t => evoInstanceName(t.id) === instanceName);

    if (!tenant) {
      console.warn("[webhook/evo] tenant não encontrado para instance:", instanceName);
      return NextResponse.json({ received: true });
    }

    console.log("[webhook/evo] event:", event, "tenantId:", tenant.id);

    // ── Conexão ──────────────────────────────────────────────────────────────
    if (event === "connection.update") {
      const state: string = body.data?.state ?? "";
      if (state === "open") {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappStatus: "CONNECTED", whatsappConnectedAt: new Date(), whatsappQRCode: null },
        });
      } else if (state === "close" || state === "refused") {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappStatus: "DISCONNECTED", whatsappQRCode: null },
        });
      } else if (state === "connecting") {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappStatus: "CONNECTING" },
        });
      }
    }

    // ── QR Code ──────────────────────────────────────────────────────────────
    if (event === "qrcode.updated") {
      const qr: string = body.data?.qrcode?.base64 ?? body.data?.base64 ?? "";
      if (qr) {
        const qrBase64 = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappQRCode: qrBase64, whatsappStatus: "CONNECTING" },
        });
      }
    }

    // ── Mensagens ─────────────────────────────────────────────────────────────
    if (event === "messages.upsert") {
      const messages = Array.isArray(body.data) ? body.data : [body.data];

      for (const msg of messages) {
        if (!msg) continue;

        const fromMe: boolean = msg.key?.fromMe ?? false;

        // JID original — ex: "5511999999999@s.whatsapp.net" ou "228573998764186@lid"
        const rawChatId: string = msg.key?.remoteJid ?? "";

        // Ignora grupos
        if (rawChatId.endsWith("@g.us")) continue;

        // Dígitos do JID
        const phoneDigits = rawChatId.replace(/@\S+/g, "").replace(/\D/g, "");

        const messageBody: string =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          msg.message?.videoMessage?.caption ??
          "";

        // pushName em mensagens enviadas (fromMe) é o nome do próprio remetente — ignorar
        const contactName: string | null = fromMe
          ? null
          : (msg.pushName ?? msg.notifyName ?? null);

        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000)
          : new Date();

        if (!phoneDigits || !messageBody) continue;

        const phone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;

        // Busca paciente pelo número ou pelo chatId salvo
        let existing = await prisma.patient.findFirst({
          where: { tenantId: tenant.id, phone: { contains: phone.slice(-10) } },
        });

        if (!existing && rawChatId) {
          existing = await prisma.patient.findFirst({
            where: { tenantId: tenant.id, whatsappChatId: rawChatId },
          });
        }

        if (existing && !fromMe && rawChatId) {
          await prisma.patient.update({
            where: { id: existing.id },
            data: { whatsappChatId: rawChatId },
          });
        }

        let patientId: string | null = existing?.id ?? null;
        let resolvedPhone = existing?.phone ?? phone;

        // Para LIDs não identificados: resolve o telefone real via Evolution API
        if (!existing && rawChatId.endsWith("@lid")) {
          try {
            const realDigits = await evoGetContactPhone(tenant.id, rawChatId);
            if (realDigits) {
              const realPhone = realDigits.length <= 11 ? `55${realDigits}` : realDigits;
              const byRealPhone = await prisma.patient.findFirst({
                where: { tenantId: tenant.id, phone: { contains: realDigits.slice(-10) } },
              });
              if (byRealPhone) {
                existing = byRealPhone;
                patientId = byRealPhone.id;
                resolvedPhone = byRealPhone.phone;
                await prisma.patient.update({
                  where: { id: byRealPhone.id },
                  data: { whatsappChatId: rawChatId },
                });
              } else {
                resolvedPhone = realPhone;
              }
            }
          } catch { /* não-bloqueante */ }
        }

        // Cria Lead se mensagem externa e contato desconhecido
        if (!existing && !fromMe) {
          const newPatient = await prisma.patient.create({
            data: {
              tenantId: tenant.id,
              name: contactName ?? `Contato ${resolvedPhone}`,
              phone: resolvedPhone,
              whatsappChatId: rawChatId,
              stage: "LEAD",
              isActive: true,
            },
          });
          patientId = newPatient.id;
        }

        await prisma.inboxMessage.create({
          data: {
            tenantId: tenant.id,
            phone: resolvedPhone,
            chatId: rawChatId,
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

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/evo] erro:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
