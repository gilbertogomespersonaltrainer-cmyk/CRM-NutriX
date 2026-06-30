#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://graph.facebook.com/v21.0";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // format: act_XXXXXXXXX

async function metaGet(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`Meta API error: ${data.error.message} (code ${data.error.code})`);
  return data;
}

async function metaPost(path, body = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", ACCESS_TOKEN);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Meta API error: ${data.error.message} (code ${data.error.code})`);
  return data;
}

// ─── Field sets ───────────────────────────────────────────────────────────────

const CAMPAIGN_FIELDS =
  "id,name,status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,special_ad_categories";

const ADSET_FIELDS =
  "id,name,status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy,targeting,optimization_goal,billing_event,start_time,end_time,created_time,updated_time";

const AD_FIELDS =
  "id,name,status,adset_id,campaign_id,creative{id,name,title,body,image_url,video_id,call_to_action_type,object_story_spec},created_time,updated_time";

const INSIGHTS_FIELDS =
  "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,ctr,cpm,cpc,cpp,actions,conversions,cost_per_action_type,roas,frequency";

// ─── Tools ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "meta_list_campaigns",
    description:
      "Lista todas as campanhas da conta Meta Ads com status, objetivo, orçamento e datas.",
    inputSchema: {
      type: "object",
      properties: {
        status_filter: {
          type: "string",
          enum: ["ACTIVE", "PAUSED", "ARCHIVED", "ALL"],
          description: "Filtrar por status. Padrão: ALL",
        },
        limit: { type: "number", description: "Máximo de resultados (padrão 25)" },
      },
    },
  },
  {
    name: "meta_get_campaign",
    description: "Busca detalhes completos de uma campanha específica.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "ID da campanha" },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "meta_list_adsets",
    description: "Lista conjuntos de anúncios (ad sets) de uma campanha ou da conta toda.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "ID da campanha (opcional)" },
        status_filter: { type: "string", enum: ["ACTIVE", "PAUSED", "ARCHIVED", "ALL"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "meta_list_ads",
    description: "Lista anúncios com seus criativos, status e campanhas associadas.",
    inputSchema: {
      type: "object",
      properties: {
        adset_id: { type: "string", description: "Filtrar por ad set (opcional)" },
        campaign_id: { type: "string", description: "Filtrar por campanha (opcional)" },
        status_filter: { type: "string", enum: ["ACTIVE", "PAUSED", "ARCHIVED", "ALL"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "meta_get_insights",
    description:
      "Retorna métricas de performance (impressões, cliques, CTR, CPM, CPC, gasto, conversões, ROAS) para campanhas, ad sets ou anúncios.",
    inputSchema: {
      type: "object",
      properties: {
        level: {
          type: "string",
          enum: ["account", "campaign", "adset", "ad"],
          description: "Nível de agregação dos dados",
        },
        date_preset: {
          type: "string",
          enum: [
            "today",
            "yesterday",
            "last_7d",
            "last_14d",
            "last_30d",
            "last_90d",
            "this_month",
            "last_month",
            "this_year",
          ],
          description: "Período pré-definido. Padrão: last_30d",
        },
        since: { type: "string", description: "Data início YYYY-MM-DD (alternativa ao date_preset)" },
        until: { type: "string", description: "Data fim YYYY-MM-DD" },
        campaign_id: { type: "string", description: "Filtrar por campanha" },
        adset_id: { type: "string", description: "Filtrar por ad set" },
        ad_id: { type: "string", description: "Filtrar por anúncio" },
        limit: { type: "number" },
      },
      required: ["level"],
    },
  },
  {
    name: "meta_create_campaign",
    description: "Cria uma nova campanha no Meta Ads.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome da campanha" },
        objective: {
          type: "string",
          enum: [
            "OUTCOME_AWARENESS",
            "OUTCOME_TRAFFIC",
            "OUTCOME_ENGAGEMENT",
            "OUTCOME_LEADS",
            "OUTCOME_APP_PROMOTION",
            "OUTCOME_SALES",
          ],
          description: "Objetivo da campanha",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "PAUSED"],
          description: "Status inicial (padrão PAUSED)",
        },
        daily_budget: {
          type: "number",
          description: "Orçamento diário em centavos (ex: 5000 = R$50,00)",
        },
        lifetime_budget: {
          type: "number",
          description: "Orçamento total em centavos (alternativa ao daily_budget)",
        },
        special_ad_categories: {
          type: "array",
          items: { type: "string" },
          description: "Categorias especiais (CREDIT, EMPLOYMENT, HOUSING, ISSUES_ELECTIONS_POLITICS). Use [] se não aplicável.",
        },
      },
      required: ["name", "objective", "special_ad_categories"],
    },
  },
  {
    name: "meta_update_campaign",
    description: "Atualiza campos de uma campanha existente (nome, status, orçamento).",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string" },
        name: { type: "string" },
        status: { type: "string", enum: ["ACTIVE", "PAUSED", "ARCHIVED"] },
        daily_budget: { type: "number", description: "Em centavos" },
        lifetime_budget: { type: "number", description: "Em centavos" },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "meta_create_adset",
    description: "Cria um conjunto de anúncios (ad set) dentro de uma campanha.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string" },
        name: { type: "string" },
        status: { type: "string", enum: ["ACTIVE", "PAUSED"] },
        daily_budget: { type: "number", description: "Em centavos" },
        lifetime_budget: { type: "number", description: "Em centavos" },
        bid_strategy: {
          type: "string",
          enum: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"],
        },
        optimization_goal: {
          type: "string",
          enum: [
            "REACH",
            "IMPRESSIONS",
            "LINK_CLICKS",
            "LANDING_PAGE_VIEWS",
            "LEAD_GENERATION",
            "QUALITY_LEAD",
            "CONVERSIONS",
            "VALUE",
            "APP_INSTALLS",
            "VIDEO_VIEWS",
          ],
        },
        billing_event: {
          type: "string",
          enum: ["IMPRESSIONS", "LINK_CLICKS", "APP_INSTALLS", "VIDEO_VIEWS"],
        },
        targeting: {
          type: "object",
          description:
            "Objeto de segmentação. Ex: {age_min:25, age_max:45, genders:[1,2], geo_locations:{countries:['BR']}, interests:[{id:'6003139266461', name:'Nutrition'}]}",
        },
        start_time: { type: "string", description: "ISO 8601 (ex: 2026-07-01T00:00:00-03:00)" },
        end_time: { type: "string" },
      },
      required: ["campaign_id", "name", "optimization_goal", "billing_event", "targeting"],
    },
  },
  {
    name: "meta_update_adset",
    description: "Atualiza um ad set (status, orçamento, segmentação, datas).",
    inputSchema: {
      type: "object",
      properties: {
        adset_id: { type: "string" },
        name: { type: "string" },
        status: { type: "string", enum: ["ACTIVE", "PAUSED", "ARCHIVED"] },
        daily_budget: { type: "number" },
        lifetime_budget: { type: "number" },
        targeting: { type: "object" },
        end_time: { type: "string" },
      },
      required: ["adset_id"],
    },
  },
  {
    name: "meta_update_ad",
    description: "Atualiza o status de um anúncio (ativar, pausar, arquivar).",
    inputSchema: {
      type: "object",
      properties: {
        ad_id: { type: "string" },
        status: { type: "string", enum: ["ACTIVE", "PAUSED", "ARCHIVED"] },
        name: { type: "string" },
      },
      required: ["ad_id"],
    },
  },
  {
    name: "meta_get_ad_creative",
    description: "Busca detalhes completos de um criativo de anúncio (imagens, vídeos, textos, CTA).",
    inputSchema: {
      type: "object",
      properties: {
        creative_id: { type: "string" },
      },
      required: ["creative_id"],
    },
  },
  {
    name: "meta_analyze_account",
    description:
      "Análise completa da conta: resume campanhas ativas, top performers, principais métricas e oportunidades de melhoria.",
    inputSchema: {
      type: "object",
      properties: {
        date_preset: {
          type: "string",
          enum: ["last_7d", "last_14d", "last_30d", "last_90d", "this_month"],
          description: "Período para a análise (padrão: last_30d)",
        },
      },
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleTool(name, args) {
  if (!ACCESS_TOKEN) throw new Error("META_ACCESS_TOKEN não configurado");
  if (!AD_ACCOUNT_ID) throw new Error("META_AD_ACCOUNT_ID não configurado");

  const accountPath = `/${AD_ACCOUNT_ID}`;

  switch (name) {
    case "meta_list_campaigns": {
      const p = { fields: CAMPAIGN_FIELDS, limit: args.limit || 25 };
      if (args.status_filter && args.status_filter !== "ALL")
        p.effective_status = `["${args.status_filter}"]`;
      const data = await metaGet(`${accountPath}/campaigns`, p);
      return data;
    }

    case "meta_get_campaign": {
      return metaGet(`/${args.campaign_id}`, { fields: CAMPAIGN_FIELDS });
    }

    case "meta_list_adsets": {
      if (args.campaign_id) {
        const p = { fields: ADSET_FIELDS, limit: args.limit || 25 };
        if (args.status_filter && args.status_filter !== "ALL")
          p.effective_status = `["${args.status_filter}"]`;
        return metaGet(`/${args.campaign_id}/adsets`, p);
      }
      const p = { fields: ADSET_FIELDS, limit: args.limit || 25 };
      if (args.status_filter && args.status_filter !== "ALL")
        p.effective_status = `["${args.status_filter}"]`;
      return metaGet(`${accountPath}/adsets`, p);
    }

    case "meta_list_ads": {
      let basePath = accountPath;
      if (args.adset_id) basePath = `/${args.adset_id}`;
      else if (args.campaign_id) basePath = `/${args.campaign_id}`;
      const p = { fields: AD_FIELDS, limit: args.limit || 25 };
      if (args.status_filter && args.status_filter !== "ALL")
        p.effective_status = `["${args.status_filter}"]`;
      return metaGet(`${basePath}/ads`, p);
    }

    case "meta_get_insights": {
      let basePath = accountPath;
      if (args.ad_id) basePath = `/${args.ad_id}`;
      else if (args.adset_id) basePath = `/${args.adset_id}`;
      else if (args.campaign_id) basePath = `/${args.campaign_id}`;

      const p = {
        fields: INSIGHTS_FIELDS,
        level: args.level,
        limit: args.limit || 50,
      };
      if (args.since && args.until) {
        p.time_range = JSON.stringify({ since: args.since, until: args.until });
      } else {
        p.date_preset = args.date_preset || "last_30d";
      }
      return metaGet(`${basePath}/insights`, p);
    }

    case "meta_create_campaign": {
      const body = {
        name: args.name,
        objective: args.objective,
        status: args.status || "PAUSED",
        special_ad_categories: args.special_ad_categories || [],
      };
      if (args.daily_budget) body.daily_budget = args.daily_budget;
      if (args.lifetime_budget) body.lifetime_budget = args.lifetime_budget;
      return metaPost(`${accountPath}/campaigns`, body);
    }

    case "meta_update_campaign": {
      const body = {};
      if (args.name) body.name = args.name;
      if (args.status) body.status = args.status;
      if (args.daily_budget) body.daily_budget = args.daily_budget;
      if (args.lifetime_budget) body.lifetime_budget = args.lifetime_budget;
      return metaPost(`/${args.campaign_id}`, body);
    }

    case "meta_create_adset": {
      const body = {
        campaign_id: args.campaign_id,
        name: args.name,
        status: args.status || "PAUSED",
        optimization_goal: args.optimization_goal,
        billing_event: args.billing_event,
        targeting: args.targeting,
        bid_strategy: args.bid_strategy || "LOWEST_COST_WITHOUT_CAP",
      };
      if (args.daily_budget) body.daily_budget = args.daily_budget;
      if (args.lifetime_budget) body.lifetime_budget = args.lifetime_budget;
      if (args.start_time) body.start_time = args.start_time;
      if (args.end_time) body.end_time = args.end_time;
      return metaPost(`${accountPath}/adsets`, body);
    }

    case "meta_update_adset": {
      const body = {};
      if (args.name) body.name = args.name;
      if (args.status) body.status = args.status;
      if (args.daily_budget) body.daily_budget = args.daily_budget;
      if (args.lifetime_budget) body.lifetime_budget = args.lifetime_budget;
      if (args.targeting) body.targeting = args.targeting;
      if (args.end_time) body.end_time = args.end_time;
      return metaPost(`/${args.adset_id}`, body);
    }

    case "meta_update_ad": {
      const body = {};
      if (args.status) body.status = args.status;
      if (args.name) body.name = args.name;
      return metaPost(`/${args.ad_id}`, body);
    }

    case "meta_get_ad_creative": {
      return metaGet(`/${args.creative_id}`, {
        fields:
          "id,name,title,body,image_url,image_hash,video_id,thumbnail_url,call_to_action_type,object_story_spec,asset_feed_spec,degrees_of_freedom_spec",
      });
    }

    case "meta_analyze_account": {
      const preset = args.date_preset || "last_30d";
      const [campaigns, insights] = await Promise.all([
        metaGet(`${accountPath}/campaigns`, {
          fields: CAMPAIGN_FIELDS,
          effective_status: '["ACTIVE"]',
          limit: 50,
        }),
        metaGet(`${accountPath}/insights`, {
          fields: INSIGHTS_FIELDS,
          level: "campaign",
          date_preset: preset,
          limit: 50,
        }),
      ]);

      const insightMap = {};
      for (const i of (insights.data || [])) insightMap[i.campaign_id] = i;

      const summary = (campaigns.data || []).map((c) => {
        const ins = insightMap[c.id] || {};
        return {
          id: c.id,
          name: c.name,
          objective: c.objective,
          status: c.status,
          daily_budget_brl: c.daily_budget ? (Number(c.daily_budget) / 100).toFixed(2) : null,
          impressions: ins.impressions,
          clicks: ins.clicks,
          spend_brl: ins.spend ? Number(ins.spend).toFixed(2) : "0.00",
          ctr: ins.ctr ? `${Number(ins.ctr).toFixed(2)}%` : null,
          cpm: ins.cpm ? `R$${Number(ins.cpm).toFixed(2)}` : null,
          cpc: ins.cpc ? `R$${Number(ins.cpc).toFixed(2)}` : null,
        };
      });

      return {
        period: preset,
        active_campaigns: summary.length,
        campaigns: summary,
        total_spend_brl: summary
          .reduce((acc, c) => acc + Number(c.spend_brl), 0)
          .toFixed(2),
      };
    }

    default:
      throw new Error(`Tool desconhecida: ${name}`);
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "mcp-meta-ads", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const result = await handleTool(req.params.name, req.params.arguments || {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Erro: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
