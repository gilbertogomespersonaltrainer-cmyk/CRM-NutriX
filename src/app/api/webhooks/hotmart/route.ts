import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Mapeamento: código da oferta Hotmart → nome do plano NutriX
const OFFER_PLAN_MAP: Record<string, string> = {
  "8b1ck2sq": "Essential",
  "6rficksd": "Professional",
};

// Eventos que significam compra aprovada/renovada
const APPROVED_EVENTS = new Set([
  "PURCHASE_APPROVED",        // Compra aprovada
  "PURCHASE_COMPLETE",        // Compra concluída
  "SUBSCRIPTION_REACTIVATED", // Assinatura reativada
]);

// Eventos que significam cancelamento/reembolso
const CANCEL_EVENTS = new Set([
  "PURCHASE_CANCELLED",       // Compra cancelada
  "PURCHASE_REFUNDED",        // Reembolso solicitado
  "PURCHASE_CHARGEBACK",      // Chargeback (contestação)
  "PURCHASE_PROTEST",         // Compra protestada
  "SUBSCRIPTION_CANCELLATION", // Cancelamento de assinatura
]);

function verifyHottok(req: Request): boolean {
  // Hotmart envia o hottok como query param ou header
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("hottok");
  const headerToken = req.headers.get("x-hotmart-hottok");
  const secret = process.env.HOTMART_HOTTOK;
  if (!secret) return false;
  return queryToken === secret || headerToken === secret;
}

export async function POST(req: Request) {
  if (!verifyHottok(req)) {
    console.warn("[hotmart-webhook] Unauthorized attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = (body.event as string) || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (body.data as any) || {};

  const buyerEmail = (data?.buyer?.email as string)?.toLowerCase()?.trim();
  const buyerName = (data?.buyer?.name as string) || "";
  const offerCode = (data?.offer?.code as string) || "";
  const transactionId = (data?.purchase?.transaction as string) || undefined;

  if (!buyerEmail) {
    return NextResponse.json({ error: "No buyer email" }, { status: 400 });
  }

  const planName = OFFER_PLAN_MAP[offerCode] || "Essential";

  console.log(`[hotmart-webhook] event=${event} email=${buyerEmail} plan=${planName}`);

  // -----------------------------------------------
  // COMPRA APROVADA / RENOVAÇÃO
  // -----------------------------------------------
  if (APPROVED_EVENTS.has(event)) {
    const plan = await prisma.plan.findFirst({
      where: { name: { equals: planName, mode: "insensitive" }, isActive: true },
    });

    const tenant = await prisma.tenant.findFirst({
      where: { email: { equals: buyerEmail, mode: "insensitive" } },
      include: { subscription: true },
    });

    if (tenant) {
      // Usuário já cadastrado → ativa/renova assinatura
      const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000); // 35 dias (5 dias de buffer)

      await prisma.subscription.update({
        where: { tenantId: tenant.id },
        data: {
          status: "ACTIVE",
          ...(plan ? { planId: plan.id } : {}),
          startsAt: new Date(),
          expiresAt,
          cancelledAt: null,
        },
      });

      console.log(`[hotmart-webhook] Assinatura ativada: tenant=${tenant.id}`);

      // Registra a compra como ativada
      await prisma.hotmartPurchase.create({
        data: {
          email: buyerEmail,
          planName,
          offerCode: offerCode || null,
          transactionId: transactionId || null,
          event,
          activatedAt: new Date(),
        },
      }).catch(() => {}); // ignora duplicatas por transactionId

      // Envia e-mail de boas-vindas/renovação
      try {
        await resend.emails.send({
          from: "NutriX <noreply@crmnutrix.com.br>",
          to: buyerEmail,
          subject: "✅ Assinatura NutriX ativada com sucesso!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #080808; color: #fff; padding: 32px; border-radius: 12px;">
              <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 8px;">Tudo certo! 🎉</h1>
              <p style="color: #a1a1a1; font-size: 16px;">
                Olá, ${tenant.name}! Sua assinatura <strong style="color: #fff;">${planName}</strong> foi ativada com sucesso.
              </p>
              <p style="color: #a1a1a1; font-size: 15px;">
                Você já pode acessar o NutriX normalmente. Qualquer dúvida, estamos à disposição.
              </p>
              <a href="${process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br"}/dashboard"
                style="display: inline-block; margin-top: 20px; background: #22c55e; color: #000; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px;">
                Acessar o NutriX
              </a>
              <p style="color: #444; font-size: 12px; margin-top: 32px;">NutriX CRM · crmnutrix.com.br</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("[hotmart-webhook] Erro ao enviar e-mail:", e);
      }

    } else {
      // Comprador ainda não tem conta → registra compra pendente e envia e-mail para criar conta
      await prisma.hotmartPurchase.create({
        data: {
          email: buyerEmail,
          planName,
          offerCode: offerCode || null,
          transactionId: transactionId || null,
          event,
          activatedAt: null,
        },
      }).catch(() => {});

      console.log(`[hotmart-webhook] Novo comprador sem conta: ${buyerEmail}`);

      const registerUrl = `${process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br"}/register?email=${encodeURIComponent(buyerEmail)}&plan=${encodeURIComponent(planName)}`;

      try {
        await resend.emails.send({
          from: "NutriX <noreply@crmnutrix.com.br>",
          to: buyerEmail,
          subject: "✅ Pagamento aprovado! Crie sua conta no NutriX",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #080808; color: #fff; padding: 32px; border-radius: 12px;">
              <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 8px;">Pagamento aprovado! 🎉</h1>
              <p style="color: #a1a1a1; font-size: 16px;">
                Olá${buyerName ? `, ${buyerName.split(" ")[0]}` : ""}! Recebemos seu pagamento do plano <strong style="color: #fff;">${planName}</strong>.
              </p>
              <p style="color: #a1a1a1; font-size: 15px;">
                Agora é só criar sua conta no NutriX para começar. Clique no botão abaixo — leva menos de 1 minuto e sua assinatura será ativada automaticamente!
              </p>
              <a href="${registerUrl}"
                style="display: inline-block; margin-top: 20px; background: #22c55e; color: #000; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px;">
                Criar minha conta
              </a>
              <p style="color: #666; font-size: 13px; margin-top: 24px;">
                Se o botão não funcionar, acesse: ${registerUrl}
              </p>
              <p style="color: #444; font-size: 12px; margin-top: 32px;">NutriX CRM · crmnutrix.com.br</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("[hotmart-webhook] Erro ao enviar e-mail novo comprador:", e);
      }
    }
  }

  // -----------------------------------------------
  // CANCELAMENTO / REEMBOLSO
  // -----------------------------------------------
  else if (CANCEL_EVENTS.has(event)) {
    const tenant = await prisma.tenant.findFirst({
      where: { email: { equals: buyerEmail, mode: "insensitive" } },
    });

    if (tenant) {
      await prisma.subscription.update({
        where: { tenantId: tenant.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      console.log(`[hotmart-webhook] Assinatura cancelada: tenant=${tenant.id}`);

      await prisma.hotmartPurchase.create({
        data: {
          email: buyerEmail,
          planName,
          offerCode: offerCode || null,
          transactionId: transactionId || null,
          event,
          activatedAt: null,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true, event });
}
