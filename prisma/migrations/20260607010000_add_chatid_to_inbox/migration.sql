-- Adiciona chatId para armazenar o JID original do WAHA (ex: "55119999999@c.us")
-- Necessário para enviar respostas com o identificador correto, especialmente para
-- contas que usam LID (Linked ID) no WhatsApp em vez de número de telefone.
ALTER TABLE "inbox_messages" ADD COLUMN "chatId" TEXT;
