"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassIcon } from "@/components/ui/premium-icon";
import { formatCurrency, formatDate, formatDateTime, formatPhone } from "@/lib/utils";
import {
  Download,
  Printer,
  TrendingUp,
  AlertCircle,
  Calendar,
  Users,
  FileText,
  ChevronDown,
  Lock,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = "financial" | "defaulters" | "appointments" | "patients";

interface FinancialData {
  summary: { totalReceita: number; totalPendente: number; totalDesconto: number; totalPagamentos: number };
  byServiceType: Record<string, number>;
  byMethod: Record<string, number>;
  rows: {
    id: string; paciente: string; servico: string; descricao: string;
    valorTotal: number; desconto: number; valorFinal: number;
    modalidade: string; formaPagamento: string; parcelas: number; status: string; data: string;
  }[];
}

interface DefaultersData {
  summary: { totalEmAberto: number; totalParcelas: number; totalPacientes: number };
  rows: {
    id: string; paciente: string; telefone: string; servico: string;
    parcela: string; valor: number; vencimento: string; diasAtraso: number; status: string;
  }[];
}

interface AppointmentsData {
  summary: { total: number; realizadas: number; canceladas: number; faltou: number; agendadas: number; taxaComparecimento: number };
  rows: {
    id: string; paciente: string; telefone: string; data: string;
    duracao: number; tipo: string; status: string; observacoes: string;
  }[];
}

interface PatientsData {
  summary: { novosNoPeriodo: number; totalAtivos: number; totalInativos: number; total: number };
  byOrigin: Record<string, number>;
  rows: {
    id: string; nome: string; telefone: string; email: string; cpf: string;
    dataNascimento: string | null; origem: string; status: string;
    consultas: number; pagamentos: number; cadastradoEm: string;
  }[];
}

type ReportData = FinancialData | DefaultersData | AppointmentsData | PatientsData;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix", DINHEIRO: "Dinheiro", CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito", TRANSFERENCIA: "Transferência", OUTRO: "Outro",
};

const MODALITY_LABELS: Record<string, string> = {
  AVISTA: "À Vista", PARCELADO: "Parcelado",
};

function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

// ─── CSV / XML export ──────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
}

function toXML(rootTag: string, itemTag: string, headers: string[], rows: (string | number | null | undefined)[][]): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, "_");
  const escapeXml = (v: string | number | null | undefined) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = rows.map(row =>
    `  <${itemTag}>\n${headers.map((h, i) => `    <${sanitize(h)}>${escapeXml(row[i])}</${sanitize(h)}>`).join("\n")}\n  </${itemTag}>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${items}\n</${rootTag}>`;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

// Advanced reports require Professional plan
const ADVANCED_REPORTS: ReportType[] = ["financial", "defaulters"];
const BASIC_REPORTS: ReportType[] = ["appointments", "patients"];

function isProfessional(plan?: string): boolean {
  if (!plan) return false;
  return plan.toLowerCase().includes("professional");
}

export default function RelatoriosPage() {
  const { data: session } = useSession();
  const plan = session?.user?.subscriptionPlan;
  const isPro = isProfessional(plan);

  const defaultRange = getCurrentMonthRange();
  // Default to first basic tab if not professional
  const [reportType, setReportType] = useState<ReportType>("appointments");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (ADVANCED_REPORTS.includes(reportType) && !isPro) return;
    setLoading(true);
    setFetchError(null);
    setData(null);
    try {
      const res = await fetch(`/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json?.error || "Erro ao carregar relatório");
        return;
      }
      setData(json);
    } catch {
      setFetchError("Erro de conexão ao carregar relatório");
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, isPro]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Export helpers ──────────────────────────────────────────────────────────

  function getExportData(): { headers: string[]; rows: (string | number | null)[][] } {
    if (!data) return { headers: [], rows: [] };

    if (reportType === "financial") {
      const d = data as FinancialData;
      return {
        headers: ["Paciente", "Serviço", "Descrição", "Valor Total", "Desconto", "Valor Final", "Modalidade", "Forma de Pagamento", "Parcelas", "Status", "Data"],
        rows: d.rows.map(r => [r.paciente, r.servico, r.descricao, r.valorTotal, r.desconto, r.valorFinal, MODALITY_LABELS[r.modalidade] || r.modalidade, PAYMENT_METHOD_LABELS[r.formaPagamento] || r.formaPagamento, r.parcelas, r.status === "PAID" ? "Pago" : "Pendente", formatDateTime(r.data)]),
      };
    }
    if (reportType === "defaulters") {
      const d = data as DefaultersData;
      return {
        headers: ["Paciente", "Telefone", "Serviço", "Parcela", "Valor", "Vencimento", "Dias em Atraso", "Status"],
        rows: d.rows.map(r => [r.paciente, r.telefone, r.servico, r.parcela, r.valor, formatDate(r.vencimento), r.diasAtraso, r.status === "OVERDUE" ? "Vencida" : "Pendente"]),
      };
    }
    if (reportType === "appointments") {
      const d = data as AppointmentsData;
      return {
        headers: ["Paciente", "Telefone", "Data", "Duração (min)", "Tipo", "Status", "Observações"],
        rows: d.rows.map(r => [r.paciente, r.telefone, formatDateTime(r.data), r.duracao, r.tipo, r.status, r.observacoes]),
      };
    }
    if (reportType === "patients") {
      const d = data as PatientsData;
      return {
        headers: ["Nome", "Telefone", "Email", "CPF", "Data Nascimento", "Origem", "Status", "Consultas", "Pagamentos", "Cadastrado em"],
        rows: d.rows.map(r => [r.nome, formatPhone(r.telefone), r.email, r.cpf, r.dataNascimento ? formatDate(r.dataNascimento) : "", r.origem, r.status, r.consultas, r.pagamentos, formatDate(r.cadastradoEm)]),
      };
    }
    return { headers: [], rows: [] };
  }

  const reportTitles: Record<ReportType, string> = {
    financial: "Relatório Financeiro",
    defaulters: "Relatório de Inadimplentes",
    appointments: "Relatório de Consultas",
    patients: "Relatório de Pacientes",
  };

  function exportCSV() {
    const { headers, rows } = getExportData();
    const csv = toCSV(headers, rows);
    downloadFile(csv, `${reportTitles[reportType].replace(/ /g, "_")}_${startDate}_${endDate}.csv`, "text/csv;charset=utf-8;");
  }

  function exportXML() {
    const { headers, rows } = getExportData();
    const xml = toXML("Relatorio", "Item", headers, rows);
    downloadFile(xml, `${reportTitles[reportType].replace(/ /g, "_")}_${startDate}_${endDate}.xml`, "application/xml;charset=utf-8;");
  }

  function handlePrint() {
    window.print();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const tabs: { key: ReportType; label: string; icon: "dollar" | "alert" | "calendar" | "users"; advanced: boolean }[] = [
    { key: "appointments", label: "Consultas", icon: "calendar", advanced: false },
    { key: "patients", label: "Pacientes", icon: "users", advanced: false },
    { key: "financial", label: "Financeiro", icon: "dollar", advanced: true },
    { key: "defaulters", label: "Inadimplentes", icon: "alert", advanced: true },
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-[#666] mt-1">Análise completa do seu consultório</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!data || loading || (ADVANCED_REPORTS.includes(reportType) && !isPro)}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={exportXML} disabled={!data || loading || (ADVANCED_REPORTS.includes(reportType) && !isPro)}>
            <Download className="h-3.5 w-3.5" />
            XML
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint} disabled={!data || loading || (ADVANCED_REPORTS.includes(reportType) && !isPro)}>
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Print header — shown only on print */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-outfit text-2xl font-light text-black">Nutri</span>
          <span className="font-outfit text-2xl font-black text-[#16a34a]">X</span>
        </div>
        <p className="text-sm text-gray-500">{reportTitles[reportType]} · Período: {formatDate(startDate)} até {formatDate(endDate)}</p>
        <hr className="mt-3 border-gray-200" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2">
          <Calendar className="h-3.5 w-3.5 text-[#666]" />
          <span className="text-xs text-[#666]">De</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-transparent text-white text-sm outline-none cursor-pointer"
          />
          <span className="text-xs text-[#666]">até</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-transparent text-white text-sm outline-none cursor-pointer"
          />
        </div>
        <div className="flex gap-1">
          {[
            { label: "Este mês", fn: () => { const r = getCurrentMonthRange(); setStartDate(r.start); setEndDate(r.end); } },
            { label: "Mês anterior", fn: () => { const n = new Date(); const y = n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear(); const m = n.getMonth() === 0 ? 12 : n.getMonth(); const last = new Date(y, m, 0).getDate(); setStartDate(`${y}-${String(m).padStart(2, "0")}-01`); setEndDate(`${y}-${String(m).padStart(2, "0")}-${last}`); } },
            { label: "Este ano", fn: () => { const y = new Date().getFullYear(); setStartDate(`${y}-01-01`); setEndDate(`${y}-12-31`); } },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn} className="text-xs px-3 py-1.5 rounded-lg bg-[#111] border border-[#1e1e1e] text-[#666] hover:text-white hover:border-[#333] transition-all">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[#1e1e1e] print:hidden">
        {/* Label separators */}
        <div className="w-full flex items-center gap-1 flex-wrap">
          {tabs.map((t, i) => {
            const locked = t.advanced && !isPro;
            const isFirst = i === 0;
            const firstAdvanced = tabs.findIndex(x => x.advanced);
            return (
              <div key={t.key} className="relative flex items-center">
                {/* "Avançado" label before first advanced tab */}
                {i === firstAdvanced && (
                  <span className="flex items-center gap-1 mr-2 ml-3 text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider">
                    <Zap className="h-3 w-3" /> Professional
                  </span>
                )}
                {i === 0 && (
                  <span className="flex items-center gap-1 mr-2 text-[10px] font-bold text-[#555] uppercase tracking-wider">
                    Básico
                  </span>
                )}
                <button
                  onClick={() => {
                    if (locked) return;
                    setData(null);
                    setFetchError(null);
                    setReportType(t.key);
                  }}
                  title={locked ? "Disponível no plano Professional" : undefined}
                  className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                    locked
                      ? "border-transparent text-[#444] cursor-not-allowed"
                      : reportType === t.key
                      ? "border-[#22c55e] text-white"
                      : "border-transparent text-[#666] hover:text-white"
                  }`}
                >
                  <GlassIcon icon={t.icon} size="sm" className={reportType !== t.key || locked ? "opacity-40" : ""} />
                  {t.label}
                  {locked && <Lock className="h-3 w-3 text-[#f59e0b] ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade banner — shown when advanced tab is selected but not Pro */}
      {ADVANCED_REPORTS.includes(reportType) && !isPro && (
        <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center mx-auto">
            <Lock className="h-5 w-5 text-[#f59e0b]" />
          </div>
          <h3 className="text-white font-bold">Este relatório é exclusivo do plano Professional</h3>
          <p className="text-sm text-[#888] max-w-sm mx-auto">
            Acesse relatórios Financeiros e de Inadimplentes com análise completa, gráficos e exportação de dados.
          </p>
          <a
            href="https://pay.hotmart.com/H105769412F?off=6rficksd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <Zap className="h-4 w-4" />
            Fazer upgrade para Professional
          </a>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && fetchError && (
        <div className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 px-5 py-4 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-[#ef4444] shrink-0" />
          <p className="text-sm text-[#ef4444]">{fetchError}</p>
          <button
            onClick={fetchReport}
            className="ml-auto text-xs text-[#ef4444] underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── FINANCIAL ── */}
      {!loading && !fetchError && data && reportType === "financial" && (() => {
        const d = data as FinancialData;
        if (!d.summary || !d.byServiceType || !d.byMethod || !Array.isArray(d.rows)) return null;
        return (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Receita Recebida", value: formatCurrency(d.summary.totalReceita), color: "text-[#22c55e]", icon: <TrendingUp className="h-4 w-4 text-[#22c55e]" /> },
                { label: "A Receber", value: formatCurrency(d.summary.totalPendente), color: "text-[#f59e0b]", icon: <AlertCircle className="h-4 w-4 text-[#f59e0b]" /> },
                { label: "Total em Descontos", value: formatCurrency(d.summary.totalDesconto), color: "text-[#888]", icon: <ChevronDown className="h-4 w-4 text-[#888]" /> },
                { label: "Total de Cobranças", value: d.summary.totalPagamentos, color: "text-white", icon: <FileText className="h-4 w-4 text-[#888]" /> },
              ].map(c => (
                <Card key={c.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[#666] font-medium">{c.label}</p>
                      {c.icon}
                    </div>
                    <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* By Service Type + By Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm text-[#666]">Receita por Tipo de Serviço</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(d.byServiceType).length === 0
                    ? <p className="text-sm text-[#666]">Sem dados no período</p>
                    : Object.entries(d.byServiceType).sort((a, b) => b[1] - a[1]).map(([name, val]) => {
                      const total = Object.values(d.byServiceType).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                      return (
                        <div key={name} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#a1a1a1]">{name}</span>
                            <span className="text-white font-medium">{formatCurrency(val)} <span className="text-[#555] text-xs">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-[#1e1e1e] rounded-full">
                            <div className="h-1.5 bg-[#22c55e] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  }
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm text-[#666]">Receita por Forma de Pagamento</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(d.byMethod).length === 0
                    ? <p className="text-sm text-[#666]">Sem dados no período</p>
                    : Object.entries(d.byMethod).sort((a, b) => b[1] - a[1]).map(([method, val]) => {
                      const total = Object.values(d.byMethod).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                      return (
                        <div key={method} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#a1a1a1]">{PAYMENT_METHOD_LABELS[method] || method}</span>
                            <span className="text-white font-medium">{formatCurrency(val)} <span className="text-[#555] text-xs">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-[#1e1e1e] rounded-full">
                            <div className="h-1.5 bg-[#4ade80] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  }
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#666]">{d.rows.length} cobranças no período</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        {["Paciente", "Serviço", "Valor Final", "Modalidade", "Forma Pag.", "Parcelas", "Status", "Data"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-[#555] font-medium uppercase tracking-wider first:pl-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.length === 0
                        ? <tr><td colSpan={8} className="text-center py-10 text-[#555]">Nenhuma cobrança no período</td></tr>
                        : d.rows.map(r => (
                          <tr key={r.id} className="border-b border-[#0d0d0d] hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 pl-5 text-white font-medium">{r.paciente}</td>
                            <td className="px-4 py-3 text-[#888]">{r.servico}</td>
                            <td className="px-4 py-3 text-[#22c55e] font-semibold">{formatCurrency(r.valorFinal)}</td>
                            <td className="px-4 py-3 text-[#888]">{MODALITY_LABELS[r.modalidade] || r.modalidade}</td>
                            <td className="px-4 py-3 text-[#888]">{PAYMENT_METHOD_LABELS[r.formaPagamento] || r.formaPagamento}</td>
                            <td className="px-4 py-3 text-[#888] text-center">{r.parcelas}x</td>
                            <td className="px-4 py-3">
                              <Badge variant={r.status === "PAID" ? "paid" : "pending"}>{r.status === "PAID" ? "Pago" : "Pendente"}</Badge>
                            </td>
                            <td className="px-4 py-3 text-[#666]">{formatDate(r.data)}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ── DEFAULTERS ── */}
      {!loading && !fetchError && data && reportType === "defaulters" && (() => {
        const d = data as DefaultersData;
        if (!d.summary || !Array.isArray(d.rows)) return null;
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Total em Aberto", value: formatCurrency(d.summary.totalEmAberto), color: "text-[#ef4444]" },
                { label: "Parcelas Vencidas", value: d.summary.totalParcelas, color: "text-[#f59e0b]" },
                { label: "Pacientes Inadimplentes", value: d.summary.totalPacientes, color: "text-white" },
              ].map(c => (
                <Card key={c.label}>
                  <CardContent className="p-5">
                    <p className="text-xs text-[#666] font-medium mb-2">{c.label}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm text-[#666]">{d.rows.length} parcelas em aberto</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        {["Paciente", "Telefone", "Serviço", "Parcela", "Valor", "Vencimento", "Atraso", "Status"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-[#555] font-medium uppercase tracking-wider first:pl-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.length === 0
                        ? <tr><td colSpan={8} className="text-center py-10 text-[#555]">Nenhum inadimplente encontrado 🎉</td></tr>
                        : d.rows.map(r => (
                          <tr key={r.id} className="border-b border-[#0d0d0d] hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 pl-5 text-white font-medium">{r.paciente}</td>
                            <td className="px-4 py-3 text-[#888]">{formatPhone(r.telefone)}</td>
                            <td className="px-4 py-3 text-[#888]">{r.servico}</td>
                            <td className="px-4 py-3 text-[#888] text-center">{r.parcela}</td>
                            <td className="px-4 py-3 text-[#ef4444] font-semibold">{formatCurrency(r.valor)}</td>
                            <td className="px-4 py-3 text-[#888]">{formatDate(r.vencimento)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold ${r.diasAtraso > 30 ? "text-[#ef4444]" : r.diasAtraso > 7 ? "text-[#f59e0b]" : "text-[#888]"}`}>
                                {r.diasAtraso}d
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="overdue">{r.status === "OVERDUE" ? "Vencida" : "Pendente"}</Badge>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ── APPOINTMENTS ── */}
      {!loading && !fetchError && data && reportType === "appointments" && (() => {
        const d = data as AppointmentsData;
        if (!d.summary || !Array.isArray(d.rows)) return null;
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total", value: d.summary.total, color: "text-white" },
                { label: "Realizadas", value: d.summary.realizadas, color: "text-[#22c55e]" },
                { label: "Agendadas", value: d.summary.agendadas, color: "text-[#60a5fa]" },
                { label: "Canceladas", value: d.summary.canceladas, color: "text-[#888]" },
                { label: "Faltou", value: d.summary.faltou, color: "text-[#f59e0b]" },
                { label: "Taxa Comparec.", value: `${d.summary.taxaComparecimento}%`, color: "text-[#22c55e]" },
              ].map(c => (
                <Card key={c.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-[#666] mb-1">{c.label}</p>
                    <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm text-[#666]">{d.rows.length} consultas no período</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        {["Paciente", "Telefone", "Data/Hora", "Duração", "Tipo", "Status", "Observações"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-[#555] font-medium uppercase tracking-wider first:pl-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.length === 0
                        ? <tr><td colSpan={7} className="text-center py-10 text-[#555]">Nenhuma consulta no período</td></tr>
                        : d.rows.map(r => (
                          <tr key={r.id} className="border-b border-[#0d0d0d] hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 pl-5 text-white font-medium">{r.paciente}</td>
                            <td className="px-4 py-3 text-[#888]">{formatPhone(r.telefone)}</td>
                            <td className="px-4 py-3 text-[#888]">{formatDateTime(r.data)}</td>
                            <td className="px-4 py-3 text-[#888]">{r.duracao}min</td>
                            <td className="px-4 py-3 text-[#888]">{r.tipo}</td>
                            <td className="px-4 py-3">
                              <Badge variant={r.status === "Realizada" ? "active" : r.status === "Cancelada" ? "inactive" : r.status === "Faltou" ? "overdue" : "pending"}>
                                {r.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-[#666] max-w-[200px] truncate">{r.observacoes || "—"}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ── PATIENTS ── */}
      {!loading && !fetchError && data && reportType === "patients" && (() => {
        const d = data as PatientsData;
        if (!d.summary || !d.byOrigin || !Array.isArray(d.rows)) return null;
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Novos no Período", value: d.summary.novosNoPeriodo, color: "text-[#22c55e]" },
                { label: "Total Ativos", value: d.summary.totalAtivos, color: "text-white" },
                { label: "Total Inativos", value: d.summary.totalInativos, color: "text-[#888]" },
                { label: "Total Cadastrados", value: d.summary.total, color: "text-white" },
              ].map(c => (
                <Card key={c.label}>
                  <CardContent className="p-5">
                    <p className="text-xs text-[#666] mb-2">{c.label}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {d.byOrigin && Object.keys(d.byOrigin).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm text-[#666]">Origem dos Novos Pacientes</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(d.byOrigin).sort((a, b) => b[1] - a[1]).map(([origin, count]) => (
                      <div key={origin} className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]">
                        <span className="text-sm text-[#a1a1a1]">{origin}</span>
                        <span className="text-sm font-bold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm text-[#666]">{d.rows.length} pacientes cadastrados no período</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        {["Nome", "Telefone", "Email", "Origem", "Status", "Consultas", "Pagamentos", "Cadastro"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-[#555] font-medium uppercase tracking-wider first:pl-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.length === 0
                        ? <tr><td colSpan={8} className="text-center py-10 text-[#555]">Nenhum paciente cadastrado no período</td></tr>
                        : d.rows.map(r => (
                          <tr key={r.id} className="border-b border-[#0d0d0d] hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-3 pl-5 text-white font-medium">{r.nome}</td>
                            <td className="px-4 py-3 text-[#888]">{formatPhone(r.telefone)}</td>
                            <td className="px-4 py-3 text-[#888]">{r.email || "—"}</td>
                            <td className="px-4 py-3 text-[#888]">{r.origem}</td>
                            <td className="px-4 py-3">
                              <Badge variant={r.status === "Ativo" ? "active" : "inactive"}>{r.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-[#888] text-center">{r.consultas}</td>
                            <td className="px-4 py-3 text-[#888] text-center">{r.pagamentos}</td>
                            <td className="px-4 py-3 text-[#666]">{formatDate(r.cadastradoEm)}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd !important; padding: 8px 10px !important; color: black !important; background: white !important; font-size: 12px; }
          th { background: #f5f5f5 !important; font-weight: 700; }
          .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 4px !important; }
          [class*="bg-["] { background: white !important; border: 1px solid #eee !important; }
          [class*="text-[#22"] { color: #16a34a !important; }
          [class*="text-[#ef"] { color: #dc2626 !important; }
          [class*="text-[#f5"] { color: #d97706 !important; }
          [class*="text-white"] { color: black !important; }
          [class*="text-[#a1"] { color: #555 !important; }
          [class*="text-[#88"] { color: #666 !important; }
          [class*="text-[#66"] { color: #777 !important; }
        }
      `}</style>
    </div>
  );
}
