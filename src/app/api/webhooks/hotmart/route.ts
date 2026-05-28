import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

// Inicialização lazy para não crashar se RESEND_API_KEY não estiver definida
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

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

// Rota de diagnóstico — acesse no browser para confirmar que a rota está ativa
export async function GET() {
  return Response.json({ ok: true, service: "hotmart-webhook", ts: new Date().toISOString() });
}

export async function POST(req: Request) {
  // Log imediato — se não aparecer nos logs da Vercel, o handler não está sendo chamado
  console.log("[hotmart-webhook] POST recebido:", new Date().toISOString());

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

          // E-mail de confirmação — assinatura ativada
          const appUrl = process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br";
          await getResend()?.emails.send({
            from: "NutriX CRM <noreply@crmnutrix.com.br>",
            to: buyerEmail,
            subject: "🎉 Sua assinatura NutriX está ativa!",
            html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;">Nutri</span><span style="font-size:32px;font-weight:900;color:#22c55e;letter-spacing:-1px;">X</span>
          <p style="margin:4px 0 0;font-size:11px;letter-spacing:3px;color:#22c55e;text-transform:uppercase;font-weight:600;">CRM para Nutricionistas</p>
        </td></tr>

        <!-- Card principal -->
        <tr><td style="background:#161616;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

          <!-- Header verde -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px;text-align:center;">
              <p style="margin:0;font-size:40px;">🎉</p>
              <h1 style="margin:12px 0 4px;font-size:24px;font-weight:800;color:#fff;">Assinatura Ativada!</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.85);">Tudo pronto para você começar</p>
            </td></tr>
          </table>

          <!-- Corpo -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#e5e5e5;">Olá, <strong style="color:#fff;">${tenant.name.split(" ")[0]}</strong>! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#a1a1a1;line-height:1.6;">
                Sua assinatura do plano <strong style="color:#22c55e;">${planName}</strong> foi ativada com sucesso.
                A partir de agora você tem acesso completo ao NutriX CRM e pode começar a organizar seus pacientes e consultas.
              </p>

              <!-- Destaques do plano -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;margin-bottom:28px;">
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:2px;">O que você tem acesso</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#d4d4d4;">✅ &nbsp;Gestão completa de pacientes</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#d4d4d4;">✅ &nbsp;Agendamentos e lembretes automáticos</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#d4d4d4;">✅ &nbsp;Envio de mensagens via WhatsApp</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#d4d4d4;">✅ &nbsp;Pipeline e controle financeiro</p>
                  <p style="margin:0;font-size:14px;color:#d4d4d4;">✅ &nbsp;Relatórios e métricas do consultório</p>
                </td></tr>
              </table>

              <!-- Botão CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                  <a href="${appUrl}/dashboard" style="display:inline-block;background:#22c55e;color:#000;font-size:16px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.3px;">
                    Acessar o NutriX →
                  </a>
                </td></tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#666;text-align:center;line-height:1.6;">
                Precisa de ajuda? Responda este e-mail ou acesse nossa central de suporte.<br>
                Estamos aqui para garantir o seu sucesso! 🌱
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;">© 2026 NutriX CRM · <a href="https://crmnutrix.com.br" style="color:#22c55e;text-decoration:none;">crmnutrix.com.br</a></p>
          <p style="margin:6px 0 0;font-size:11px;color:#333;">Você está recebendo este e-mail porque realizou uma assinatura do NutriX.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
          }).catch((e: unknown) => console.error("[hotmart-webhook] Erro e-mail:", e));

        } else {
          // Novo comprador sem conta → registra e envia e-mail para criar conta
          console.log(`[hotmart-webhook] Novo comprador sem conta: ${buyerEmail}`);

          await logPurchase(buyerEmail, planName, offerCode, transactionId, event, null);

          const registerUrl = `${process.env.NEXTAUTH_URL || "https://app.crmnutrix.com.br"}/register?email=${encodeURIComponent(buyerEmail)}&plan=${encodeURIComponent(planName)}`;

          const firstName = buyerName ? buyerName.split(" ")[0] : "";
          await getResend()?.emails.send({
            from: "NutriX CRM <noreply@crmnutrix.com.br>",
            to: buyerEmail,
            subject: "🎉 Pagamento confirmado! Crie sua conta no NutriX",
            html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;">Nutri</span><span style="font-size:32px;font-weight:900;color:#22c55e;letter-spacing:-1px;">X</span>
          <p style="margin:4px 0 0;font-size:11px;letter-spacing:3px;color:#22c55e;text-transform:uppercase;font-weight:600;">CRM para Nutricionistas</p>
        </td></tr>

        <!-- Card principal -->
        <tr><td style="background:#161616;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

          <!-- Header -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px;text-align:center;">
              <p style="margin:0;font-size:40px;">✅</p>
              <h1 style="margin:12px 0 4px;font-size:24px;font-weight:800;color:#fff;">Pagamento Confirmado!</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.85);">Agora é só criar sua conta para começar</p>
            </td></tr>
          </table>

          <!-- Corpo -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#e5e5e5;">
                Olá${firstName ? `, <strong style="color:#fff;">${firstName}</strong>` : ""}! 👋
              </p>
              <p style="margin:0 0 8px;font-size:15px;color:#a1a1a1;line-height:1.6;">
                Recebemos a confirmação do seu pagamento do plano <strong style="color:#22c55e;">${planName}</strong>. Que ótima escolha! 🌱
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#a1a1a1;line-height:1.6;">
                Para ativar seu acesso, basta criar sua conta no NutriX usando <strong style="color:#fff;">este mesmo e-mail</strong>. Leva menos de 2 minutos e sua assinatura será ativada automaticamente!
              </p>

              <!-- Passos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;margin-bottom:28px;">
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:2px;">Como ativar em 3 passos</p>
                  <p style="margin:0 0 10px;font-size:14px;color:#d4d4d4;">① &nbsp;Clique no botão abaixo</p>
                  <p style="margin:0 0 10px;font-size:14px;color:#d4d4d4;">② &nbsp;Preencha seus dados usando <strong style="color:#fff;">este e-mail</strong></p>
                  <p style="margin:0;font-size:14px;color:#d4d4d4;">③ &nbsp;Pronto! Acesso liberado na hora 🎉</p>
                </td></tr>
              </table>

              <!-- Botão CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                  <a href="${registerUrl}" style="display:inline-block;background:#22c55e;color:#000;font-size:16px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.3px;">
                    Criar minha conta →
                  </a>
                </td></tr>
              </table>

              <p style="margin:20px 0 0;font-size:12px;color:#555;text-align:center;">
                Ou acesse diretamente: <a href="${registerUrl}" style="color:#22c55e;text-decoration:none;">${registerUrl}</a>
              </p>

              <p style="margin:24px 0 0;font-size:13px;color:#666;text-align:center;line-height:1.6;">
                Alguma dúvida? Responda este e-mail que te ajudamos. 😊
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;">© 2026 NutriX CRM · <a href="https://crmnutrix.com.br" style="color:#22c55e;text-decoration:none;">crmnutrix.com.br</a></p>
          <p style="margin:6px 0 0;font-size:11px;color:#333;">Você está recebendo este e-mail porque realizou uma compra na Hotmart.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
