"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, X, Save, ShieldCheck } from "lucide-react";

type Admin = { id: string; name: string; email: string; createdAt: string };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" });
  const [newForm, setNewForm] = useState({ name: "", email: "", password: "" });
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(a: Admin) {
    setEditingId(a.id);
    setEditForm({ name: a.name, email: a.email, password: "" });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Erro ao salvar", variant: "error" }); return; }
      toast({ title: "Admin atualizado!", variant: "success" });
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  }

  async function deleteAdmin(id: string, name: string) {
    if (!confirm(`Excluir o admin "${name}"?`)) return;
    const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast({ title: data.error || "Erro ao excluir", variant: "error" }); return; }
    toast({ title: "Admin removido", variant: "success" });
    load();
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Erro ao criar", variant: "error" }); return; }
      toast({ title: "Admin criado!", variant: "success" });
      setNewForm({ name: "", email: "", password: "" });
      setShowNew(false);
      load();
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Administradores</h1>
          <p className="text-sm text-[#666] mt-1">Gerencie quem tem acesso ao painel admin</p>
        </div>
        {!showNew && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            Novo admin
          </Button>
        )}
      </div>

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-[#22c55e]" />
              Novo administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} placeholder="Senha de acesso" required minLength={6} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Criando..." : "Criar admin"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {admins.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-5">
              {editingId === a.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nova senha <span className="text-[#555] font-normal">(deixe em branco para não alterar)</span></Label>
                    <Input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Nova senha..." minLength={6} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(a.id)} disabled={saving}>
                      <Save className="h-4 w-4" />
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-[#22c55e]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{a.name}</p>
                      <p className="text-xs text-[#555]">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    {admins.length > 1 && (
                      <Button variant="danger" size="sm" onClick={() => deleteAdmin(a.id, a.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
