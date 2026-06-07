import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wahaSessionName } from "@/lib/waha";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[webhook/waha] payload:", JSON.stringify(body).slice(0, 400));

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
      const rawPhone: string = payload.from ?? payload.chatId ?? "";
      const phone = rawPhone.replace("@c.us", "").replace(/\D/g, "");
      const messageBody: string = payload.body ?? payload.text ?? "";
      const contactName: string | null = payload._data?.notifyName ?? payload.notifyName ?? null;
      const timestamp = payload.timestamp
        ? new Date(payload.timestamp * 1000)
        : new Date();

      if (phone && messageBody) {
        // Verifica se já existe um paciente com esse número
        const digits = phone.startsWith("55") ? phone : `55${phone}`;
        const existing = await prisma.patient.findFirst({
          where: {
            tenantId: tenant.id,
            phone: { contains: digits.slice(-10) },
          },
        });

        let patientId: string | null = existing?.id ?? null;

        // Se não existe e a mensagem é de fora (não enviada por mim), cria Lead
        if (!existing && !fromMe) {
          const newPatient = await prisma.patient.create({
            data: {
              tenantId: tenant.id,
              name: contactName ?? `Contato ${digits}`,
              phone: digits,
              stage: "LEAD",
              isActive: true,
            },
          });
          patientId = newPatient.id;
        }

        await prisma.inboxMessage.create({
          data: {
            tenantId: tenant.id,
            phone: digits,
            name: contactName,
            body: messageBody,
            fromMe,
            timestamp,
            patientId,
            read: fromMe, // mensagens enviadas por mim já são marcadas como lidas
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
