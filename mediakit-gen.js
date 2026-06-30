const pptxgen    = require("/Users/gilbertogomesdelima/.local/node/lib/node_modules/pptxgenjs");
const React      = require("/Users/gilbertogomesdelima/.local/node/lib/node_modules/react");
const RDS        = require("/Users/gilbertogomesdelima/.local/node/lib/node_modules/react-dom/server");
const sharp      = require("/Users/gilbertogomesdelima/.local/node/lib/node_modules/sharp");

// ── Ícones ───────────────────────────────────────────────────────────
const { FiCalendar, FiUserX, FiTrendingDown, FiFolder,
        FiMessageCircle, FiFilter, FiBarChart2, FiFileText,
        FiBell, FiDollarSign } = require("/Users/gilbertogomesdelima/.local/node/lib/node_modules/react-icons/fi");

async function iconPng(Icon, color = "#22C55E", size = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Icon, { color, size: String(size), strokeWidth: 1.5 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ── Paleta ──────────────────────────────────────────────────────────
const BLACK   = "080808";
const CARD    = "141414";
const BORDER  = "1E1E1E";
const GREEN   = "22C55E";
const WHITE   = "FFFFFF";
const GRAY    = "888888";
const LGRAY   = "AAAAAA";
const RED     = "EF4444";
const PINE    = "052E16";

// ── Paths dos mockups ───────────────────────────────────────────────
const MOCK_DIR = "/Users/gilbertogomesdelima/Desktop/Mockups prontos NutriX/";
const IMG = {
  dashboard: MOCK_DIR + "ChatGPT Image 17 de jun. de 2026, 21_07_59.png",
  pipeline:  MOCK_DIR + "ChatGPT Image 17 de jun. de 2026, 21_10_27.png",
  pacientes: MOCK_DIR + "ChatGPT Image 17 de jun. de 2026, 21_12_44.png",
  inativos:  MOCK_DIR + "ChatGPT Image 17 de jun. de 2026, 21_23_28.png",
};

// ── Helpers ─────────────────────────────────────────────────────────
const makeShadow = () => ({ type: "outer", blur: 18, offset: 6, angle: 135, color: "000000", opacity: 0.45 });

function sectionLabel(slide, text) {
  slide.addText(text, {
    x: 0.55, y: 0.38, w: 9, h: 0.28,
    fontFace: "Calibri", fontSize: 11, color: GREEN,
    bold: true, charSpacing: 3, margin: 0,
  });
}

function slideTitle(slide, text, y = 0.7) {
  slide.addText(text, {
    x: 0.55, y, w: 9, h: 0.85,
    fontFace: "Trebuchet MS", fontSize: 34, color: WHITE,
    bold: true, margin: 0,
  });
}

// ── PRINCIPAL (async para poder usar icons) ──────────────────────────
async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "NutriX";
  pres.title  = "NutriX — Mídia Kit 2025";

  // pré-renderiza ícones
  const ic = {
    calendar:  await iconPng(FiCalendar,       "#EF4444"),
    userx:     await iconPng(FiUserX,           "#EF4444"),
    trending:  await iconPng(FiTrendingDown,    "#EF4444"),
    folder:    await iconPng(FiFolder,          "#EF4444"),
    msg:       await iconPng(FiMessageCircle,   "#22C55E"),
    filter:    await iconPng(FiFilter,          "#22C55E"),
    chart:     await iconPng(FiBarChart2,       "#22C55E"),
    file:      await iconPng(FiFileText,        "#22C55E"),
    bell:      await iconPng(FiBell,            "#22C55E"),
    dollar:    await iconPng(FiDollarSign,      "#22C55E"),
  };

  // ── SLIDE 1 · Capa ─────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    s.addShape(pres.shapes.OVAL, {
      x: 2.3, y: -1.8, w: 5.4, h: 5.4,
      fill: { color: GREEN, transparency: 91 },
      line: { color: GREEN, transparency: 100 },
    });

    s.addText([
      { text: "Nutri", options: { color: WHITE, bold: false } },
      { text: "X",     options: { color: GREEN, bold: true  } },
    ], {
      x: 0, y: 1.3, w: 10, h: 1.3,
      fontFace: "Trebuchet MS", fontSize: 80,
      align: "center", valign: "middle", margin: 0,
    });

    s.addText("O CRM que transforma consultórios em negócios.", {
      x: 1, y: 2.8, w: 8, h: 0.65,
      fontFace: "Calibri", fontSize: 20, color: LGRAY,
      align: "center", margin: 0,
    });

    s.addShape(pres.shapes.LINE, {
      x: 4.2, y: 3.65, w: 1.6, h: 0,
      line: { color: GREEN, width: 1 },
    });

    s.addText("APRESENTAÇÃO INSTITUCIONAL · 2026", {
      x: 0, y: 3.9, w: 10, h: 0.32,
      fontFace: "Calibri", fontSize: 10, color: GRAY,
      align: "center", charSpacing: 3, margin: 0,
    });

    s.addShape(pres.shapes.RECTANGLE, {
      x: 3.75, y: 4.55, w: 2.5, h: 0.42,
      fill: { color: GREEN, transparency: 87 },
      line: { color: GREEN, width: 1 },
    });
    s.addText("Preparado para Eduzz", {
      x: 3.75, y: 4.56, w: 2.5, h: 0.4,
      fontFace: "Calibri", fontSize: 11, color: GREEN,
      align: "center", bold: true, valign: "middle", margin: 0,
    });
  }

  // ── SLIDE 2 · O Mercado ────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "O MERCADO");
    slideTitle(s, "Um mercado imenso, ainda no Excel.");

    const stats = [
      { value: "130 mil+", label: "nutricionistas\nregistrados no Brasil",  src: "Fonte: CFN" },
      { value: "85%",      label: "ainda usam métodos\nmanuais ou planilhas", src: "Pesquisa interna" },
      { value: "R$ 2 bi",  label: "potencial estimado de\nmercado SaaS saúde",  src: "ABES / Gartner" },
    ];

    stats.forEach((st, i) => {
      const x = 0.45 + i * 3.15;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.85, w: 3.0, h: 2.65,
        fill: { color: CARD }, line: { color: BORDER, width: 1 },
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.85, w: 3.0, h: 0.05,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });
      s.addText(st.value, {
        x: x + 0.22, y: 2.05, w: 2.6, h: 0.9,
        fontFace: "Trebuchet MS", fontSize: 40, color: GREEN, bold: true, margin: 0,
      });
      s.addText(st.label, {
        x: x + 0.22, y: 3.0, w: 2.6, h: 0.85,
        fontFace: "Calibri", fontSize: 13, color: WHITE, margin: 0,
      });
      s.addText(st.src, {
        x: x + 0.22, y: 3.9, w: 2.6, h: 0.35,
        fontFace: "Calibri", fontSize: 10, color: GRAY, italic: true, margin: 0,
      });
    });

    s.addText("A nutrição é a maior profissão de saúde sem um software feito para ela. O NutriX nasceu para mudar isso.", {
      x: 0.55, y: 4.75, w: 8.9, h: 0.5,
      fontFace: "Calibri", fontSize: 13, color: GRAY,
      align: "center", italic: true, margin: 0,
    });
  }

  // ── SLIDE 3 · O Problema (ícones modernos) ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "O PROBLEMA");
    slideTitle(s, "O nutricionista perde tempo e dinheiro todo dia.");

    const probs = [
      { iconKey: "calendar", title: "Agenda descoordenada",  desc: "Confirmações de consulta feitas manualmente pelo WhatsApp, uma a uma, todo dia." },
      { iconKey: "userx",    title: "Paciente que some",      desc: "Sem follow-up automático, o paciente inativo fica para trás e nunca retorna." },
      { iconKey: "trending", title: "Financeiro no escuro",   desc: "Sem visibilidade de receita, inadimplência ou metas. Gestão feita de cabeça." },
      { iconKey: "folder",   title: "Histórico espalhado",    desc: "Prontuários em cadernos, PDFs soltos e grupos de WhatsApp sem organização." },
    ];

    probs.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x   = 0.45 + col * 4.85;
      const y   = 1.85 + row * 1.75;

      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 4.6, h: 1.58,
        fill: { color: "0D0D0D" }, line: { color: "1E1E1E", width: 1 },
      });
      // faixa vermelha esquerda (accent vertical)
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 0.05, h: 1.58,
        fill: { color: RED }, line: { color: RED, width: 0 },
      });

      // ícone SVG moderno
      s.addImage({ data: ic[p.iconKey], x: x + 0.2, y: y + 0.18, w: 0.42, h: 0.42 });

      s.addText(p.title, {
        x: x + 0.75, y: y + 0.16, w: 3.7, h: 0.4,
        fontFace: "Trebuchet MS", fontSize: 14, color: WHITE, bold: true, margin: 0,
      });
      s.addText(p.desc, {
        x: x + 0.75, y: y + 0.62, w: 3.7, h: 0.76,
        fontFace: "Calibri", fontSize: 12, color: GRAY, margin: 0,
      });
    });
  }

  // ── SLIDE 4 · A Solução (ícones modernos) ──────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "A SOLUÇÃO");
    slideTitle(s, "NutriX: um CRM construído do zero para nutricionistas.");

    const feats = [
      { iconKey: "msg",    title: "WhatsApp nativo",       desc: "Confirmação, lembrete, pós-consulta e reativação automáticos." },
      { iconKey: "filter", title: "Pipeline de leads",     desc: "Do primeiro contato à consulta recorrente, tudo num kanban visual." },
      { iconKey: "chart",  title: "Relatórios reais",      desc: "Financeiro, inadimplência e evolução de pacientes em tempo real." },
      { iconKey: "file",   title: "Prontuário digital",    desc: "Histórico completo de cada paciente com documentos e evolução." },
      { iconKey: "bell",   title: "Lembretes automáticos", desc: "8 dias, 24h e 2h antes da consulta, sem nenhuma ação manual." },
      { iconKey: "dollar", title: "Gestão financeira",     desc: "Controle de receita, parcelamentos e faturamento num só lugar." },
    ];

    feats.forEach((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x   = 0.38 + col * 3.2;
      const y   = 1.82 + row * 1.72;

      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 3.05, h: 1.58,
        fill: { color: CARD }, line: { color: BORDER, width: 1 },
      });

      // círculo de fundo para o ícone
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.18, y: y + 0.2, w: 0.45, h: 0.45,
        fill: { color: GREEN, transparency: 88 },
        line: { color: GREEN, transparency: 70, width: 1 },
      });
      s.addImage({ data: ic[f.iconKey], x: x + 0.2, y: y + 0.22, w: 0.41, h: 0.41 });

      s.addText(f.title, {
        x: x + 0.75, y: y + 0.2, w: 2.15, h: 0.38,
        fontFace: "Trebuchet MS", fontSize: 13, color: WHITE, bold: true, margin: 0,
      });
      s.addText(f.desc, {
        x: x + 0.18, y: y + 0.75, w: 2.72, h: 0.7,
        fontFace: "Calibri", fontSize: 12, color: GRAY, margin: 0,
      });
    });
  }

  // ── SLIDES 5–8 · Mockups elegantes (ratio 3:2 correto) ─────────────
  // Slide 10" × 5.625"
  // Imagens: 1536×1024 → ratio 1.5
  // Layout: painel texto esquerda 3.5" | imagem centralizada à direita
  // Imagem: w=5.7", h=5.7/1.5=3.8" → centrada verticalmente: y=(5.625-3.8)/2=0.91"
  const IMG_W = 5.7;
  const IMG_H = IMG_W / 1.5;   // 3.8"
  const IMG_X = 3.85;
  const IMG_Y = (5.625 - IMG_H) / 2;   // 0.9125"

  const mockSlides = [
    {
      section: "PRODUTO",
      title: "Dashboard: visão completa do consultório.",
      imgPath: IMG.dashboard,
      bullets: [
        "Consultas do dia, pacientes ativos e receita mensal em tempo real",
        "Atalhos rápidos para as ações mais comuns do dia a dia",
        "Disponível em desktop e mobile com layout responsivo",
      ],
    },
    {
      section: "PRODUTO",
      title: "Pipeline: acompanhe cada lead até a consulta.",
      imgPath: IMG.pipeline,
      bullets: [
        "Kanban visual com estágios Lead, 1ª Consulta, Ativo e Inativo",
        "Cards avançam automaticamente conforme o paciente evolui",
        "Colunas customizadas exclusivas do plano Professional",
      ],
    },
    {
      section: "PRODUTO",
      title: "Pacientes: base completa e organizada.",
      imgPath: IMG.pacientes,
      bullets: [
        "Busca por nome, CPF ou telefone com filtros por status",
        "Importação em massa via CSV para migrar de outras ferramentas",
        "Acesso direto ao WhatsApp e prontuário de cada paciente",
      ],
    },
    {
      section: "PRODUTO",
      title: "Inativos: recupere quem parou de aparecer.",
      imgPath: IMG.inativos,
      bullets: [
        "Lista automática de pacientes sem consulta há mais de 30 dias",
        "Follow-up escalonado em 30, 60 e 90 dias no plano Professional",
        "Mensagem de reativação personalizada enviada via WhatsApp",
      ],
    },
  ];

  mockSlides.forEach(({ section, title, imgPath, bullets }) => {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    // painel esquerdo escuro
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 3.65, h: 5.625,
      fill: { color: "090909" }, line: { color: "090909", width: 0 },
    });
    // linha separadora verde tênue
    s.addShape(pres.shapes.RECTANGLE, {
      x: 3.63, y: 0.5, w: 0.025, h: 4.625,
      fill: { color: GREEN, transparency: 60 },
      line: { color: GREEN, transparency: 100 },
    });

    sectionLabel(s, section);

    s.addText(title, {
      x: 0.48, y: 0.72, w: 3.0, h: 1.5,
      fontFace: "Trebuchet MS", fontSize: 20, color: WHITE,
      bold: true, margin: 0,
    });

    bullets.forEach((b, i) => {
      s.addShape(pres.shapes.OVAL, {
        x: 0.48, y: 2.38 + i * 0.88, w: 0.2, h: 0.2,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });
      s.addText(b, {
        x: 0.78, y: 2.32 + i * 0.88, w: 2.72, h: 0.72,
        fontFace: "Calibri", fontSize: 12, color: LGRAY, margin: 0,
      });
    });

    // imagem com dimensões corretas — sem distorção
    s.addImage({
      path: imgPath,
      x: IMG_X, y: IMG_Y, w: IMG_W, h: IMG_H,
      shadow: makeShadow(),
    });
  });

  // ── SLIDE 9 · Outras seções do produto ────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "PRODUTO");
    slideTitle(s, "Tudo que o nutricionista precisa, num só lugar.");

    const sections = [
      { icon: "bell",   title: "Agendamentos",  desc: "Calendário completo com visão diária e mensal, controle de status de cada consulta e histórico por paciente." },
      { icon: "dollar", title: "Financeiro",    desc: "Registro de pagamentos, controle de parcelamentos, receita mensal e relatório de inadimplentes." },
      { icon: "msg",    title: "Pós-Consulta",  desc: "Mensagens automáticas enviadas após cada consulta para manter o vínculo e orientar o próximo passo." },
      { icon: "msg",    title: "Inbox",         desc: "Central de mensagens WhatsApp integrada ao CRM, com histórico de cada conversa vinculado ao paciente." },
    ];

    // ícones para essa seção (reutiliza os já renderizados)
    const sectionIcons = [ic.bell, ic.dollar, ic.msg, ic.msg];

    sections.forEach((sec, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x   = 0.45 + col * 4.85;
      const y   = 1.85 + row * 1.75;

      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 4.6, h: 1.58,
        fill: { color: CARD }, line: { color: BORDER, width: 1 },
      });
      // accent verde esquerda
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 0.05, h: 1.58,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });

      s.addImage({ data: sectionIcons[i], x: x + 0.2, y: y + 0.18, w: 0.42, h: 0.42 });

      s.addText(sec.title, {
        x: x + 0.75, y: y + 0.16, w: 3.7, h: 0.4,
        fontFace: "Trebuchet MS", fontSize: 14, color: WHITE, bold: true, margin: 0,
      });
      s.addText(sec.desc, {
        x: x + 0.75, y: y + 0.62, w: 3.7, h: 0.76,
        fontFace: "Calibri", fontSize: 12, color: GRAY, margin: 0,
      });
    });
  }

  // ── SLIDE 10 · Automações WhatsApp ──────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "AUTOMAÇÕES");
    slideTitle(s, "O paciente é acompanhado em todo o ciclo, sem esforço.");

    const steps = [
      { label: "Agendamento",       msg: "Confirmação automática\nao agendar a consulta" },
      { label: "8 dias antes",      msg: "Lembrete antecipado\npor WhatsApp" },
      { label: "24h e 2h antes",    msg: "Dois lembretes finais\npara reduzir faltas" },
      { label: "Pós-consulta",      msg: "Mensagem de cuidado\ne próximos passos" },
      { label: "30 / 60 / 90 dias", msg: "Reativação escalonada\nde pacientes inativos" },
    ];

    steps.forEach((st, i) => {
      const x = 0.32 + i * 1.89;

      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.82, w: 1.76, h: 2.85,
        fill: { color: CARD }, line: { color: BORDER, width: 1 },
      });

      s.addShape(pres.shapes.OVAL, {
        x: x + 0.63, y: 1.98, w: 0.5, h: 0.5,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });
      s.addText(String(i + 1), {
        x: x + 0.63, y: 1.98, w: 0.5, h: 0.5,
        fontFace: "Trebuchet MS", fontSize: 15, color: PINE, bold: true,
        align: "center", valign: "middle", margin: 0,
      });

      s.addText(st.label, {
        x: x + 0.1, y: 2.62, w: 1.56, h: 0.42,
        fontFace: "Trebuchet MS", fontSize: 12, color: WHITE, bold: true,
        align: "center", margin: 0,
      });
      s.addText(st.msg, {
        x: x + 0.1, y: 3.1, w: 1.56, h: 1.3,
        fontFace: "Calibri", fontSize: 11, color: GRAY,
        align: "center", margin: 0,
      });

      if (i < steps.length - 1) {
        s.addShape(pres.shapes.LINE, {
          x: x + 1.79, y: 3.25, w: 0.08, h: 0,
          line: { color: "333333", width: 1 },
        });
      }
    });

    s.addText("Pós-consulta e reativação 60/90 dias disponíveis exclusivamente no plano Professional.", {
      x: 0.55, y: 4.9, w: 8.9, h: 0.38,
      fontFace: "Calibri", fontSize: 11, color: GRAY,
      align: "center", italic: true, margin: 0,
    });
  }

  // ── SLIDE 10 · Modelo de Negócio ───────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "MODELO DE NEGÓCIO");
    slideTitle(s, "SaaS com recorrência mensal. Dois planos claros.");

    // Essential
    {
      const x = 0.5, y = 1.72, w = 4.1, h = 3.6;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: CARD }, line: { color: BORDER, width: 1 } });
      s.addText("Essential", {
        x: x + 0.3, y: y + 0.22, w: 3.5, h: 0.38,
        fontFace: "Calibri", fontSize: 13, color: GRAY, bold: true, margin: 0,
      });
      s.addText([
        { text: "R$ 57", options: { fontSize: 42, bold: true, color: WHITE } },
        { text: "/mês",  options: { fontSize: 14, color: GRAY } },
      ], { x: x + 0.3, y: y + 0.62, w: 3.5, h: 0.75, fontFace: "Trebuchet MS", margin: 0 });

      ["Pacientes ilimitados", "Confirmação e lembretes automáticos", "Mensagem de aniversário",
       "Reativação de inativos (30 dias)", "Relatório financeiro (visualização)", "Pipeline Kanban"]
        .forEach((f, i) => {
          s.addText("✓  " + f, {
            x: x + 0.3, y: y + 1.52 + i * 0.31, w: 3.5, h: 0.29,
            fontFace: "Calibri", fontSize: 12, color: LGRAY, margin: 0,
          });
        });
    }

    // Professional
    {
      const x = 5.4, y = 1.5, w = 4.1, h = 3.9;
      s.addShape(pres.shapes.RECTANGLE, {
        x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08,
        fill: { color: GREEN, transparency: 87 }, line: { color: GREEN, width: 1 },
      });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: "111111" }, line: { color: GREEN, width: 1 } });
      s.addShape(pres.shapes.RECTANGLE, {
        x: x + 1.2, y: y - 0.22, w: 1.7, h: 0.34,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });
      s.addText("Mais popular", {
        x: x + 1.2, y: y - 0.22, w: 1.7, h: 0.34,
        fontFace: "Calibri", fontSize: 11, color: PINE, bold: true,
        align: "center", valign: "middle", margin: 0,
      });
      s.addText("Professional", {
        x: x + 0.3, y: y + 0.22, w: 3.5, h: 0.38,
        fontFace: "Calibri", fontSize: 13, color: GREEN, bold: true, margin: 0,
      });
      s.addText([
        { text: "R$ 97", options: { fontSize: 42, bold: true, color: WHITE } },
        { text: "/mês",  options: { fontSize: 14, color: GRAY } },
      ], { x: x + 0.3, y: y + 0.62, w: 3.5, h: 0.75, fontFace: "Trebuchet MS", margin: 0 });

      ["Tudo do Essential", "Pós-consulta automático", "Reativação escalonada 30, 60 e 90 dias",
       "Relatório de inadimplentes", "Exportação CSV / XML / PDF",
       "Pipeline com colunas customizadas", "Suporte prioritário"]
        .forEach((f, i) => {
          s.addText("✓  " + f, {
            x: x + 0.3, y: y + 1.52 + i * 0.31, w: 3.5, h: 0.29,
            fontFace: "Calibri", fontSize: 12, color: i === 0 ? LGRAY : WHITE, margin: 0,
          });
        });
    }
  }

  // ── SLIDE 11 · Diferenciais ────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "DIFERENCIAIS");
    slideTitle(s, "Feito para nutricionista. Não adaptado.");

    const colW = [3.3, 1.95, 2.1, 1.85];
    const colX = [0.38, 3.73, 5.73, 7.88];
    const hdrs = ["Recurso", "Softwares genéricos", "CRMs de saúde", "NutriX"];
    const rows = [
      ["WhatsApp nativo e automático",    "✕", "Parcial",  "✓"],
      ["CRM com Pipeline de leads",       "✕", "✕",        "✓"],
      ["Pós-consulta automático",         "✕", "✕",        "✓"],
      ["Reativação escalonada 30/60/90d", "✕", "✕",        "✓"],
      ["Feito 100% para nutricionistas",  "✕", "Parcial",  "✓"],
      ["Preço acessível",                 "Alto", "Alto",  "R$ 57/mês"],
    ];

    hdrs.forEach((h, ci) => {
      s.addShape(pres.shapes.RECTANGLE, {
        x: colX[ci], y: 1.78, w: colW[ci] - 0.05, h: 0.38,
        fill: { color: ci === 3 ? GREEN : "1A1A1A" },
        line: { color: ci === 3 ? GREEN : "252525", width: 1 },
      });
      s.addText(h, {
        x: colX[ci] + 0.1, y: 1.8, w: colW[ci] - 0.25, h: 0.34,
        fontFace: "Calibri", fontSize: 12,
        color: ci === 3 ? PINE : (ci === 0 ? WHITE : GRAY),
        bold: true, valign: "middle", margin: 0,
      });
    });

    rows.forEach((row, ri) => {
      const y = 2.2 + ri * 0.42;
      row.forEach((cell, ci) => {
        const isNutrix = ci === 3;
        const isBad    = cell === "✕";
        const isGood   = cell === "✓" || cell.startsWith("R$");
        s.addShape(pres.shapes.RECTANGLE, {
          x: colX[ci], y, w: colW[ci] - 0.05, h: 0.38,
          fill: { color: isNutrix ? "0A180A" : (ri % 2 === 0 ? "0D0D0D" : "111111") },
          line: { color: isNutrix ? GREEN : "1A1A1A", width: 1 },
        });
        s.addText(cell, {
          x: colX[ci] + 0.1, y: y + 0.02, w: colW[ci] - 0.25, h: 0.34,
          fontFace: "Calibri", fontSize: 12,
          color: isNutrix ? GREEN : (isBad ? RED : (isGood ? GREEN : GRAY)),
          valign: "middle", margin: 0,
        });
      });
    });
  }

  // ── SLIDE 12 · Validação Beta ──────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "VALIDAÇÃO");
    slideTitle(s, "Produto validado. Lançamento em julho de 2026.");

    // ── 3 stat cards no topo ──
    const stats = [
      { value: "4",         label: "nutricionistas\nno beta fechado",   sub: "fase de validação" },
      { value: "100%",      label: "aprovação entre\nos beta testers",   sub: "feedback coletado" },
      { value: "Jul 2026",  label: "lançamento\noficial previsto",       sub: "janela aberta para parceiros" },
    ];

    stats.forEach((st, i) => {
      const x = 0.45 + i * 3.15;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.78, w: 3.0, h: 1.55,
        fill: { color: CARD }, line: { color: BORDER, width: 1 },
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.78, w: 3.0, h: 0.05,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });
      s.addText(st.value, {
        x: x + 0.22, y: 1.92, w: 2.6, h: 0.62,
        fontFace: "Trebuchet MS", fontSize: 34, color: GREEN, bold: true, margin: 0,
      });
      s.addText(st.label, {
        x: x + 0.22, y: 2.57, w: 2.6, h: 0.52,
        fontFace: "Calibri", fontSize: 12, color: WHITE, margin: 0,
      });
      s.addText(st.sub, {
        x: x + 0.22, y: 3.1, w: 2.6, h: 0.3,
        fontFace: "Calibri", fontSize: 10, color: GRAY, italic: true, margin: 0,
      });
    });

    // ── Depoimentos ──
    const testimonials = [
      { quote: "O NutriX atende todas as necessidades de pré-consulta, consulta e pós-consulta. É algo revolucionário.", name: "Willian Sena", role: "Nutricionista, beta tester" },
      { quote: "Diferente de outros softwares com IA, o NutriX é automatizado mas não engessado. Tenho autonomia para personalizar tudo.", name: "Jaqueline Regina", role: "Nutricionista, beta tester" },
    ];

    testimonials.forEach((t, i) => {
      const x = 0.45 + i * 4.82;
      const y = 3.58;

      // card depoimento
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: 4.6, h: 1.72,
        fill: { color: "0D0D0D" }, line: { color: BORDER, width: 1 },
      });
      // aspas decorativas
      s.addText("“", {
        x: x + 0.18, y: y + 0.05, w: 0.4, h: 0.5,
        fontFace: "Trebuchet MS", fontSize: 36, color: GREEN,
        bold: true, margin: 0,
      });
      // texto do depoimento
      s.addText(t.quote, {
        x: x + 0.22, y: y + 0.38, w: 4.15, h: 0.82,
        fontFace: "Calibri", fontSize: 12, color: LGRAY,
        italic: true, margin: 0,
      });
      // nome
      s.addText(t.name, {
        x: x + 0.22, y: y + 1.3, w: 3.0, h: 0.28,
        fontFace: "Calibri", fontSize: 11, color: GREEN,
        bold: true, margin: 0,
      });
      s.addText(t.role, {
        x: x + 0.22, y: y + 1.52, w: 3.5, h: 0.22,
        fontFace: "Calibri", fontSize: 10, color: GRAY, margin: 0,
      });
    });
  }

  // ── SLIDE 13 · Roadmap ─────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "ROADMAP");
    slideTitle(s, "Onde estamos e para onde vamos.");

    // ── Coluna 1: Hoje + Lançamento ──
    const c1x = 0.35;

    // Card Hoje
    s.addShape(pres.shapes.RECTANGLE, {
      x: c1x, y: 1.78, w: 2.15, h: 1.65,
      fill: { color: CARD }, line: { color: BORDER, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: c1x, y: 1.78, w: 2.15, h: 0.05,
      fill: { color: GREEN }, line: { color: GREEN, width: 0 },
    });
    s.addText("Hoje — Beta", {
      x: c1x + 0.18, y: 1.92, w: 1.82, h: 0.35,
      fontFace: "Trebuchet MS", fontSize: 13, color: GREEN, bold: true, margin: 0,
    });
    ["CRM completo", "Automações WhatsApp", "Planos Essential/Pro", "Pipeline e relatórios"].forEach((item, j) => {
      s.addText("•  " + item, {
        x: c1x + 0.18, y: 2.32 + j * 0.26, w: 1.82, h: 0.24,
        fontFace: "Calibri", fontSize: 10, color: LGRAY, margin: 0,
      });
    });

    // Card Lançamento
    s.addShape(pres.shapes.RECTANGLE, {
      x: c1x, y: 3.58, w: 2.15, h: 0.9,
      fill: { color: "0A180A" }, line: { color: GREEN, width: 1 },
    });
    s.addText("Jul 2026", {
      x: c1x + 0.18, y: 3.7, w: 1.82, h: 0.32,
      fontFace: "Trebuchet MS", fontSize: 13, color: GREEN, bold: true, margin: 0,
    });
    s.addText("Lançamento oficial", {
      x: c1x + 0.18, y: 4.03, w: 1.82, h: 0.28,
      fontFace: "Calibri", fontSize: 11, color: WHITE, margin: 0,
    });

    // seta →
    s.addShape(pres.shapes.LINE, {
      x: 2.55, y: 2.6, w: 0.2, h: 0,
      line: { color: "333333", width: 1 },
    });

    // ── Coluna 2: 2027 ──
    const c2x = 2.8;
    s.addShape(pres.shapes.RECTANGLE, {
      x: c2x, y: 1.78, w: 3.3, h: 3.55,
      fill: { color: CARD }, line: { color: BORDER, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: c2x, y: 1.78, w: 3.3, h: 0.05,
      fill: { color: "60A5FA" }, line: { color: "60A5FA", width: 0 },
    });
    s.addText("2027 — Próximas evoluções", {
      x: c2x + 0.2, y: 1.92, w: 2.9, h: 0.35,
      fontFace: "Trebuchet MS", fontSize: 13, color: "60A5FA", bold: true, margin: 0,
    });

    const next = [
      { item: "Gestão de equipe e multi-clínica", complexity: "Média",   note: "Base multi-tenant já existe" },
      { item: "API pública para parceiros",        complexity: "Média",   note: "Backend estruturado, expansível" },
      { item: "App mobile iOS e Android",          complexity: "Alta",    note: "Requer React Native ou wrapper" },
      { item: "Dashboard para clínicas em rede",   complexity: "Média",   note: "Extensão do dashboard atual" },
    ];

    const complexColors = { "Média": "60A5FA", "Alta": "F59E0B", "Muito Alta": "EF4444" };

    next.forEach((n, j) => {
      const y = 2.38 + j * 0.75;
      s.addText("•  " + n.item, {
        x: c2x + 0.2, y, w: 2.9, h: 0.28,
        fontFace: "Calibri", fontSize: 12, color: WHITE, margin: 0,
      });
      // tag complexidade
      s.addShape(pres.shapes.RECTANGLE, {
        x: c2x + 0.2, y: y + 0.3, w: 1.05, h: 0.22,
        fill: { color: complexColors[n.complexity], transparency: 82 },
        line: { color: complexColors[n.complexity], width: 1 },
      });
      s.addText("Complexidade: " + n.complexity, {
        x: c2x + 0.22, y: y + 0.3, w: 1.03, h: 0.22,
        fontFace: "Calibri", fontSize: 8, color: complexColors[n.complexity],
        bold: true, valign: "middle", margin: 0,
      });
      s.addText(n.note, {
        x: c2x + 1.32, y: y + 0.3, w: 1.6, h: 0.22,
        fontFace: "Calibri", fontSize: 9, color: GRAY,
        italic: true, valign: "middle", margin: 0,
      });
    });

    // seta →
    s.addShape(pres.shapes.LINE, {
      x: 6.15, y: 2.6, w: 0.2, h: 0,
      line: { color: "333333", width: 1 },
    });

    // ── Coluna 3: Visão de Longo Prazo ──
    const c3x = 6.4;
    s.addShape(pres.shapes.RECTANGLE, {
      x: c3x, y: 1.78, w: 3.25, h: 3.55,
      fill: { color: CARD }, line: { color: BORDER, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: c3x, y: 1.78, w: 3.25, h: 0.05,
      fill: { color: "A78BFA" }, line: { color: "A78BFA", width: 0 },
    });
    s.addText("Visão de longo prazo", {
      x: c3x + 0.2, y: 1.92, w: 2.85, h: 0.35,
      fontFace: "Trebuchet MS", fontSize: 13, color: "A78BFA", bold: true, margin: 0,
    });

    const longterm = [
      { item: "Integração com prontuário eletrônico", complexity: "Alta",      note: "Depende de parceiros externos" },
      { item: "IA para sugestão de reativação",       complexity: "Alta",      note: "Requer volume de dados" },
      { item: "Integração com plataformas de cursos", complexity: "Alta",      note: "Depende de acordos comerciais" },
      { item: "Marketplace de materiais nutricionais",complexity: "Muito Alta", note: "Produto separado" },
    ];

    longterm.forEach((n, j) => {
      const y = 2.38 + j * 0.75;
      s.addText("•  " + n.item, {
        x: c3x + 0.2, y, w: 2.85, h: 0.28,
        fontFace: "Calibri", fontSize: 12, color: WHITE, margin: 0,
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: c3x + 0.2, y: y + 0.3, w: 1.25, h: 0.22,
        fill: { color: complexColors[n.complexity], transparency: 82 },
        line: { color: complexColors[n.complexity], width: 1 },
      });
      s.addText("Complexidade: " + n.complexity, {
        x: c3x + 0.22, y: y + 0.3, w: 1.23, h: 0.22,
        fontFace: "Calibri", fontSize: 8, color: complexColors[n.complexity],
        bold: true, valign: "middle", margin: 0,
      });
      s.addText(n.note, {
        x: c3x + 1.52, y: y + 0.3, w: 1.45, h: 0.22,
        fontFace: "Calibri", fontSize: 9, color: GRAY,
        italic: true, valign: "middle", margin: 0,
      });
    });
  }

  // ── SLIDE 14 · Parceria Eduzz ──────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    sectionLabel(s, "A PARCERIA");
    slideTitle(s, "Por que Eduzz e NutriX fazem sentido juntos.");

    const pts = [
      { title: "Nutricionistas são criadores de conteúdo",    desc: "Uma fatia expressiva da base Eduzz é de nutricionistas que vendem cursos e ebooks. O NutriX é a próxima ferramenta natural da jornada deles." },
      { title: "Distribuição qualificada e imediata",          desc: "A Eduzz tem acesso direto ao público-alvo do NutriX. Uma parceria estratégica acelera a aquisição sem depender de tráfego pago." },
      { title: "Produto complementar, não concorrente",        desc: "Eduzz cuida de vendas de conteúdo. NutriX cuida do consultório. Juntos, cobrem toda a operação do nutricionista moderno." },
      { title: "Oportunidade de bundling ou co-branded",       desc: "Oferecer NutriX como benefício exclusivo para produtores Eduzz da área de saúde cria diferencial competitivo para as duas plataformas." },
    ];

    pts.forEach((p, i) => {
      const y = 1.78 + i * 0.9;
      s.addShape(pres.shapes.OVAL, {
        x: 0.42, y: y + 0.13, w: 0.36, h: 0.36,
        fill: { color: GREEN }, line: { color: GREEN, width: 0 },
      });
      s.addText(String(i + 1), {
        x: 0.42, y: y + 0.13, w: 0.36, h: 0.36,
        fontFace: "Trebuchet MS", fontSize: 13, color: PINE, bold: true,
        align: "center", valign: "middle", margin: 0,
      });
      s.addText(p.title, {
        x: 0.95, y, w: 8.7, h: 0.37,
        fontFace: "Trebuchet MS", fontSize: 14, color: WHITE, bold: true, margin: 0,
      });
      s.addText(p.desc, {
        x: 0.95, y: y + 0.4, w: 8.7, h: 0.44,
        fontFace: "Calibri", fontSize: 12, color: GRAY, margin: 0,
      });
    });
  }

  // ── SLIDE 15 · Encerramento ────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BLACK };

    s.addShape(pres.shapes.OVAL, {
      x: 2.3, y: -1.5, w: 5.4, h: 5.4,
      fill: { color: GREEN, transparency: 91 },
      line: { color: GREEN, transparency: 100 },
    });

    s.addText([
      { text: "Nutri", options: { color: WHITE, bold: false } },
      { text: "X",     options: { color: GREEN, bold: true  } },
    ], {
      x: 0, y: 0.85, w: 10, h: 1.1,
      fontFace: "Trebuchet MS", fontSize: 68,
      align: "center", valign: "middle", margin: 0,
    });

    s.addText("Vamos construir o futuro da nutrição juntos.", {
      x: 1, y: 2.15, w: 8, h: 0.65,
      fontFace: "Trebuchet MS", fontSize: 22, color: WHITE, bold: true,
      align: "center", margin: 0,
    });
    s.addText("gilbertogomespersonaltrainer@gmail.com", {
      x: 1, y: 3.05, w: 8, h: 0.38,
      fontFace: "Calibri", fontSize: 14, color: LGRAY,
      align: "center", margin: 0,
    });

    s.addShape(pres.shapes.RECTANGLE, {
      x: 3.55, y: 4.1, w: 2.9, h: 0.65,
      fill: { color: GREEN }, line: { color: GREEN, width: 0 },
    });
    s.addText("Agendar uma conversa", {
      x: 3.55, y: 4.1, w: 2.9, h: 0.65,
      fontFace: "Calibri", fontSize: 14, color: PINE, bold: true,
      align: "center", valign: "middle", margin: 0,
    });

    s.addText("nutrix.com.br", {
      x: 1, y: 5.0, w: 8, h: 0.3,
      fontFace: "Calibri", fontSize: 11, color: GRAY,
      align: "center", margin: 0,
    });
  }

  await pres.writeFile({ fileName: "/Users/gilbertogomesdelima/Documents/NutriX/NutriX-MediaKit-Eduzz.pptx" });
  console.log("Gerado: NutriX-MediaKit-Eduzz.pptx");
}

build().catch(err => { console.error(err); process.exit(1); });
