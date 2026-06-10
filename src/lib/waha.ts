const WAHA_URL = (process.env.WAHA_URL || "").replace(/\/$/, "");
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";

function wahaHeaders() {
  return { "Content-Type": "application/json", "X-Api-Key": WAHA_API_KEY };
}

// Fetch com timeout para evitar que funções serverless fiquem penduradas
async function wahaFetch(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function wahaSessionName(tenantId: string) {
  return `nx_${tenantId.replace(/-/g, "").slice(0, 20)}`;
}

export async function wahaStartSession(tenantId: string) {
  const name = wahaSessionName(tenantId);

  // Sequência de limpeza completa: stop → logout → delete
  // Logout remove as chaves de sessão do WhatsApp, evitando estado corrompido
  try {
    await wahaFetch(`${WAHA_URL}/api/sessions/${name}/stop`, { method: "POST", headers: wahaHeaders() });
  } catch { /* ignora */ }

  await new Promise(r => setTimeout(r, 500));

  try {
    await wahaFetch(`${WAHA_URL}/api/sessions/${name}/logout`, { method: "POST", headers: wahaHeaders() });
  } catch { /* ignora */ }

  await new Promise(r => setTimeout(r, 500));

  try {
    await wahaFetch(`${WAHA_URL}/api/sessions/${name}`, { method: "DELETE", headers: wahaHeaders() });
  } catch { /* ignora erro de timeout/inexistente */ }

  await new Promise(r => setTimeout(r, 1500));

  const APP_URL = process.env.NEXTAUTH_URL || "https://crmnutrix.com.br";

  // Cria sessão nova com start: true e webhook configurado
  try {
    const createRes = await wahaFetch(`${WAHA_URL}/api/sessions`, {
      method: "POST",
      headers: wahaHeaders(),
      body: JSON.stringify({
        name,
        start: true,
        webhooks: [
          {
            url: `${APP_URL}/api/webhooks/whatsapp`,
            events: ["session.status", "qr", "message"],
          },
        ],
      }),
    });

    // Se a criação falhou (sessão ainda existe), força o start
    if (!createRes.ok) {
      await wahaFetch(`${WAHA_URL}/api/sessions/${name}/start`, {
        method: "POST",
        headers: wahaHeaders(),
      });
    }
  } catch { /* timeout — WAHA iniciou mas demorou a responder */ }
}

export async function wahaGetQRCode(tenantId: string): Promise<string | null> {
  const name = wahaSessionName(tenantId);
  let res: Response;
  try {
    res = await wahaFetch(`${WAHA_URL}/api/${name}/auth/qr`, { headers: wahaHeaders() });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";

  // WAHA Plus retorna PNG binário diretamente
  if (contentType.includes("image/")) {
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  // Fallback: resposta JSON com { value: "data:image/png;base64,..." }
  try {
    const data = await res.json();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

export async function wahaGetStatus(tenantId: string): Promise<string> {
  const name = wahaSessionName(tenantId);
  try {
    const res = await wahaFetch(`${WAHA_URL}/api/sessions/${name}`, { headers: wahaHeaders() });
    if (!res.ok) return "STOPPED";
    const data = await res.json();
    // status: STOPPED | STARTING | SCAN_QR_CODE | WORKING | FAILED
    return data?.status ?? "STOPPED";
  } catch {
    return "STOPPED";
  }
}

export async function wahaStopSession(tenantId: string) {
  const name = wahaSessionName(tenantId);
  try {
    await wahaFetch(`${WAHA_URL}/api/sessions/${name}/stop`, { method: "POST", headers: wahaHeaders() });
  } catch { /* ignora */ }
}

export async function wahaSendText(
  tenantId: string,
  phone: string,
  message: string,
  rawChatId?: string  // JID original do WAHA — usa quando disponível para garantir entrega correta
) {
  const name = wahaSessionName(tenantId);

  // Usa o chatId original se disponível (resolve problemas com LIDs e formatos não-padrão)
  // Caso contrário, reconstrói a partir do phone
  let chatId: string;
  if (rawChatId) {
    chatId = rawChatId;
  } else {
    const digits = phone.replace(/\D/g, "");
    chatId = `${digits.startsWith("55") ? digits : `55${digits}`}@c.us`;
  }

  const res = await wahaFetch(`${WAHA_URL}/api/sendText`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({ session: name, chatId, text: message }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`WAHA sendText falhou (${res.status}): ${JSON.stringify(errBody)}`);
  }

  return res.json();
}
