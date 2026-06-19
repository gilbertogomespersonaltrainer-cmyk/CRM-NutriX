import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";
import { wahaGetContactPhone } from "@/lib/waha";

// Retorna true se o valor parece ser um LID (>13 dígitos numéricos)
function isLid(phone: string): boolean {
  return phone.replace(/\D/g, "").length > 13;
}

// POST /api/inbox/fix-lid-contacts
// Busca todos os pacientes/mensagens com telefone LID e tenta resolver o número real via WAHA.
export async function POST() {
  try {
    const tenantId = await getTenantId();

    // Todos os pacientes desse tenant com telefone que parece LID
    const patients = await prisma.patient.findMany({
      where: { tenantId },
      select: { id: true, phone: true, whatsappChatId: true, name: true },
    });

    const lidPatients = patients.filter(p => isLid(p.phone));

    let fixed = 0;
    let failed = 0;

    for (const patient of lidPatients) {
      // Precisa ter o whatsappChatId (@lid) para conseguir resolver
      const chatId = patient.whatsappChatId;
      if (!chatId) { failed++; continue; }

      const realDigits = await wahaGetContactPhone(tenantId, chatId);
      if (!realDigits) { failed++; continue; }

      const realPhone = realDigits.length <= 11 ? `55${realDigits}` : realDigits;

      // Verifica se já existe outro paciente com esse telefone real
      const duplicate = await prisma.patient.findFirst({
        where: {
          tenantId,
          phone: { contains: realDigits.slice(-10) },
          id: { not: patient.id },
        },
      });

      if (duplicate) {
        // Redireciona as mensagens do LID para o paciente real e remove o duplicado
        await prisma.inboxMessage.updateMany({
          where: { tenantId, patientId: patient.id },
          data: { patientId: duplicate.id, phone: duplicate.phone },
        });
        await prisma.patient.update({
          where: { id: duplicate.id },
          data: { whatsappChatId: chatId },
        });
        await prisma.patient.delete({ where: { id: patient.id } });
      } else {
        // Atualiza o telefone do paciente para o número real
        // Atualiza também o nome se ainda está no formato "Contato {LID}"
        const nameUpdate = patient.name.startsWith("Contato ") && isLid(patient.name.replace("Contato ", ""))
          ? { name: `Contato ${realPhone}` }
          : {};
        await prisma.patient.update({
          where: { id: patient.id },
          data: { phone: realPhone, ...nameUpdate },
        });
        // Atualiza o phone nas mensagens do inbox desse paciente
        await prisma.inboxMessage.updateMany({
          where: { tenantId, phone: patient.phone },
          data: { phone: realPhone },
        });
      }

      fixed++;
    }

    return NextResponse.json({
      total: lidPatients.length,
      fixed,
      failed,
      message: `${fixed} contato(s) corrigido(s), ${failed} não resolvido(s) (sem chatId ou WAHA não retornou número).`,
    });
  } catch (err) {
    console.error("[fix-lid-contacts]", err);
    return NextResponse.json({ error: "Erro ao corrigir contatos LID" }, { status: 500 });
  }
}
