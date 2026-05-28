-- Add REMINDER_8D to MessageTemplateType enum
ALTER TYPE "MessageTemplateType" ADD VALUE IF NOT EXISTS 'REMINDER_8D';

-- Add new fields to appointments table
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "confirmationSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder8dSent" BOOLEAN NOT NULL DEFAULT false;
