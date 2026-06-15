import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      todayAppointments,
      activePatients,
      inactivePatients,
      monthRevenue,
      monthAppointments,
      tenant,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId,
          scheduledAt: { gte: startOfDay, lt: endOfDay },
          status: "SCHEDULED",
        },
        include: { patient: { select: { name: true, phone: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.patient.count({ where: { tenantId, isActive: true, stage: { not: "LEAD" } } }),
      prisma.patient.count({ where: { tenantId, isActive: false, stage: { not: "LEAD" } } }),
      prisma.payment.aggregate({
        where: {
          tenantId,
          status: "PAID",
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
        _sum: { finalAmount: true },
      }),
      prisma.appointment.count({
        where: {
          tenantId,
          status: "COMPLETED",
          scheduledAt: { gte: startOfMonth, lt: endOfMonth },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { whatsappStatus: true },
      }),
    ]);

    return NextResponse.json({
      todayAppointments,
      activePatients,
      inactivePatients,
      monthRevenue: monthRevenue._sum.finalAmount || 0,
      monthAppointments,
      whatsappStatus: tenant?.whatsappStatus || "DISCONNECTED",
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}
