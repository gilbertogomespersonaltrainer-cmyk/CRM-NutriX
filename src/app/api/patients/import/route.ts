import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/session";

function parseBirthDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  // DD/MM/YYYY
  const ddmm = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) {
    const d = new Date(`${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD-MM-YYYY
  const ddmm2 = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmm2) {
    const d = new Date(`${ddmm2[3]}-${ddmm2[2].padStart(2, "0")}-${ddmm2[1].padStart(2, "0")}`);
    return isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export type ImportRow = {
  name: string;
  phone: string;
  cpf?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  howFoundUs?: string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    const { rows } = (await req.json()) as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar" }, { status: 400 });
    }

    // Fetch all existing phones for this tenant (for dedup)
    const existingPatients = await prisma.patient.findMany({
      where: { tenantId },
      select: { phone: true },
    });
    const existingPhones = new Set(
      existingPatients.map((p) => p.phone.replace(/\D/g, ""))
    );

    let imported = 0;
    let skipped = 0;
    const errorDetails: string[] = [];

    for (const row of rows) {
      const name = row.name?.trim();
      const phone = row.phone?.trim();

      if (!name || !phone) {
        errorDetails.push(`Ignorado: nome ou telefone em branco`);
        continue;
      }

      const phoneDigits = phone.replace(/\D/g, "");

      if (existingPhones.has(phoneDigits)) {
        skipped++;
        continue;
      }

      try {
        await prisma.patient.create({
          data: {
            tenantId,
            name,
            phone,
            cpf: row.cpf?.trim() || null,
            email: row.email?.trim() || null,
            address: row.address?.trim() || null,
            howFoundUs: row.howFoundUs?.trim() || null,
            notes: row.notes?.trim() || null,
            birthDate: parseBirthDate(row.birthDate),
            stage: "ACTIVE",
            isActive: true,
          },
        });
        existingPhones.add(phoneDigits);
        imported++;
      } catch {
        errorDetails.push(`Erro ao importar "${name}"`);
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errorDetails.length,
      details: errorDetails.slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao importar pacientes" }, { status: 500 });
  }
}
