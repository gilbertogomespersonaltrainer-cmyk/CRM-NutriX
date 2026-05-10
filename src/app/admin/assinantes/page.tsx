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
import { Search, MoreVertical } from "lucide-react";

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
  TRIAL: { label: "Trial", variant: "pending" },
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

  async function handleAction(tenantId: string, action: string, planId?: string) {
    const res = await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, action, planId }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowActions(false);
      setSelected(null);
      toast({
        title:
          action === "activate" ? "Assinatura ativada" :
          action === "suspend" ? "Assinatura suspensa" :
          action === "cancel" ? "Assinatura cancelada" :
          "Plano alterado",
        variant: "success",
      });
    }
  }

  const statusFilters = [
    { key: "", label: "Todos" },
    { key: "ACTIVE", label: "Ativos" },
    { key: "TRIAL", label: "Trial" },
    { key: "PAST_DUE", label: "Inadimplentes" },
    { key: "CANCELLED", label: "Cancelados" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">Assinantes</h1>
        <p className="text-sm text-[#666] mt-1">
          Gerencie todos os nutricionistas cadastrados
        </p>
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
                            onClick={() => { setSelected(tenant); setShowActions(true); }}
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

      {/* Actions Dialog */}
      <Dialog open={showActions} onOpenChange={setShowActions}>
        <DialogContent className="max-w-md">
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
                      onClick={() => handleAction(selected.id, "changePlan", plan.id)}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
