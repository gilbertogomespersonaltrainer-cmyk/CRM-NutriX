"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { formatPhone } from "@/lib/utils";
import {
  Plus,
  Search,
  Users,
  UserX,
  Loader2,
  MessageCircle,
} from "lucide-react";

type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string;
  email: string | null;
  isActive: boolean;
  lastAppointmentAt: string | null;
  createdAt: string;
};

function PacientesContent() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showNew, setShowNew] = useState(searchParams.get("new") === "true");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    phone: "",
    email: "",
    address: "",
    howFoundUs: "",
    notes: "",
  });

  const fetchPatients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/patients?${params}`);
    const data = await res.json();
    setPatients(data);
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Paciente cadastrado!", variant: "success" });
        setShowNew(false);
        setForm({
          name: "",
          cpf: "",
          birthDate: "",
          phone: "",
          email: "",
          address: "",
          howFoundUs: "",
          notes: "",
        });
        fetchPatients();
      } else {
        toast({ title: "Erro ao cadastrar", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">
            Pacientes
          </h1>
          <p className="text-sm text-[#666] mt-1">
            Gerencie seus pacientes
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={filter === "active" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            <Users className="h-3.5 w-3.5" />
            Ativos
          </Button>
          <Button
            variant={filter === "inactive" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter("inactive")}
          >
            <UserX className="h-3.5 w-3.5" />
            Inativos
          </Button>
        </div>
      </div>

      {/* Patient List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#3b82f6]/10 to-[#2563eb]/5 border border-[#3b82f6]/15 flex items-center justify-center">
              <Users className="h-7 w-7 text-[#60a5fa]/50" strokeWidth={1.4} />
            </div>
            <p className="text-[#666]">Nenhum paciente encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#666]">
              {patients.length} paciente{patients.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/pacientes/${patient.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#22c55e]/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.06)]">
                      {patient.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-[#22c55e] transition-colors">
                        {patient.name}
                      </p>
                      <p className="text-xs text-[#666]">
                        {formatPhone(patient.phone)}
                        {patient.email && ` · ${patient.email}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://wa.me/55${patient.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-[#161616] border border-[#222] flex items-center justify-center hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 transition-all duration-200"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#4ade80]" strokeWidth={1.6} />
                    </a>
                    <Badge variant={patient.isActive ? "active" : "inactive"}>
                      {patient.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Patient Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados do paciente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  name="cpf"
                  value={form.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input
                  name="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Como conheceu?</Label>
                <Input
                  name="howFoundUs"
                  value={form.howFoundUs}
                  onChange={handleChange}
                  placeholder="Instagram, indicação..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Alergias, restrições alimentares, etc."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNew(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PacientesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" /></div>}>
      <PacientesContent />
    </Suspense>
  );
}
