"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Search, MoreVertical, Gift, Clock, UserPlus, Trash2 } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  clinicName: string | null;
  crn: string;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    expiresAt: string | null;
    plan: { id: string; name: string; priceMonthly: number };
  } | null;
  _count: { patients: number; appointments: number };
};

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
};

const STATUS_MAP: Record<string, { label: string; variant: "active" | "pending" | "overdue" | "inactive" }> = {
  ACTIVE: { label: "Ativo", variant: "active" },
  TRIAL: { label: "Em avaliação", variant: "pending" },
  PAST_DUE: { label: "Inadimplente", variant: "overdue" },
  CANCELLED: { label: "Cancelado", variant: "inactive" },
  EXPIRED: { label: "Expirado", variant: "inactive" },
};

export default function AssinantesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [giftExpiresAt, setGiftExpiresAt] = useState("");
  const [trialDays, setTrialDays] = useState(7);
  const [showGift, setShowGift] = useState(false);
  const [showExtend, setShowExtend] = useState(false);

  // Excluir conta
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  async function handleDelete() {
    if (!selected || deleteConfirmName !== selected.name) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selected.id }),
      });
      if (res.ok) {
        setTenants((prev) => prev.filter((t) => t.id !== selected.id));
        setShowDelete(false);
        setShowActions(false);
        setSelected(null);
        setDeleteConfirmName("");
        toast({ title: "Conta excluída permanentemente", variant: "success" });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Erro ao excluir conta", variant: "error" });
      }
    } finally {
      setDeleting(false);
    }
  }

  // Criar conta
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", email: "", phone: "", crn: "", clinicName: "", planId: "", trialDays: 14,
  });

  const fetchTenants = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/admin/tenants?${params}`);
    if (res.ok) setTenants(await res.json());
    setLoading(false);
  }, [search, filterStatus]);

  useEffect(() => {
    fetchTenants();
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then(setPlans);
  }, [fetchTenants]);

  async function handleAction(
    tenantId: string,
    action: string,
    extra?: { planId?: string; expiresAt?: string; trialDays?: number }
  ) {
    const res = await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, action, ...extra }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowActions(false);
      setShowGift(false);
      setShowExtend(false);
      setSelected(null);
      const labels: Record<string, string> = {
        activate: "Assinatura ativada",
        suspend: "Assinatura suspensa",
        cancel: "Assinatura cancelada",
        changePlan: "Plano alterado",
        giftSubscription: "Assinatura presenteada com sucesso",
        extendTrial: "Trial estendido com sucesso",
      };
      toast({ title: labels[action] || "Atualizado", variant: "success" });
    }
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.email || !createForm.phone || !createForm.crn) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "error" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Erro ao criar conta", variant: "error" });
        return;
      }
      toast({ title: `Conta criada! E-mail enviado para ${data.email}`, variant: "success" });
      setShowCreate(false);
      setCreateForm({ name: "", email: "", phone: "", crn: "", clinicName: "", planId: "", trialDays: 14 });
      fetchTenants();
    } finally {
      setCreating(false);
    }
  }

  const statusFilters = [
    { key: "", label: "Todos" },
    { key: "ACTIVE", label: "Ativos" },
    { key: "TRIAL", label: "Em avaliação" },
    { key: "PAST_DUE", label: "Inadimplentes" },
    { key: "CANCELLED", label: "Cancelados" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Assinantes</h1>
          <p className="text-sm text-[#666] mt-1">
            Gerencie todos os nutricionistas cadastrados
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Criar Conta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
          <Input
            placeholder="Buscar por nome, email ou clínica..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === f.key
                  ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                  : "text-[#666] hover:text-white hover:bg-[#111] border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="text-left text-xs text-[#666] font-medium px-4 py-3">Nutricionista</th>
                  <th className="text-left text-xs text-[#666] font-medium px-4 py-3">Plano</th>
                  <th className="text-left text-xs text-[#666] font-medium px-4 py-3">Status</th>
                  <th className="text-left text-xs text-[#666] font-medium px-4 py-3">Pacientes</th>
                  <th className="text-left text-xs text-[#666] font-medium px-4 py-3">Cadastro</th>
                  <th className="text-right text-xs text-[#666] font-medium px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-[#666]">
                      Nenhum assinante encontrado
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const sub = tenant.subscription;
                    const statusInfo = sub ? STATUS_MAP[sub.status] || STATUS_MAP.ACTIVE : null;

                    return (
                      <tr
                        key={tenant.id}
                        className="border-b border-[#1e1e1e] last:border-0 hover:bg-[#0d0d0d] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#22c55e]">
                                {tenant.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{tenant.name}</p>
                              <p className="text-xs text-[#666]">{tenant.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#a1a1a1]">
                            {sub ? `${sub.plan.name} · ${formatCurrency(sub.plan.priceMonthly)}/mês` : "Sem plano"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {statusInfo ? (
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          ) : (
                            <Badge variant="inactive">Sem assinatura</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#a1a1a1]">{tenant._count.patients}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#666]">{formatDate(tenant.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelected(tenant);
                              setShowGift(false);
                              setShowExtend(false);
                              setGiftExpiresAt("");
                              setTrialDays(7);
                              setShowActions(true);
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-[#161616] flex items-center justify-center transition-colors inline-flex"
                          >
                            <MoreVertical className="h-4 w-4 text-[#666]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Criar Conta Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Conta</DialogTitle>
            <DialogDescription>
              Cria uma conta e envia os dados de acesso por e-mail automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-[#666] font-medium">Nome completo *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Dra. Ana Silva"
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666] font-medium">E-mail *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nutricionista@email.com"
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[#666] font-medium">Telefone *</label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#666] font-medium">CRN *</label>
                <input
                  type="text"
                  value={createForm.crn}
                  onChange={(e) => setCreateForm((f) => ({ ...f, crn: e.target.value }))}
                  placeholder="CRN3-12345"
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666] font-medium">Nome da clínica <span className="text-[#444]">(opcional)</span></label>
              <input
                type="text"
                value={createForm.clinicName}
                onChange={(e) => setCreateForm((f) => ({ ...f, clinicName: e.target.value }))}
                placeholder="Clínica NutriVida"
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[#666] font-medium">Plano</label>
                <select
                  value={createForm.planId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, planId: e.target.value }))}
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
                >
                  <option value="">Padrão</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#666] font-medium">Dias de trial</label>
                <div className="flex gap-1">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, trialDays: d }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        createForm.trialDays === d
                          ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]"
                          : "border-[#2a2a2a] text-[#666] hover:text-white bg-[#161616]"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1"
              >
                {creating ? "Criando..." : "Criar e enviar e-mail"}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setDeleteConfirmName(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir conta permanentemente</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os dados do nutricionista serão apagados — pacientes, agendamentos, mensagens e financeiro.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-300">
                Você está prestes a excluir a conta de <strong>{selected.name}</strong> ({selected._count.patients} pacientes, {selected._count.appointments} agendamentos).
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#666] font-medium">
                  Digite <span className="text-white font-mono">{selected.name}</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={selected.name}
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirmName !== selected.name}
                  className="flex-1"
                >
                  {deleting ? "Excluindo..." : "Excluir permanentemente"}
                </Button>
                <Button variant="secondary" onClick={() => setShowDelete(false)} disabled={deleting}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Actions Dialog */}
      <Dialog open={showActions} onOpenChange={setShowActions}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Assinante</DialogTitle>
            <DialogDescription>
              {selected?.name} — {selected?.email}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Alterar Plano</p>
                <div className="grid grid-cols-1 gap-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handleAction(selected.id, "changePlan", { planId: plan.id })}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left ${
                        selected.subscription?.plan.id === plan.id
                          ? "border-[#22c55e]/30 bg-[#22c55e]/5"
                          : "border-[#1e1e1e] hover:border-[#333] bg-[#0d0d0d]"
                      }`}
                    >
                      <span className="text-sm text-white">{plan.name}</span>
                      <span className="text-xs text-[#666]">{formatCurrency(plan.priceMonthly)}/mês</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[#1e1e1e]" />

              {/* Presentear assinatura */}
              <div className="space-y-2">
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                  Presentear Assinatura
                </p>
                {!showGift ? (
                  <button
                    onClick={() => setShowGift(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 text-sm text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors w-full"
                  >
                    <Gift className="h-4 w-4" />
                    Dar acesso gratuito com data de expiração
                  </button>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
                    <p className="text-xs text-[#666]">Acesso ativo até:</p>
                    <input
                      type="date"
                      value={giftExpiresAt}
                      onChange={(e) => setGiftExpiresAt(e.target.value)}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!giftExpiresAt}
                        onClick={() =>
                          handleAction(selected.id, "giftSubscription", {
                            expiresAt: new Date(giftExpiresAt).toISOString(),
                          })
                        }
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowGift(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Estender trial */}
              <div className="space-y-2">
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider">
                  Estender Trial
                </p>
                {!showExtend ? (
                  <button
                    onClick={() => setShowExtend(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#3b82f6]/20 bg-[#3b82f6]/5 text-sm text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors w-full"
                  >
                    <Clock className="h-4 w-4" />
                    Adicionar dias de trial
                  </button>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
                    <p className="text-xs text-[#666]">Quantos dias adicionar:</p>
                    <div className="flex gap-2">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => setTrialDays(d)}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            trialDays === d
                              ? "border-[#3b82f6]/40 bg-[#3b82f6]/10 text-[#3b82f6]"
                              : "border-[#1e1e1e] text-[#666] hover:text-white"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleAction(selected.id, "extendTrial", { trialDays })
                        }
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowExtend(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-[#1e1e1e]" />

              <div className="space-y-2">
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Ações</p>
                <div className="flex flex-wrap gap-2">
                  {selected.subscription?.status !== "ACTIVE" && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(selected.id, "activate")}
                    >
                      Ativar
                    </Button>
                  )}
                  {selected.subscription?.status === "ACTIVE" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAction(selected.id, "suspend")}
                    >
                      Suspender
                    </Button>
                  )}
                  {selected.subscription?.status !== "CANCELLED" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleAction(selected.id, "cancel")}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              <div className="h-px bg-[#1e1e1e]" />

              <div className="space-y-2">
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Zona de Perigo</p>
                <button
                  onClick={() => { setDeleteConfirmName(""); setShowDelete(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir conta permanentemente
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
