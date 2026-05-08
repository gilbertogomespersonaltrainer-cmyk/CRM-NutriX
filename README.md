# NutriX - CRM para Nutricionistas

CRM SaaS multi-tenant para nutricionistas, com gestão de pacientes, agendamentos, financeiro e integração com WhatsApp.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Banco de dados:** PostgreSQL + Prisma ORM
- **Autenticação:** NextAuth.js
- **WhatsApp:** Evolution API (self-hosted)
- **Pagamentos:** Stripe

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Gerar Prisma Client
npx prisma generate

# 4. Rodar migrations
npx prisma migrate dev

# 5. Popular banco com dados de exemplo (opcional)
npm run db:seed

# 6. Rodar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000

**Login de teste:** ana@nutrix.com / 123456

## Variáveis de Ambiente (.env)

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nutrix"
NEXTAUTH_SECRET="gere-um-secret-seguro"
NEXTAUTH_URL="http://localhost:3000"
EVOLUTION_API_URL="https://sua-evolution-api.com"
EVOLUTION_API_KEY="sua-api-key"
WHATSAPP_WEBHOOK_SECRET="secret-webhook"
CRON_SECRET="secret-cron"
STRIPE_SECRET_KEY="sk_test_..."
```

## Módulos

- **Dashboard** - Resumo do dia, métricas, atalhos
- **Pacientes** - CRUD completo, busca, filtros ativo/inativo
- **Inativos** - Follow-up com disparo de WhatsApp
- **Agendamentos** - Calendário semanal/mensal, status
- **Financeiro** - Pagamentos, parcelas, despesas, inadimplentes
- **Configurações** - Perfil, tipos de serviço, WhatsApp, templates

## Evolution API (WhatsApp)

### Instalação

```bash
# Docker
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-api-key \
  atendai/evolution-api
```

### Configuração

1. Configure `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` no `.env`
2. Acesse Configurações > WhatsApp no CRM
3. Clique em "Conectar WhatsApp"
4. Escaneie o QR Code com o WhatsApp do celular
5. Pronto! O sistema enviará mensagens automáticas

### Webhook

Configure o webhook da Evolution API para apontar para:
```
POST {NEXTAUTH_URL}/api/webhooks/whatsapp
Header: x-webhook-secret: {WHATSAPP_WEBHOOK_SECRET}
```

## Cron Jobs

O lembrete automático de consultas (24h antes) roda via:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/whatsapp-reminders",
    "schedule": "0 10 * * *"
  }]
}
```

## Deploy

### Vercel + Supabase

1. Crie um banco PostgreSQL no Supabase
2. Faça deploy no Vercel conectando o repositório
3. Configure as variáveis de ambiente no Vercel
4. Execute `npx prisma migrate deploy` no banco de produção

### Railway

1. Crie um projeto com PostgreSQL no Railway
2. Conecte o repositório
3. Configure as variáveis de ambiente
4. O Railway detecta o Next.js automaticamente
