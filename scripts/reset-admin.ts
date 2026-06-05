/**
 * Script para criar ou redefinir senha do admin
 * Uso: DATABASE_URL="..." npx ts-node scripts/reset-admin.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@crmnutrix.com.br";
  const password = process.env.ADMIN_PASSWORD || "NutriX@Admin2026";
  const name = process.env.ADMIN_NAME || "Administrador";

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { password: hashed, name },
    create: { email, password: hashed, name },
  });

  console.log("\n✅ Admin criado/atualizado com sucesso!");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Senha: ${password}`);
  console.log(`\n   Acesse: https://www.crmnutrix.com.br/admin/login\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
