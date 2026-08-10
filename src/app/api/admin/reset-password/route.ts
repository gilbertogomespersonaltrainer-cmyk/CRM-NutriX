import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/admin/reset-password — solicitar link de redefinição
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Sempre retorna ok para não revelar se o e-mail existe
  if (!admin) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

  await prisma.adminResetToken.deleteMany({ where: { adminId: admin.id } });
  await prisma.adminResetToken.create({ data: { adminId: admin.id, token, expiresAt } });

  const baseUrl = process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br";
  const resetLink = `${baseUrl}/admin-login?reset=${token}`;

  await resend.emails.send({
    from: "NutriX <noreply@crmnutrix.com.br>",
    to: email,
    subject: "Redefinição de senha — Painel Admin NutriX",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0d0d0d; color: #e5e5e5; border-radius: 12px; overflow: hidden; border: 1px solid #1e1e1e;">
        <div style="background: #111111; padding: 32px; text-align: center; border-bottom: 1px solid #1e1e1e;">
          <span style="font-size: 32px; font-weight: 900; color: #fff; letter-spacing: -1px;">Nutri</span><span style="font-size: 32px; font-weight: 900; color: #22c55e; letter-spacing: -1px;">X</span>
        </div>
        <div style="padding: 32px;">
          <p style="color: #aaa; font-size: 15px; margin-top: 0;">Olá, <strong style="color: #fff;">${admin.name}</strong>!</p>
          <p style="color: #aaa; font-size: 15px;">Recebemos uma solicitação para redefinir a senha do painel administrativo.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background: #22c55e; color: #000; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">
              Redefinir senha
            </a>
          </div>
          <p style="color: #555; font-size: 13px;">Este link expira em <strong style="color: #888;">1 hora</strong>. Se você não solicitou, ignore este e-mail.</p>
          <hr style="border: none; border-top: 1px solid #1e1e1e; margin: 24px 0;" />
          <p style="color: #444; font-size: 12px; margin-bottom: 0;">Ou copie e cole no navegador:<br/>
          <span style="color: #22c55e; word-break: break-all;">${resetLink}</span></p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/reset-password — confirmar nova senha com token
export async function PATCH(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 });

  const record = await prisma.adminResetToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.adminUser.update({ where: { id: record.adminId }, data: { password: hashed } });
  await prisma.adminResetToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
