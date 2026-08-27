import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "financial";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate + "T23:59:59") : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    if (type === "financial") {
      const payments = await prisma.payment.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end } },
        include: {
          patient: { select: { name: true } },
          serviceType: { select: { name: true } },
          installments: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalReceita = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.finalAmount, 0);
      const totalPendente = payments.filter(p => p.status !== "PAID").reduce((s, p) => s + p.finalAmount, 0);
      const totalDesconto = payments.reduce((s, p) => s + p.discountAmount, 0);

      const byServiceType: Record<string, number> = {};
      payments.filter(p => p.status === "PAID").forEach(p => {
        const name = p.serviceType.name;
        byServiceType[name] = (byServiceType[name] || 0) + p.finalAmount;
      });

      const paymentMethodLabels: Record<string, string> = {
        PIX: "Pix",
        CREDIT_CARD: "Cartão de crédito",
        DEBIT_CARD: "Cartão de débito",
        CASH: "Dinheiro",
        TRANSFER: "Transferência",
      };
      const byMethod: Record<string, number> = {};
      payments.filter(p => p.status === "PAID").forEach(p => {
        const label = paymentMethodLabels[p.paymentMethod] || p.paymentMethod;
        byMethod[label] = (byMethod[label] || 0) + p.finalAmount;
      });

      return NextResponse.json({
        summary: { totalReceita, totalPendente, totalDesconto, totalPagamentos: payments.length },
        byServiceType,
        byMethod,
        rows: payments.map(p => ({
          id: p.id,
          paciente: p.patient.name,
          servico: p.serviceType.name,
          descricao: p.description || "",
          valorTotal: p.totalAmount,
          desconto: p.discountAmount,
          valorFinal: p.finalAmount,
          modalidade: p.modality,
          formaPagamento: p.paymentMethod,
          parcelas: p.installmentCount,
          status: p.status,
          data: p.createdAt,
        })),
      });
    }

    if (type === "defaulters") {
      const installments = await prisma.installment.findMany({
        where: {
          tenantId,
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { lte: new Date() },
        },
        include: {
          payment: {
            include: {
              patient: { select: { name: true, phone: true } },
              serviceType: { select: { name: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      const totalEmAberto = installments.reduce((s, i) => s + i.amount, 0);
      const uniquePatients = new Set(installments.map(i => i.payment.patientId)).size;

      return NextResponse.json({
        summary: { totalEmAberto, totalParcelas: installments.length, totalPacientes: uniquePatients },
        rows: installments.map(i => ({
          id: i.id,
          paciente: i.payment.patient.name,
          telefone: i.payment.patient.phone,
          servico: i.payment.serviceType.name,
          parcela: `${i.installmentNumber}/${i.payment.installmentCount}`,
          valor: i.amount,
          vencimento: i.dueDate,
          diasAtraso: Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
          status: i.status,
        })),
      });
    }

    if (type === "appointments") {
      const appointments = await prisma.appointment.findMany({
        where: { tenantId, scheduledAt: { gte: start, lte: end } },
        include: { patient: { select: { name: true, phone: true } } },
        orderBy: { scheduledAt: "desc" },
      });

      const byStatus: Record<string, number> = {};
      appointments.forEach(a => {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      });

      const statusLabels: Record<string, string> = {
        SCHEDULED: "Agendada",
        COMPLETED: "Realizada",
        CANCELLED: "Cancelada",
        NO_SHOW: "Faltou",
      };

      return NextResponse.json({
        summary: {
          total: appointments.length,
          realizadas: byStatus["COMPLETED"] || 0,
          canceladas: byStatus["CANCELLED"] || 0,
          faltou: byStatus["NO_SHOW"] || 0,
          agendadas: byStatus["SCHEDULED"] || 0,
          taxaComparecimento: appointments.length > 0
            ? Math.round(((byStatus["COMPLETED"] || 0) / appointments.filter(a => a.status !== "SCHEDULED").length) * 100) || 0
            : 0,
        },
        byStatus,
        rows: appointments.map(a => ({
          id: a.id,
          paciente: a.patient.name,
          telefone: a.patient.phone,
          data: a.scheduledAt,
          duracao: a.duration,
          tipo: a.consultationType || "Consulta",
          status: statusLabels[a.status] || a.status,
          observacoes: a.notes || "",
        })),
      });
    }

    if (type === "patients") {
      // Leads não são pacientes — não devem ser contabilizados em nenhuma métrica desta seção
      const patients = await prisma.patient.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end }, stage: { not: "LEAD" } },
        include: {
          _count: { select: { appointments: true, payments: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const allActive = await prisma.patient.count({ where: { tenantId, isActive: true, stage: { not: "LEAD" } } });
      const allInactive = await prisma.patient.count({ where: { tenantId, isActive: false, stage: { not: "LEAD" } } });

      const byOrigin: Record<string, number> = {};
      patients.forEach(p => {
        const origin = p.howFoundUs || "Não informado";
        byOrigin[origin] = (byOrigin[origin] || 0) + 1;
      });

      return NextResponse.json({
        summary: {
          novosNoPeriodo: patients.length,
          totalAtivos: allActive,
          totalInativos: allInactive,
          total: allActive + allInactive,
        },
        byOrigin,
        rows: patients.map(p => ({
          id: p.id,
          nome: p.name,
          telefone: p.phone,
          email: p.email || "",
          cpf: p.cpf || "",
          dataNascimento: p.birthDate || null,
          origem: p.howFoundUs || "Não informado",
          status: p.isActive ? "Ativo" : "Inativo",
          consultas: p._count.appointments,
          pagamentos: p._count.payments,
          cadastradoEm: p.createdAt,
        })),
      });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
