import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Mapeamento: código da oferta Hotmart → nome do plano NutriX
const OFFER_PLAN_MAP: Record<string, string> = {
  "8b1ck2sq": "Essential",
  "6rficksd": "Professional",
};

// Eventos que significam compra aprovada/renovada/troca de plano
const APPROVED_EVENTS = new Set([
  "PURCHASE_APPROVED", // Compra aprovada
  "PURCHASE_COMPLETE", // Compra concluída
  "SWITCH_PLAN",       // Troca de plano (upgrade/downgrade)
]);

// Eventos que significam cancelamento/reembolso
const CANCEL_EVENTS = new Set([
  "PURCHASE_CANCELLED",        // Compra cancelada
  "PURCHASE_REFUNDED",         // Reembolso solicitado
  "PURCHASE_CHARGEBACK",       // Chargeback (contestação)
  "SUBSCRIPTION_CANCELLATION", // Cancelamento de assinatura
]);

function verifyHottok(req: Request): boolean {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("hottok");
  const headerToken = req.headers.get("x-hotmart-hottok");
  const secret = process.env.HOTMART_HOTTOK;
  if (!secret) return false;
  return queryToken === secret || headerToken === secret;
}

async function logPurchase(
  email: string,
  planName: string,
  offerCode: string,
  transactionId: string | undefined,
  event: string,
  activatedAt: Date | null
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).hotmartPurchase.create({
      data: {
        email,
        planName,
        offerCode: offerCode || null,
        transactionId: transactionId || null,
        event,
        activatedAt,
      },
    });
  } catch {
    // ignora erros de log (tabela pode não existir ainda em produção)
  }
}

export async function POST(req: Request) {
  // Sempre retorna 200 para a Hotmart — processamento interno pode falhar silenciosamente
  try {
    if (!verifyHottok(req)) {
      console.warn("[hotmart-webhook] Token inválido");
      return NextResponse.json({ received: false, error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ received: false, error: "JSON inválido" }, { status: 400 });
    }

    const event = String(body?.event || "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = body?.data || {};

    // Hotmart envia o e-mail em campos diferentes dependendo do evento
    const buyerEmail = (
      String(data?.buyer?.email || data?.subscriber?.email || data?.subscription?.subscriber?.email || "")
    ).toLowerCase().trim();

    const buyerName = String(data?.buyer?.name || data?.subscriber?.name || "");
    const offerCode = String(data?.offer?.code || data?.subscription?.plan?.id || "");
    const transactionId = data?.purchase?.transaction as string | undefined;
    const planName = OFFER_PLAN_MAP[offerCode] || "Essential";

    console.log(`[hotmart-webhook] event=${event} email=${buyerEmail || "(sem email)"} plan=${planName}`);

    // -----------------------------------------------
    // COMPRA APROVADA / RENOVAÇÃO / TROCA DE PLANO
    // -----------------------------------------------
    if (APPROVED_EVENTS.has(event)) {
      if (!buyerEmail) {
        console.log(`[hotmart-webhook] Evento ${event} sem e-mail, ignorando`);
        return NextResponse.json({ received: true, event, note: "sem email" });
      }

      try {
        const plan = await prisma.plan.findFirst({
          where: { name: { equals: planName, mode: "insensitive" }, isActive: true },
        });

        const tenant = await prisma.tenant.findFirst({
          where: { email: { equals: buyerEmail, mode: "insensitive" } },
          include: { subscription: true },
        });

        if (tenant) {
          // Usuário já cadastrado → ativa/renova assinatura
          const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);

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

          console.log(`[hotmart-webhook] ✅ Assinatura ativada: tenant=${tenant.id} plano=${planName}`);

          await logPurchase(buyerEmail, planName, offerCode, transactionId, event, new Date());

          // E-mail de confirmação
          await resend.emails.send({
            from: "NutriX <noreply@crmnutrix.com.br>",
            to: buyerEmail,
            subject: "✅ Assinatura NutriX ativada com sucesso!",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#080808;color:#fff;padding:32px;border-radius:12px;">
                <h1 style="color:#22c55e;font-size:24px;margin-bottom:8px;">Tudo certo! 🎉</h1>
                <p style="color:#a1a1a1;font-size:16px;">Olá, ${tenant.name}! Sua assinatura <strong style="color:#fff;">${planName}</strong> foi ativada.</p>
                <a href="${process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br"}/dashboard"
                  style="display:inline-block;margin-top:20px;background:#22c55e;color:#000;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;">
                  Acessar o NutriX
                </a>
                <p style="color:#444;font-size:12px;margin-top:32px;">NutriX CRM · crmnutrix.com.br</p>
              </div>
            `,
          }).catch((e: unknown) => console.error("[hotmart-webhook] Erro e-mail:", e));

        } else {
          // Novo comprador sem conta → registra e envia e-mail para criar conta
          console.log(`[hotmart-webhook] Novo comprador sem conta: ${buyerEmail}`);

          await logPurchase(buyerEmail, planName, offerCode, transactionId, event, null);

          const registerUrl = `${process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br"}/register?email=${encodeURIComponent(buyerEmail)}&plan=${encodeURIComponent(planName)}`;

          await resend.emails.send({
            from: "NutriX <noreply@crmnutrix.com.br>",
            to: buyerEmail,
            subject: "✅ Pagamento aprovado! Crie sua conta no NutriX",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#080808;color:#fff;padding:32px;border-radius:12px;">
                <h1 style="color:#22c55e;font-size:24px;margin-bottom:8px;">Pagamento aprovado! 🎉</h1>
                <p style="color:#a1a1a1;font-size:16px;">Olá${buyerName ? `, ${buyerName.split(" ")[0]}` : ""}! Recebemos seu pagamento do plano <strong style="color:#fff;">${planName}</strong>.</p>
                <p style="color:#a1a1a1;font-size:15px;">Clique abaixo para criar sua conta — sua assinatura será ativada automaticamente!</p>
                <a href="${registerUrl}"
                  style="display:inline-block;margin-top:20px;background:#22c55e;color:#000;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;">
                  Criar minha conta
                </a>
                <p style="color:#444;font-size:12px;margin-top:32px;">NutriX CRM · crmnutrix.com.br</p>
              </div>
            `,
          }).catch((e: unknown) => console.error("[hotmart-webhook] Erro e-mail novo comprador:", e));
        }
      } catch (e) {
        console.error("[hotmart-webhook] Erro ao processar compra aprovada:", e);
      }
    }

    // -----------------------------------------------
    // CANCELAMENTO / REEMBOLSO
    // -----------------------------------------------
    else if (CANCEL_EVENTS.has(event)) {
      if (!buyerEmail) {
        console.log(`[hotmart-webhook] Evento ${event} sem e-mail, ignorando`);
        return NextResponse.json({ received: true, event, note: "sem email" });
      }

      try {
        const tenant = await prisma.tenant.findFirst({
          where: { email: { equals: buyerEmail, mode: "insensitive" } },
        });

        if (tenant) {
          await prisma.subscription.update({
            where: { tenantId: tenant.id },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          });
          console.log(`[hotmart-webhook] ✅ Assinatura cancelada: tenant=${tenant.id}`);
        }

        await logPurchase(buyerEmail, planName, offerCode, transactionId, event, null);
      } catch (e) {
        console.error("[hotmart-webhook] Erro ao processar cancelamento:", e);
      }
    }

    return NextResponse.json({ received: true, event });

  } catch (e) {
    // Fallback: garante que a Hotmart sempre recebe resposta
    console.error("[hotmart-webhook] Erro geral:", e);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
