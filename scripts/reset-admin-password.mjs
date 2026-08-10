import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "gilbertogomespersonaltrainer@gmail.com";
const NEW_PASSWORD = process.argv[2];

if (!NEW_PASSWORD) {
  console.error("Uso: node scripts/reset-admin-password.mjs <nova_senha>");
  process.exit(1);
}

const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
const updated = await prisma.adminUser.update({
  where: { email: EMAIL },
  data: { password: hashed },
  select: { id: true, name: true, email: true },
});

console.log("Senha atualizada para:", updated);
await prisma.$disconnect();
