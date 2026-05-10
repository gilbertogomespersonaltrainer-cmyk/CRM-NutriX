"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { GlassIcon } from "@/components/ui/premium-icon";
import { Plus, Edit, Loader2 } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  maxPatients: number;
  maxWhatsApp: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  _count: { subscriptions: number };
};

const emptyForm = {
  id: "",
  name: "",
  description: "",
  priceMonthly: 0,
  maxPatients: 50,
  maxWhatsApp: 500,
  features: "",
  isActive: true,
  sortOrder: 0,
};

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setIsEditing(false);
    setShowForm(true);
  }

  function openEdit(plan: Plan) {
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || "",
      priceMonthly: plan.priceMonthly,
      maxPatients: plan.maxPatients,
      maxWhatsApp: plan.maxWhatsApp,
      features: plan.features.join("\n"),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setIsEditing(true);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      ...form,
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };

    const res = await fetch("/api/admin/plans", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const saved = await res.json();
      if (isEditing) {
        setPlans((prev) => prev.map((p) => (p.id === saved.id ? { ...saved, _count: p._count } : p)));
      } else {
        setPlans((prev) => [...prev, { ...saved, _count: { subscriptions: 0 } }]);
      }
      setShowForm(false);
      toast({ title: isEditing ? "Plano atualizado!" : "Plano criado!", variant: "success" });
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Planos</h1>
          <p className="text-sm text-[#666] mt-1">Configure os planos de assinatura</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.isActive ? "opacity-50" : ""}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <GlassIcon icon="receipt" size="md" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-xs text-[#666] mt-0.5">{plan.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(plan)}
                  className="w-8 h-8 rounded-lg hover:bg-[#161616] flex items-center justify-center transition-colors"
                >
                  <Edit className="h-3.5 w-3.5 text-[#666]" />
                </button>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">
                  {formatCurrency(plan.priceMonthly)}
                </span>
                <span className="text-sm text-[#666]">/mês</span>
              </div>

              <div className="flex gap-2">
                <Badge variant={plan.isActive ? "active" : "inactive"}>
                  {plan.isActive ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant="default">
                  {plan._count.subscriptions} assinantes
                </Badge>
              </div>

              <div className="h-px bg-[#1e1e1e]" />

              <div className="space-y-2">
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Limites</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]">
                    <p className="text-xs text-[#666]">Pacientes</p>
                    <p className="text-sm font-medium text-white">
                      {plan.maxPatients >= 999999 ? "Ilimitado" : plan.maxPatients}
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]">
                    <p className="text-xs text-[#666]">WhatsApp/mês</p>
                    <p className="text-sm font-medium text-white">
                      {plan.maxWhatsApp >= 999999 ? "Ilimitado" : plan.maxWhatsApp}
                    </p>
                  </div>
                </div>
              </div>

              {plan.features.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Recursos</p>
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                      <span className="text-xs text-[#a1a1a1]">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize os dados do plano" : "Configure um novo plano de assinatura"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Ex: Professional"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Mensal *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.priceMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, priceMonthly: parseFloat(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Breve descrição do plano"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. Pacientes</Label>
                <Input
                  type="number"
                  value={form.maxPatients}
                  onChange={(e) => setForm((p) => ({ ...p, maxPatients: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. WhatsApp/mês</Label>
                <Input
                  type="number"
                  value={form.maxWhatsApp}
                  onChange={(e) => setForm((p) => ({ ...p, maxWhatsApp: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recursos (um por linha)</Label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#22c55e]/50 resize-none"
                value={form.features}
                onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))}
                placeholder={"Até 50 pacientes\nPipeline Kanban\nAgendamentos"}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salvar" : "Criar Plano"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
