const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY || "",
  };
}

function instanceName(tenantId: string) {
  return `tenant_${tenantId}`;
}

export function formatBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function createInstance(tenantId: string) {
  const name = instanceName(tenantId);
  const res = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      instanceName: name,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: {
        url: `${process.env.NEXTAUTH_URL}/api/webhooks/whatsapp`,
        events: ["connection.update", "qrcode.updated"],
        headers: {
          "x-webhook-secret": process.env.WHATSAPP_WEBHOOK_SECRET,
        },
      },
    }),
  });
  return res.json();
}

export async function getQRCode(tenantId: string) {
  const name = instanceName(tenantId);
  const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${name}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return res.json();
}

export async function getStatus(tenantId: string) {
  const name = instanceName(tenantId);
  const res = await fetch(
    `${EVOLUTION_API_URL}/instance/connectionState/${name}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
  return res.json();
}

export async function sendTextMessage(
  tenantId: string,
  phone: string,
  message: string
) {
  const name = instanceName(tenantId);
  const formattedPhone = formatBrazilianPhone(phone);
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${name}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      number: formattedPhone,
      text: message,
    }),
  });
  return res.json();
}

export async function deleteInstance(tenantId: string) {
  const name = instanceName(tenantId);
  const res = await fetch(`${EVOLUTION_API_URL}/instance/delete/${name}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return res.json();
}
