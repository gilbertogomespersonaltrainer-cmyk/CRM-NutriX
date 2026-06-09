import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { wahaSessionName } from "@/lib/waha";

const WAHA_URL = (process.env.WAHA_URL || "").replace(/\/$/, "");
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";

function wahaHeaders() {
  return { "Content-Type": "application/json", "X-Api-Key": WAHA_API_KEY };
}

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const patientName = searchParams.get("name") || "";
    const doSend = searchParams.get("send") === "true";
    const session = wahaSessionName(tenantId);

    // Busca paciente pelo nome (parcial)
    const patient = patientName
      ? await prisma.patient.findFirst({
          where: { tenantId, name: { contains: patientName, mode: "insensitive" } },
          select: { id: true, name: true, phone: true },
        })
      : null;

    if (!patient) {
      const allPatients = await prisma.patient.findMany({
        where: { tenantId },
        select: { name: true, phone: true },
        orderBy: { name: "asc" },
        take: 20,
      });
      return NextResponse.json({
        error: "Paciente não encontrado. Informe ?name=NomeDoPaciente",
        hint: "Pacientes disponíveis (primeiros 20):",
        patients: allPatients,
      });
    }

    const phoneDigits = patient.phone.replace(/\D/g, "");
    const normalizedPhone = phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;
    const constructedChatId = `${normalizedPhone}@c.us`;

    // Busca chatId do inbox
    const lastInboxMsg = await prisma.inboxMessage.findFirst({
      where: { tenantId, phone: normalizedPhone, fromMe: false, chatId: { not: null } },
      orderBy: { timestamp: "desc" },
      select: { chatId: true, timestamp: true },
    });

    const chatIdToUse = lastInboxMsg?.chatId ?? constructedChatId;

    // Verifica status da sessão WAHA
    let sessionStatus: Record<string, unknown> = {};
    try {
      const sesRes = await fetch(`${WAHA_URL}/api/sessions/${session}`, {
        headers: wahaHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      sessionStatus = await sesRes.json().catch(() => ({ httpStatus: sesRes.status }));
    } catch (e) {
      sessionStatus = { error: String(e) };
    }

    // Tenta verificar se o número existe no WhatsApp (testa múltiplos endpoints WAHA)
    let wahaCheck: Record<string, unknown> = {};
    const checkPaths = [
      `/api/${session}/contacts/check-exists?chatId=${constructedChatId}`,
      `/api/contacts/check-exists`,
    ];
    for (const path of checkPaths) {
      try {
        const isPost = path.includes("contacts/check-exists") && !path.includes("?");
        const checkRes = await fetch(`${WAHA_URL}${path}`, {
          method: isPost ? "POST" : "GET",
          headers: wahaHeaders(),
          body: isPost ? JSON.stringify({ session, chatId: constructedChatId }) : undefined,
          signal: AbortSignal.timeout(5000),
        });
        const body = await checkRes.json().catch(() => ({ httpStatus: checkRes.status }));
        wahaCheck = { path, httpStatus: checkRes.status, body };
        if (checkRes.ok) break; // Achou um endpoint que funciona
      } catch (e) {
        wahaCheck = { path, error: String(e) };
      }
    }

    // Envia mensagem de teste real se ?send=true
    let sendTestResult: Record<string, unknown> = {};
    if (doSend) {
      try {
        const sendRes = await fetch(`${WAHA_URL}/api/sendText`, {
          method: "POST",
          headers: wahaHeaders(),
          body: JSON.stringify({
            session,
            chatId: chatIdToUse,
            text: "🔧 Teste técnico NutriX — pode ignorar esta mensagem.",
          }),
          signal: AbortSignal.timeout(10000),
        });
        const sendBody = await sendRes.json().catch(() => ({}));
        sendTestResult = { httpStatus: sendRes.status, ok: sendRes.ok, body: sendBody };
      } catch (e) {
        sendTestResult = { error: String(e) };
      }
    }

    // Últimas mensagens do inbox deste número
    const inboxHistory = await prisma.inboxMessage.findMany({
      where: { tenantId, phone: normalizedPhone },
      orderBy: { timestamp: "desc" },
      take: 5,
      select: { chatId: true, fromMe: true, body: true, timestamp: true },
    });

    return NextResponse.json({
      patient: { name: patient.name, phone: patient.phone },
      phoneDigits,
      normalizedPhone,
      constructedChatId,
      inboxChatId: lastInboxMsg?.chatId ?? null,
      chatIdToBeUsed: chatIdToUse,
      sessionStatus,
      wahaCheck,
      ...(doSend ? { sendTestResult } : { hint: "Adicione &send=true na URL para enviar mensagem de teste real" }),
      inboxHistory,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
