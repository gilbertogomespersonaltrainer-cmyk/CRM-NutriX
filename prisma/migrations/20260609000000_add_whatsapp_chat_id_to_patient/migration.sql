-- AlterTable: adiciona whatsappChatId ao paciente para armazenar o JID real do WAHA
-- Suporta tanto @c.us (número normal) quanto @lid (conta Meta vinculada)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "whatsappChatId" TEXT;
