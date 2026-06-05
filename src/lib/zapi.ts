const ZAPI_BASE = "https://api.z-api.io";

function zapiHeaders() {
  return { "Content-Type": "application/json", "client-token": process.env.ZAPI_SECURITY_TOKEN || "" };
}

export async function zapiGetQRCode(instanceId: string, clientToken: string): Promise<string | null> {
  const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${clientToken}/qrcode`, {
    headers: zapiHeaders(),
  });
  const data = await res.json();
  console.log("[zapi] qrcode response:", JSON.stringify(data).slice(0, 300));
  // Zapi retorna { value: "data:image/png;base64,..." } ou { qrcode: "..." }
  const base64 = data?.value ?? data?.qrcode ?? data?.base64 ?? null;
  return base64 && base64.length > 100 ? base64 : null;
}

export async function zapiGetStatus(instanceId: string, clientToken: string) {
  const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${clientToken}/status`, {
    headers: zapiHeaders(),
  });
  return res.json();
}

export async function zapiDisconnect(instanceId: string, clientToken: string) {
  const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${clientToken}/disconnect`, {
    headers: zapiHeaders(),
  });
  return res.json();
}

export async function zapiSendText(instanceId: string, clientToken: string, phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  const res = await fetch(`${ZAPI_BASE}/instances/${instanceId}/token/${clientToken}/send-text`, {
    method: "POST",
    headers: zapiHeaders(),
    body: JSON.stringify({ phone: formattedPhone, message }),
  });
  return res.json();
}
