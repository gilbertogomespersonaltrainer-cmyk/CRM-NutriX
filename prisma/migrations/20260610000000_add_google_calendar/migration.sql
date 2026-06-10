-- Google Calendar integration fields on tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "googleCalendarEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;

-- Google Calendar event ID on appointments (for update/delete sync)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
