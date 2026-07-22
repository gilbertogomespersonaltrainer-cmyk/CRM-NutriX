import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, email, password } = await req.json();

  const data: Record<string, string> = {};
  if (name?.trim()) data.name = name.trim();
  if (email?.trim()) data.email = email.trim().toLowerCase();
  if (password?.trim()) data.password = await bcrypt.hash(password.trim(), 10);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nenhum campo informado" }, { status: 400 });
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: "Não é possível excluir o próprio usuário" }, { status: 400 });
  }

  const count = await prisma.adminUser.count();
  if (count <= 1) {
    return NextResponse.json({ error: "Deve existir pelo menos um admin" }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
