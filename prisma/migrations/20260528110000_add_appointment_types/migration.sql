-- Add appointmentTypes to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "appointmentTypes" TEXT[] NOT NULL DEFAULT '{}';

-- Add consultationType to appointments
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "consultationType" TEXT;
