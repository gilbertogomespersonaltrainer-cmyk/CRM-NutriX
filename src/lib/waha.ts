const WAHA_URL = (process.env.WAHA_URL || "").replace(/\/$/, "");
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";

function wahaHeaders() {
  return { "Content-Type": "application/json", "X-Api-Key": WAHA_API_KEY };
}

export function wahaSessionName(tenantId: string) {
  return `nx_${tenantId.replace(/-/g, "").slice(0, 20)}`;
}

export async function wahaStartSession(tenantId: string) {
  const name = wahaSessionName(tenantId);

  // Deleta sessão anterior (se existir) para garantir QR novo
  await fetch(`${WAHA_URL}/api/sessions/${name}`, {
    method: "DELETE",
    headers: wahaHeaders(),
  });

  await new Promise(r => setTimeout(r, 800));

  const APP_URL = process.env.NEXTAUTH_URL || "https://crmnutrix.com.br";

  // Cria sessão nova com start: true e webhook configurado
  const createRes = await fetch(`${WAHA_URL}/api/sessions`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({
      name,
      start: true,
      webhooks: [
        {
          url: `${APP_URL}/api/webhooks/whatsapp`,
          events: ["session.status"],
        },
      ],
    }),
  });

  // Se a criação falhou (sessão ainda existe), força o start
  if (!createRes.ok) {
    await fetch(`${WAHA_URL}/api/sessions/${name}/start`, {
      method: "POST",
      headers: wahaHeaders(),
    });
  }
}

export async function wahaGetQRCode(tenantId: string): Promise<string | null> {
  const name = wahaSessionName(tenantId);
  const res = await fetch(`${WAHA_URL}/api/${name}/auth/qr`, {
    headers: wahaHeaders(),
  });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  console.log("[waha] qr content-type:", contentType);

  // WAHA Plus retorna PNG binário diretamente
  if (contentType.includes("image/")) {
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  // Fallback: resposta JSON com { value: "data:image/png;base64,..." }
  const data = await res.json();
  console.log("[waha] qr json:", JSON.stringify(data).slice(0, 200));
  return data?.value ?? null;
}

export async function wahaGetStatus(tenantId: string): Promise<string> {
  const name = wahaSessionName(tenantId);
  const res = await fetch(`${WAHA_URL}/api/sessions/${name}`, {
    headers: wahaHeaders(),
  });
  if (!res.ok) return "STOPPED";
  const data = await res.json();
  // status: STOPPED | STARTING | SCAN_QR_CODE | WORKING | FAILED
  return data?.status ?? "STOPPED";
}

export async function wahaStopSession(tenantId: string) {
  const name = wahaSessionName(tenantId);
  await fetch(`${WAHA_URL}/api/sessions/${name}/stop`, {
    method: "POST",
    headers: wahaHeaders(),
  });
}

export async function wahaSendText(tenantId: string, phone: string, message: string) {
  const name = wahaSessionName(tenantId);
  const digits = phone.replace(/\D/g, "");
  const chatId = `${digits.startsWith("55") ? digits : `55${digits}`}@c.us`;
  const res = await fetch(`${WAHA_URL}/api/sendText`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({ session: name, chatId, text: message }),
  });
  return res.json();
}
