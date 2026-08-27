"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { StatCardIcon, GlassIcon } from "@/components/ui/premium-icon";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  MoreVertical,
  Trash2,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const paymentMethodLabels: Record<string, string> = {
  PIX: "Pix",
  Pix: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Payment = {
  id: string;
  totalAmount: number;
  finalAmount: number;
  discountAmount: number;
  modality: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  patient: { name: string };
  serviceType: { name: string };
  installments: {
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: string;
  }[];
};

type ServiceType = {
  id: string;
  name: string;
  defaultPrice: number;
  isActive: boolean;
};

type Patient = { id: string; name: string };

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
};

type ChartData = {
  monthly: { month: string; receita: number; despesas: number }[];
  byServiceType: Record<string, number>;
  byMethod: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortCurrency(v: number): string {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

const CHART_COLORS = ["#22c55e", "#16a34a", "#4ade80", "#6ee7b7", "#a7f3d0"];

// ---------------------------------------------------------------------------
// Chart: Evolução Mensal (Essential + Pro)
// ---------------------------------------------------------------------------

function MonthlyChart({
  data,
  isPro,
}: {
  data: ChartData["monthly"] | undefined;
  isPro: boolean;
}) {
  if (!data) {
    return (
      <div className="flex items-end gap-2 h-[130px]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full bg-[#1a1a1a] rounded-t animate-pulse"
              style={{ height: `${50 + i * 10}%` }}
            />
            <div className="h-2 w-5 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => (isPro ? [d.receita, d.despesas] : [d.receita])),
    1
  );

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-[130px]">
        {data.map((d, i) => {
          const rH = Math.max(
            Math.round((d.receita / maxVal) * 100),
            d.receita > 0 ? 3 : 0
          );
          const eH = isPro
            ? Math.max(Math.round((d.despesas / maxVal) * 100), d.despesas > 0 ? 3 : 0)
            : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                <div
                  className={cn(
                    "rounded-t-sm bg-[#22c55e]/80 transition-all duration-500",
                    isPro ? "flex-1" : "w-full"
                  )}
                  style={{ height: `${rH}%` }}
                  title={`Receita: ${formatCurrency(d.receita)}`}
                />
                {isPro && (
                  <div
                    className="flex-1 rounded-t-sm bg-[#ef4444]/60 transition-all duration-500"
                    style={{ height: `${eH}%` }}
                    title={`Despesas: ${formatCurrency(d.despesas)}`}
                  />
                )}
              </div>
              <span className="text-[10px] text-[#555] capitalize">{d.month}</span>
            </div>
          );
        })}
      </div>
      {isPro && (
        <div className="flex items-center gap-5 justify-center pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]/80" />
            <span className="text-[11px] text-[#666]">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]/60" />
            <span className="text-[11px] text-[#666]">Despesas</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart: Donut por Tipo de Serviço (Professional)
// ---------------------------------------------------------------------------

function DonutChart({ data }: { data: Record<string, number> | undefined }) {
  if (!data) {
    return (
      <div className="h-[130px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-[#555] text-center py-8">Sem dados registrados</p>
    );
  }

  const r = 52;
  const circ = 2 * Math.PI * r;
  let accumulated = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="flex-shrink-0">
        <svg width={128} height={128} viewBox="0 0 128 128">
          {/* Track */}
          <circle cx={64} cy={64} r={r} fill="none" stroke="#1a1a1a" strokeWidth={20} />
          {/* Segments */}
          {entries.map(([name, value], i) => {
            const pct = value / total;
            const dash = pct * circ;
            const dashOffset = circ / 4 - accumulated;
            accumulated += dash;
            return (
              <circle
                key={name}
                cx={64}
                cy={64}
                r={r}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={20}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
          {/* Center label */}
          <text x={64} y={60} textAnchor="middle" fontSize={9} fill="#666">
            Total
          </text>
          <text
            x={64}
            y={74}
            textAnchor="middle"
            fontSize={11}
            fontWeight="600"
            fill="#fff"
          >
            {shortCurrency(total)}
          </text>
        </svg>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {entries.map(([name, value], i) => (
          <div key={name} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-[11px] text-[#888] truncate flex-1">{name}</span>
            <span className="text-[11px] font-semibold text-white">
              {Math.round((value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart: Barras Horizontais por Forma de Pagamento (Professional)
// ---------------------------------------------------------------------------

function HorizontalBars({ data }: { data: Record<string, number> | undefined }) {
  if (!data) {
    return (
      <div className="h-[130px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#555] text-center py-8">Sem dados registrados</p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([name, value]) => (
        <div key={name} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#888]">{name}</span>
            <span className="text-[11px] font-semibold text-white">
              {formatCurrency(value)}
            </span>
          </div>
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22c55e]/70 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinanceiroPage() {
  const { data: session } = useSession();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"payments" | "expenses" | "overdue">("payments");
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [payForm, setPayForm] = useState({
    patientId: "",
    serviceTypeId: "",
    description: "",
    totalAmount: "",
    discountAmount: "0",
    modality: "AVISTA",
    installmentCount: "1",
    paymentMethod: "PIX",
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchData = useCallback(async () => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();

    const [pRes, tRes] = await Promise.all([
      fetch("/api/payments"),
      fetch(`/api/transactions?month=${month}&year=${year}`),
    ]);

    setPayments(await pRes.json());
    setTransactions(await tRes.json());
    setLoading(false);
  }, [currentMonth]);

  // Chart data: fetch once, independent of currentMonth
  useEffect(() => {
    fetch("/api/financeiro/charts")
      .then((r) => r.json())
      .then((d) => setChartData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    fetch("/api/service-types").then((r) => r.json()).then(setServiceTypes);
    fetch("/api/patients?status=active").then((r) => r.json()).then(setPatients);
  }, [fetchData]);

  function onServiceTypeChange(id: string) {
    const st = serviceTypes.find((s) => s.id === id);
    setPayForm((p) => ({
      ...p,
      serviceTypeId: id,
      totalAmount: st ? st.defaultPrice.toString() : p.totalAmount,
    }));
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payForm,
          totalAmount: parseFloat(payForm.totalAmount),
          discountAmount: parseFloat(payForm.discountAmount || "0"),
          installmentCount: parseInt(payForm.installmentCount),
        }),
      });
      if (res.ok) {
        toast({ title: "Pagamento registrado!", variant: "success" });
        setShowNewPayment(false);
        setPayForm({
          patientId: "",
          serviceTypeId: "",
          description: "",
          totalAmount: "",
          discountAmount: "0",
          modality: "AVISTA",
          installmentCount: "1",
          paymentMethod: "PIX",
          notes: "",
        });
        fetchData();
        // Refresh chart data too
        fetch("/api/financeiro/charts")
          .then((r) => r.json())
          .then(setChartData)
          .catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          date: expenseForm.date,
        }),
      });
      if (res.ok) {
        toast({ title: "Despesa registrada!", variant: "success" });
        setShowNewExpense(false);
        setExpenseForm({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
        });
        fetchData();
        fetch("/api/financeiro/charts")
          .then((r) => r.json())
          .then(setChartData)
          .catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(id: string) {
    if (!confirm("Excluir este pagamento? Esta ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Pagamento excluído.", variant: "success" });
      fetchData();
    } else {
      toast({ title: "Erro ao excluir pagamento.", variant: "error" });
    }
  }

  async function markPaymentPaid(id: string) {
    const res = await fetch(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) {
      toast({ title: "Pagamento marcado como pago!", variant: "success" });
      fetchData();
    } else {
      toast({ title: "Erro ao atualizar pagamento.", variant: "error" });
    }
  }

  async function markInstallment(id: string, status: string) {
    const res = await fetch(`/api/installments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast({ title: "Parcela atualizada!", variant: "success" });
      fetchData();
    }
  }

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const overdueInstallments = payments.flatMap((p) =>
    p.installments
      .filter((i) => i.status === "PENDING" && new Date(i.dueDate) < new Date())
      .map((i) => ({
        ...i,
        patientName: p.patient.name,
        serviceType: p.serviceType.name,
      }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-sm text-[#666] mt-1">Controle de receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowNewExpense(true)}>
            <TrendingDown className="h-4 w-4" />
            Nova Despesa
          </Button>
          <Button onClick={() => setShowNewPayment(true)}>
            <Plus className="h-4 w-4" />
            Novo Pagamento
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => {
            const d = new Date(currentMonth);
            d.setMonth(d.getMonth() - 1);
            setCurrentMonth(d);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-white min-w-[160px] text-center capitalize">
          {currentMonth.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => {
            const d = new Date(currentMonth);
            d.setMonth(d.getMonth() + 1);
            setCurrentMonth(d);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#666] font-medium">Receita</span>
              <StatCardIcon icon="trendingUp" variant="green" />
            </div>
            <p className="font-outfit text-2xl font-bold text-[#4ade80]">
              {formatCurrency(income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#666] font-medium">Despesas</span>
              <StatCardIcon icon="trendingDown" variant="red" />
            </div>
            <p className="font-outfit text-2xl font-bold text-[#f87171]">
              {formatCurrency(expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#666] font-medium">Lucro</span>
              <StatCardIcon icon="dollar" variant="blue" />
            </div>
            <p className="font-outfit text-2xl font-bold text-white">
              {formatCurrency(income - expenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts Section                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#555] uppercase tracking-wider">
            Visão Financeira
          </h2>
        </div>

        {/* Monthly bar chart — Essential + Professional */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Evolução dos Últimos 6 Meses
              </p>
              <p className="text-xs text-[#555] mt-0.5">
                {isPro ? "Receita e despesas por mês" : "Receita mensal"}
              </p>
            </div>
            {!isPro && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/20 flex-shrink-0">
                Essential
              </span>
            )}
          </div>
          <MonthlyChart data={chartData?.monthly} isPro={true} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-sm font-semibold text-white mb-4">
                Receita por Tipo de Serviço
              </p>
              <DonutChart data={chartData?.byServiceType} />
            </div>
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-sm font-semibold text-white mb-4">
                Receita por Forma de Pagamento
              </p>
              <HorizontalBars data={chartData?.byMethod} />
            </div>
          </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-1 border-b border-[#1e1e1e]">
        {[
          {
            key: "payments" as const,
            label: "Pagamentos",
            filledIcon: "receipt" as const,
            variant: "green" as const,
          },
          {
            key: "expenses" as const,
            label: "Despesas",
            filledIcon: "trendingDown" as const,
            variant: "red" as const,
          },
          {
            key: "overdue" as const,
            label: `Inadimplentes (${overdueInstallments.length})`,
            filledIcon: "alert" as const,
            variant: "amber" as const,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
              tab === t.key
                ? "border-[#22c55e] text-white"
                : "border-transparent text-[#666] hover:text-white"
            }`}
          >
            <GlassIcon
              icon={t.filledIcon}
              variant={tab === t.key ? t.variant : "green"}
              size="sm"
              className={tab !== t.key ? "opacity-40" : ""}
            />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === "payments" && (
            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-sm text-[#666] text-center py-8">
                  Nenhum pagamento registrado
                </p>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {p.patient.name}
                        </p>
                        <p className="text-xs text-[#666]">
                          {p.serviceType.name} · {paymentMethodLabels[p.paymentMethod] || p.paymentMethod} ·{" "}
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-outfit text-lg font-bold text-[#22c55e]">
                          {formatCurrency(p.finalAmount)}
                        </span>
                        <Badge
                          variant={
                            p.status === "PAID"
                              ? "paid"
                              : p.status === "PENDING"
                              ? "pending"
                              : "overdue"
                          }
                        >
                          {p.status === "PAID"
                            ? "Pago"
                            : p.status === "PENDING"
                            ? "Pendente"
                            : "Parcial"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#555] hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.status !== "PAID" && (
                              <DropdownMenuItem onClick={() => markPaymentPaid(p.id)} className="gap-2 text-[#22c55e]">
                                <CheckCircle className="h-4 w-4" /> Marcar como Pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => deletePayment(p.id)} className="gap-2 text-[#ef4444]">
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {p.installments.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-[#1e1e1e] pt-3">
                        {p.installments.map((inst) => (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-[#a1a1a1]">
                              Parcela {inst.installmentNumber} ·{" "}
                              {formatDate(inst.dueDate)} ·{" "}
                              {formatCurrency(inst.amount)}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  inst.status === "PAID"
                                    ? "paid"
                                    : new Date(inst.dueDate) < new Date()
                                    ? "overdue"
                                    : "pending"
                                }
                              >
                                {inst.status === "PAID"
                                  ? "Paga"
                                  : new Date(inst.dueDate) < new Date()
                                  ? "Atrasada"
                                  : "Pendente"}
                              </Badge>
                              {inst.status !== "PAID" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => markInstallment(inst.id, "PAID")}
                                >
                                  Pagar
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "expenses" && (
            <div className="space-y-2">
              {transactions.filter((t) => t.type === "EXPENSE").length === 0 ? (
                <p className="text-sm text-[#666] text-center py-8">
                  Nenhuma despesa registrada
                </p>
              ) : (
                transactions
                  .filter((t) => t.type === "EXPENSE")
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                    >
                      <div>
                        <p className="text-sm text-white">{t.description}</p>
                        <p className="text-xs text-[#666]">{formatDate(t.date)}</p>
                      </div>
                      <span className="font-outfit font-bold text-[#ef4444]">
                        -{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          )}

          {tab === "overdue" && (
            <div className="space-y-2">
              {overdueInstallments.length === 0 ? (
                <p className="text-sm text-[#666] text-center py-8">
                  Nenhuma parcela em atraso
                </p>
              ) : (
                overdueInstallments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#ef4444]/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {inst.patientName}
                      </p>
                      <p className="text-xs text-[#666]">
                        {inst.serviceType} · Parcela {inst.installmentNumber} ·
                        Vencimento: {formatDate(inst.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-outfit font-bold text-[#ef4444]">
                        {formatCurrency(inst.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markInstallment(inst.id, "PAID")}
                      >
                        Marcar Pago
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* New Payment Dialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={showNewPayment} onOpenChange={setShowNewPayment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
            <DialogDescription>Registre um pagamento</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select
                  value={payForm.patientId}
                  onValueChange={(v) => setPayForm((p) => ({ ...p, patientId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select
                  value={payForm.serviceTypeId}
                  onValueChange={onServiceTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - {formatCurrency(s.defaultPrice)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor Total *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payForm.totalAmount}
                  onChange={(e) =>
                    setPayForm((p) => ({ ...p, totalAmount: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payForm.discountAmount}
                  onChange={(e) =>
                    setPayForm((p) => ({ ...p, discountAmount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Final</Label>
                <Input
                  readOnly
                  value={formatCurrency(
                    (parseFloat(payForm.totalAmount) || 0) -
                      (parseFloat(payForm.discountAmount) || 0)
                  )}
                  className="bg-[#111]"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select
                  value={payForm.modality}
                  onValueChange={(v) => setPayForm((p) => ({ ...p, modality: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVISTA">À Vista</SelectItem>
                    <SelectItem value="PARCELADO">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payForm.modality === "PARCELADO" && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    min="2"
                    max="24"
                    value={payForm.installmentCount}
                    onChange={(e) =>
                      setPayForm((p) => ({ ...p, installmentCount: e.target.value }))
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={payForm.paymentMethod}
                  onValueChange={(v) =>
                    setPayForm((p) => ({ ...p, paymentMethod: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">Pix</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                    <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                    <SelectItem value="CASH">Dinheiro</SelectItem>
                    <SelectItem value="TRANSFER">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={payForm.notes}
                onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewPayment(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Registrar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* New Expense Dialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={showNewExpense} onOpenChange={setShowNewExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Registre uma despesa</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, description: e.target.value }))
                }
                required
                placeholder="Aluguel, materiais, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewExpense(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Registrar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
