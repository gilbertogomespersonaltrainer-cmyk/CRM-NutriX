const EVOLUTION_URL = (process.env.EVOLUTION_URL || "").replace(/\/$/, "");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

function evoHeaders() {
  return { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY };
}

async function evoFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function evoInstanceName(tenantId: string) {
  return `nx_${tenantId.replace(/-/g, "").slice(0, 20)}`;
}

export async function evoStartSession(tenantId: string) {
  const instance = evoInstanceName(tenantId);
  const APP_URL = process.env.NEXTAUTH_URL || "https://crmnutrix.com.br";

  // Deleta instância anterior se existir
  try {
    await evoFetch(`${EVOLUTION_URL}/instance/delete/${instance}`, {
      method: "DELETE",
      headers: evoHeaders(),
    });
  } catch { /* ignora */ }

  await new Promise(r => setTimeout(r, 1000));

  // Cria instância nova
  const res = await evoFetch(`${EVOLUTION_URL}/instance/create`, {
    method: "POST",
    headers: evoHeaders(),
    body: JSON.stringify({
      instanceName: instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: `${APP_URL}/api/webhooks/whatsapp`,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Evolution create instance falhou: ${JSON.stringify(err)}`);
  }

  return res.json();
}

export async function evoGetQRCode(tenantId: string): Promise<string | null> {
  const instance = evoInstanceName(tenantId);
  try {
    const res = await evoFetch(`${EVOLUTION_URL}/instance/connect/${instance}`, {
      headers: evoHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Evolution retorna { base64: "data:image/png;base64,..." } ou { code: "..." }
    if (data?.base64) return data.base64;
    if (data?.code) return `data:image/png;base64,${data.code}`;
    return null;
  } catch {
    return null;
  }
}

export async function evoGetStatus(tenantId: string): Promise<string> {
  const instance = evoInstanceName(tenantId);
  try {
    const res = await evoFetch(`${EVOLUTION_URL}/instance/connectionState/${instance}`, {
      headers: evoHeaders(),
    });
    if (!res.ok) return "STOPPED";
    const data = await res.json();
    // state: open | connecting | close
    const state = data?.instance?.state ?? data?.state ?? "close";
    if (state === "open") return "WORKING";
    if (state === "connecting") return "SCAN_QR_CODE";
    return "STOPPED";
  } catch {
    return "STOPPED";
  }
}

export async function evoStopSession(tenantId: string) {
  const instance = evoInstanceName(tenantId);
  try {
    await evoFetch(`${EVOLUTION_URL}/instance/logout/${instance}`, {
      method: "DELETE",
      headers: evoHeaders(),
    });
  } catch { /* ignora */ }
}

// Resolve o número real de um contato LID via Evolution API.
// Evolution armazena o mapeamento LID→phone internamente.
export async function evoGetContactPhone(tenantId: string, chatId: string): Promise<string | null> {
  const instance = evoInstanceName(tenantId);

  // Se não é LID, extrai dígitos direto
  if (!chatId.endsWith("@lid")) {
    const digits = chatId.replace(/@\S+/g, "").replace(/\D/g, "");
    return digits.length <= 13 ? digits : null;
  }

  try {
    const res = await evoFetch(
      `${EVOLUTION_URL}/chat/whatsappNumbers/${instance}`,
      {
        method: "POST",
        headers: evoHeaders(),
        body: JSON.stringify({ numbers: [chatId.replace("@lid", "")] }),
      },
      6000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const contact = Array.isArray(data) ? data[0] : data;
    const jid: string = contact?.jid ?? contact?.remoteJid ?? "";
    if (jid && !jid.endsWith("@lid")) {
      const digits = jid.replace(/@\S+/g, "").replace(/\D/g, "");
      if (digits && digits.length <= 13) return digits;
    }
  } catch { /* não-bloqueante */ }

  return null;
}

export async function evoSendText(
  tenantId: string,
  phone: string,
  message: string,
  rawChatId?: string
) {
  const instance = evoInstanceName(tenantId);

  let number: string;
  if (rawChatId && !rawChatId.endsWith("@lid")) {
    // Usa o JID direto se não for LID
    number = rawChatId.replace(/@\S+/g, "");
  } else {
    const digits = phone.replace(/\D/g, "");
    number = digits.startsWith("55") ? digits : `55${digits}`;
  }

  const res = await evoFetch(`${EVOLUTION_URL}/message/sendText/${instance}`, {
    method: "POST",
    headers: evoHeaders(),
    body: JSON.stringify({ number, text: message }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Evolution sendText falhou (${res.status}): ${JSON.stringify(errBody)}`);
  }

  return res.json();
}
