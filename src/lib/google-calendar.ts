/**
 * Google Calendar REST API integration (sem googleapis package).
 * Usa chamadas HTTP diretas e gerencia refresh de token automaticamente.
 *
 * Env vars necessárias:
 *   GOOGLE_CLIENT_ID     — OAuth2 client ID do Google Cloud Console
 *   GOOGLE_CLIENT_SECRET — OAuth2 client secret
 *   NEXTAUTH_URL         — URL base da aplicação (ex: https://crmnutrix.com.br)
 */

import { prisma } from "@/lib/prisma";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const APP_URL = (process.env.NEXTAUTH_URL || "https://crmnutrix.com.br").replace(/\/$/, "");
const REDIRECT_URI = `${APP_URL}/api/google/callback`;

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

// ─── OAuth URLs ───────────────────────────────────────────────────────────────

export function buildGoogleOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google token exchange failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Google token refresh failed");
  const data = await res.json();
  return data.access_token as string;
}

// ─── Authenticated Calendar Request ──────────────────────────────────────────

async function calendarRequest(
  tenantId: string,
  method: string,
  path: string,
  body?: object
): Promise<Response | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      googleCalendarEnabled: true,
      googleAccessToken: true,
      googleRefreshToken: true,
      googleCalendarId: true,
    },
  });

  if (!tenant?.googleCalendarEnabled || !tenant.googleRefreshToken) return null;

  let accessToken = tenant.googleAccessToken;

  async function doRequest(token: string): Promise<Response> {
    return fetch(`${CALENDAR_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // First attempt
  if (accessToken) {
    const res = await doRequest(accessToken);
    if (res.status !== 401) return res;
  }

  // Token expired — refresh and retry
  try {
    accessToken = await refreshAccessToken(tenant.googleRefreshToken);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { googleAccessToken: accessToken },
    });
    return await doRequest(accessToken);
  } catch (err) {
    console.error(`[GoogleCalendar] Falha ao renovar token do tenant ${tenantId}:`, err);
    return null;
  }
}

function getCalendarId(tenant: { googleCalendarId: string | null }): string {
  return tenant.googleCalendarId || "primary";
}

// ─── Event Helpers ────────────────────────────────────────────────────────────

function buildEventBody(
  patientName: string,
  scheduledAt: Date,
  duration: number,
  consultationType?: string | null,
  notes?: string | null
) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const summary = consultationType
    ? `${consultationType} — ${patientName}`
    : `Consulta — ${patientName}`;

  const description = [
    `Paciente: ${patientName}`,
    consultationType ? `Tipo: ${consultationType}` : null,
    notes ? `Observações: ${notes}` : null,
    "Agendado via NutriX CRM",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary,
    description,
    start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createCalendarEvent(
  tenantId: string,
  appointment: {
    scheduledAt: Date;
    duration: number;
    consultationType?: string | null;
    notes?: string | null;
  },
  patientName: string
): Promise<string | null> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleCalendarId: true },
    });
    const calendarId = encodeURIComponent(tenant?.googleCalendarId || "primary");
    const body = buildEventBody(
      patientName,
      appointment.scheduledAt,
      appointment.duration,
      appointment.consultationType,
      appointment.notes
    );
    const res = await calendarRequest(tenantId, "POST", `/calendars/${calendarId}/events`, body);
    if (!res || !res.ok) {
      console.error(`[GoogleCalendar] Falha ao criar evento para tenant ${tenantId}:`, res ? await res.text() : "sem resposta");
      return null;
    }
    const data = await res.json();
    return data.id as string;
  } catch (err) {
    console.error(`[GoogleCalendar] Erro ao criar evento para tenant ${tenantId}:`, err);
    return null;
  }
}

export async function updateCalendarEvent(
  tenantId: string,
  eventId: string,
  appointment: {
    scheduledAt: Date;
    duration: number;
    consultationType?: string | null;
    notes?: string | null;
  },
  patientName: string
): Promise<void> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleCalendarId: true },
    });
    const calendarId = encodeURIComponent(tenant?.googleCalendarId || "primary");
    const body = buildEventBody(
      patientName,
      appointment.scheduledAt,
      appointment.duration,
      appointment.consultationType,
      appointment.notes
    );
    await calendarRequest(tenantId, "PATCH", `/calendars/${calendarId}/events/${eventId}`, body);
  } catch (err) {
    console.error(`[GoogleCalendar] Erro ao atualizar evento ${eventId} (tenant ${tenantId}):`, err);
  }
}

export async function deleteCalendarEvent(
  tenantId: string,
  eventId: string
): Promise<void> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleCalendarId: true },
    });
    const calendarId = encodeURIComponent(tenant?.googleCalendarId || "primary");
    await calendarRequest(tenantId, "DELETE", `/calendars/${calendarId}/events/${eventId}`);
  } catch (err) {
    console.error(`[GoogleCalendar] Erro ao excluir evento ${eventId} (tenant ${tenantId}):`, err);
  }
}

export async function revokeGoogleAccess(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { googleAccessToken: true },
  });
  if (tenant?.googleAccessToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tenant.googleAccessToken}`, {
        method: "POST",
      });
    } catch { /* ignore */ }
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      googleCalendarEnabled: false,
      googleAccessToken: null,
      googleRefreshToken: null,
    },
  });
}
