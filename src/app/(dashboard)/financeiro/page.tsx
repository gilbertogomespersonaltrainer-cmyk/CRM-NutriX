"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCardIcon, GlassIcon } from "@/components/ui/premium-icon";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

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

export default function FinanceiroPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
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
      }
    } finally {
      setSaving(false);
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
      .map((i) => ({ ...i, patientName: p.patient.name, serviceType: p.serviceType.name }))
  );

  return (
    <div className="space-y-6">
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
        <Button variant="secondary" size="icon" onClick={() => {
          const d = new Date(currentMonth);
          d.setMonth(d.getMonth() - 1);
          setCurrentMonth(d);
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-white min-w-[160px] text-center capitalize">
          {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <Button variant="secondary" size="icon" onClick={() => {
          const d = new Date(currentMonth);
          d.setMonth(d.getMonth() + 1);
          setCurrentMonth(d);
        }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e1e]">
        {[
          { key: "payments" as const, label: "Pagamentos", filledIcon: "receipt" as const, variant: "green" as const },
          { key: "expenses" as const, label: "Despesas", filledIcon: "trendingDown" as const, variant: "red" as const },
          { key: "overdue" as const, label: `Inadimplentes (${overdueInstallments.length})`, filledIcon: "alert" as const, variant: "amber" as const },
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
            <GlassIcon icon={t.filledIcon} variant={tab === t.key ? t.variant : "green"} size="sm" className={tab !== t.key ? "opacity-40" : ""} />
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
                <p className="text-sm text-[#666] text-center py-8">Nenhum pagamento registrado</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{p.patient.name}</p>
                        <p className="text-xs text-[#666]">
                          {p.serviceType.name} · {p.paymentMethod} · {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-outfit text-lg font-bold text-[#22c55e]">
                          {formatCurrency(p.finalAmount)}
                        </span>
                        <Badge
                          variant={p.status === "PAID" ? "paid" : p.status === "PENDING" ? "pending" : "overdue"}
                        >
                          {p.status === "PAID" ? "Pago" : p.status === "PENDING" ? "Pendente" : "Parcial"}
                        </Badge>
                      </div>
                    </div>
                    {p.installments.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-[#1e1e1e] pt-3">
                        {p.installments.map((inst) => (
                          <div key={inst.id} className="flex items-center justify-between text-xs">
                            <span className="text-[#a1a1a1]">
                              Parcela {inst.installmentNumber} · {formatDate(inst.dueDate)} · {formatCurrency(inst.amount)}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={inst.status === "PAID" ? "paid" : new Date(inst.dueDate) < new Date() ? "overdue" : "pending"}
                              >
                                {inst.status === "PAID" ? "Paga" : new Date(inst.dueDate) < new Date() ? "Atrasada" : "Pendente"}
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
                <p className="text-sm text-[#666] text-center py-8">Nenhuma despesa registrada</p>
              ) : (
                transactions
                  .filter((t) => t.type === "EXPENSE")
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]">
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
                <p className="text-sm text-[#666] text-center py-8">Nenhuma parcela em atraso</p>
              ) : (
                overdueInstallments.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#ef4444]/20">
                    <div>
                      <p className="text-sm font-medium text-white">{inst.patientName}</p>
                      <p className="text-xs text-[#666]">
                        {inst.serviceType} · Parcela {inst.installmentNumber} · Vencimento: {formatDate(inst.dueDate)}
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

      {/* New Payment Dialog */}
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
                <Select value={payForm.patientId} onValueChange={(v) => setPayForm((p) => ({ ...p, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select value={payForm.serviceTypeId} onValueChange={onServiceTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {serviceTypes.filter((s) => s.isActive).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} - {formatCurrency(s.defaultPrice)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor Total *</Label>
                <Input type="number" step="0.01" value={payForm.totalAmount} onChange={(e) => setPayForm((p) => ({ ...p, totalAmount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Desconto</Label>
                <Input type="number" step="0.01" value={payForm.discountAmount} onChange={(e) => setPayForm((p) => ({ ...p, discountAmount: e.target.value }))} />
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
                <Select value={payForm.modality} onValueChange={(v) => setPayForm((p) => ({ ...p, modality: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVISTA">À Vista</SelectItem>
                    <SelectItem value="PARCELADO">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payForm.modality === "PARCELADO" && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input type="number" min="2" max="24" value={payForm.installmentCount} onChange={(e) => setPayForm((p) => ({ ...p, installmentCount: e.target.value }))} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={payForm.paymentMethod} onValueChange={(v) => setPayForm((p) => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Textarea value={payForm.notes} onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowNewPayment(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Expense Dialog */}
      <Dialog open={showNewExpense} onOpenChange={setShowNewExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Registre uma despesa</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} required placeholder="Aluguel, materiais, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowNewExpense(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
