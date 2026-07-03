import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { clinicName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.subscription = { status };
  }

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { patients: true, appointments: true } },
    },
  });

  const safeTenants = tenants.map(({ password: _, ...rest }) => rest);
  return NextResponse.json(safeTenants);
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, email, phone, crn, clinicName, planId, trialDays } = await req.json();

    if (!name || !email || !phone || !crn) {
      return NextResponse.json({ error: "Nome, email, telefone e CRN são obrigatórios" }, { status: 400 });
    }

    const existing = await prisma.tenant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    // Senha temporária segura (12 chars: letras + números + símbolo)
    const tempPassword = crypto.randomBytes(8).toString("base64url").slice(0, 10) + "!1";
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const tenant = await prisma.tenant.create({
      data: { name, email, password: hashedPassword, crn, phone, clinicName: clinicName || null },
    });

    // Service types padrão
    await prisma.serviceType.createMany({
      data: [
        { name: "Consulta Avulsa", defaultPrice: 250, sortOrder: 0, tenantId: tenant.id },
        { name: "Plano Trimestral (3 meses)", defaultPrice: 600, sortOrder: 1, tenantId: tenant.id },
        { name: "Plano Semestral (6 meses)", defaultPrice: 1080, sortOrder: 2, tenantId: tenant.id },
        { name: "Plano Anual (12 meses)", defaultPrice: 1920, sortOrder: 3, tenantId: tenant.id },
        { name: "Grupo de Emagrecimento", defaultPrice: 150, sortOrder: 4, tenantId: tenant.id },
      ],
    });

    // Templates padrão — todos 12 tipos
    await prisma.messageTemplate.createMany({
      data: [
        { type: "CONFIRMATION", tenantId: tenant.id, content: "Oi {nome_paciente}, tudo bem? Aqui é a {nome_nutricionista} 😊 Passando pra confirmar nosso encontro dia {data_consulta} às {hora_consulta}. Pode confirmar pra mim? Qualquer coisa me avisa que a gente ajusta!" },
        { type: "REMINDER_8D", tenantId: tenant.id, content: "Olá {nome_paciente}! Passando para lembrar que sua {tipo_consulta} com {nome_nutricionista} está agendada para {data_consulta} às {hora_consulta}. Confirme sua presença respondendo esta mensagem! 😊" },
        { type: "REMINDER", tenantId: tenant.id, content: "Oi {nome_paciente}! Só passando pra te lembrar que amanhã tem a nossa consulta, às {hora_consulta} 😊 Tô preparando tudo com carinho pra gente conversar. Te espero!" },
        { type: "REMINDER_2H", tenantId: tenant.id, content: "Oi {nome_paciente}! Daqui a pouquinho a gente se encontra, hein? Às {hora_consulta} te espero 😊 Se precisar de algo antes, é só me chamar!" },
        { type: "FOLLOWUP", tenantId: tenant.id, content: "Oi {nome_paciente}, tudo bem com você? Faz um tempinho que a gente não conversa e fiquei curiosa pra saber como você tá, como tá se sentindo, se tá conseguindo manter a rotina... Me conta! 💚" },
        { type: "POST_CONSULTATION", tenantId: tenant.id, content: "Oi {nome_paciente}! Como você tá? Queria saber como foi esses primeiros dias depois da nossa conversa. Tá conseguindo encaixar as mudanças na rotina? Pode me contar sem medo, tô aqui pra te ajudar no que precisar 😊" },
        { type: "BIRTHDAY", tenantId: tenant.id, content: "Oi {nome_paciente}! Hoje é seu dia e eu não podia deixar de te desejar tudo de mais lindo! 🎂 Que esse novo ano seja cheio de saúde, conquistas e muita comida gostosa (sim, pode comer bolo! 😄). Um abraço enorme! — {nome_nutricionista} 💚" },
        { type: "REACTIVATION_30", tenantId: tenant.id, content: "Oi {nome_paciente}, tudo bem? Aqui é a {nome_nutricionista}. Faz um tempinho que a gente não se fala e eu lembrei de você! Como você tá? Tá conseguindo se cuidar? Me conta como andam as coisas 😊" },
        { type: "REACTIVATION_60", tenantId: tenant.id, content: "Oi {nome_paciente}! Tudo bem com você? Eu tava aqui organizando minha agenda e lembrei de você. Espero que esteja bem! Como tá a rotina? Tô com saudade das nossas conversas 😊 Me dá um oi quando puder!" },
        { type: "REACTIVATION_90", tenantId: tenant.id, content: "Oi {nome_paciente}, quanto tempo! Tudo bem com você? Tava pensando em você esses dias e queria muito saber como você tá. A gente construiu tanta coisa junta e eu fico torcendo pra você estar bem! Se quiser conversar, tô por aqui 💚" },
        { type: "WELCOME", tenantId: tenant.id, content: "Oi {nome_paciente}! Que bom ter você aqui 😊 Sou a {nome_nutricionista} e vou te acompanhar nessa jornada. Pode contar comigo pra qualquer dúvida, tá? Seja bem-vindo(a)! 💚" },
        { type: "PLAN_RENEWAL", tenantId: tenant.id, content: "Oi {nome_paciente}, tudo bem? Passando pra te avisar que seu plano tá chegando ao fim. Queria conversar com você sobre como foi até aqui e o que a gente pode fazer daqui pra frente. Posso te ligar ou prefere que a gente converse por aqui? 😊" },
      ],
    });

    // Assinatura
    const resolvedPlanId = planId || (await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }))?.id || "";
    const days = trialDays ?? 14;
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: resolvedPlanId,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    // Token de redefinição de senha (link de primeiro acesso)
    const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        tenantId: tenant.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://www.crmnutrix.com.br";
    const resetLink = `${baseUrl}/redefinir-senha?token=${resetToken}`;

    // E-mail de boas-vindas com credenciais
    await resend.emails.send({
      from: "NutriX <noreply@crmnutrix.com.br>",
      to: email,
      subject: "Bem-vindo(a) ao NutriX! Seus dados de acesso 🎉",
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0d0d0d; color: #e5e5e5; border-radius: 12px; overflow: hidden; border: 1px solid #1e1e1e;">
          <div style="background: #111111; padding: 32px; text-align: center; border-bottom: 1px solid #1e1e1e;">
            <span style="font-size: 32px; font-weight: 900; color: #fff; letter-spacing: -1px;">Nutri</span><span style="font-size: 32px; font-weight: 900; color: #22c55e; letter-spacing: -1px;">X</span>
          </div>
          <div style="padding: 32px;">
            <p style="color: #aaa; font-size: 15px; margin-top: 0;">Olá, <strong style="color: #fff;">${name}</strong>! 👋</p>
            <p style="color: #aaa; font-size: 15px;">Sua conta no <strong style="color: #fff;">NutriX</strong> foi criada com sucesso. Abaixo estão seus dados de acesso:</p>

            <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">E-mail</p>
              <p style="margin: 0 0 16px 0; color: #fff; font-size: 15px; font-weight: 600;">${email}</p>
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Senha temporária</p>
              <p style="margin: 0; color: #22c55e; font-size: 18px; font-weight: 700; letter-spacing: 0.05em; font-family: monospace;">${tempPassword}</p>
            </div>

            <p style="color: #aaa; font-size: 14px;">Por segurança, recomendamos que você defina uma senha própria no primeiro acesso:</p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetLink}" style="background: #22c55e; color: #000; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">
                Criar minha senha
              </a>
            </div>

            <p style="color: #aaa; font-size: 14px; margin-top: 0;">Ou acesse diretamente em: <a href="${baseUrl}/login" style="color: #22c55e;">${baseUrl}/login</a></p>

            <hr style="border: none; border-top: 1px solid #1e1e1e; margin: 24px 0;" />
            <p style="color: #555; font-size: 12px; margin: 0;">O link para criação de senha expira em <strong style="color: #777;">7 dias</strong>. Se precisar de ajuda, responda este e-mail.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ id: tenant.id, name: tenant.name, email: tenant.email }, { status: 201 });
  } catch (error) {
    console.error("[admin/tenants POST]", error);
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId } = await req.json();
  if (!tenantId) return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  await prisma.tenant.delete({ where: { id: tenantId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId, action, planId, expiresAt, trialDays } = await req.json();

  if (action === "activate") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "ACTIVE", expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
  } else if (action === "suspend") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "PAST_DUE" },
    });
  } else if (action === "cancel") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  } else if (action === "changePlan" && planId) {
    await prisma.subscription.update({
      where: { tenantId },
      data: { planId },
    });
  } else if (action === "giftSubscription" && expiresAt) {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "ACTIVE",
        startsAt: new Date(),
        expiresAt: new Date(expiresAt),
        cancelledAt: null,
      },
    });
  } else if (action === "extendTrial") {
    const days = trialDays || 7;
    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    const base = sub?.trialEndsAt && new Date(sub.trialEndsAt) > new Date()
      ? new Date(sub.trialEndsAt)
      : new Date();
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "TRIAL",
        trialEndsAt: new Date(base.getTime() + days * 24 * 60 * 60 * 1000),
      },
    });
  }

  const updated = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { patients: true, appointments: true } },
    },
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { password: _, ...safe } = updated;
  return NextResponse.json(safe);
}
