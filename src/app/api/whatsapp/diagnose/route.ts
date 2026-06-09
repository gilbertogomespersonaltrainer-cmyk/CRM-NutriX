import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { wahaSessionName } from "@/lib/waha";

const WAHA_URL = (process.env.WAHA_URL || "").replace(/\/$/, "");
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const patientName = searchParams.get("name") || "";
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

    // Verifica se o número existe no WhatsApp via WAHA
    let wahaCheck: Record<string, unknown> = {};
    try {
      const checkRes = await fetch(
        `${WAHA_URL}/api/${session}/check-number-status?phone=${normalizedPhone}`,
        { headers: { "X-Api-Key": WAHA_API_KEY }, signal: AbortSignal.timeout(5000) }
      );
      wahaCheck = await checkRes.json().catch(() => ({ status: checkRes.status }));
    } catch (e) {
      wahaCheck = { error: String(e) };
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
      chatIdToBeUsed: lastInboxMsg?.chatId ?? constructedChatId,
      wahaNumberCheck: wahaCheck,
      inboxHistory,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
