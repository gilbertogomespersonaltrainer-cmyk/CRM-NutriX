"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  daysSince,
} from "@/lib/utils";
import { GlassIcon } from "@/components/ui/premium-icon";
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Loader2,
  UserX,
  UserCheck,
  Trash2,
} from "lucide-react";

type PatientDetail = {
  id: string;
  name: string;
  cpf: string | null;
  birthDate: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  howFoundUs: string | null;
  notes: string | null;
  isActive: boolean;
  lastAppointmentAt: string | null;
  createdAt: string;
  appointments: {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    notes: string | null;
  }[];
  payments: {
    id: string;
    totalAmount: number;
    finalAmount: number;
    status: string;
    createdAt: string;
    serviceType: { name: string };
    installments: { id: string; installmentNumber: number; amount: number; dueDate: string; status: string }[];
  }[];
  whatsAppLogs: {
    id: string;
    messageType: string;
    messageText: string;
    status: string;
    sentAt: string;
  }[];
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"appointments" | "payments" | "whatsapp">("appointments");
  const [editForm, setEditForm] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    phone: "",
    email: "",
    address: "",
    howFoundUs: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/patients/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setPatient(data);
        setEditForm({
          name: data.name || "",
          cpf: data.cpf || "",
          birthDate: data.birthDate ? data.birthDate.split("T")[0] : "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          howFoundUs: data.howFoundUs || "",
          notes: data.notes || "",
        });
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setPatient((prev) => prev ? { ...prev, ...updated } : prev);
        setShowEdit(false);
        toast({ title: "Paciente atualizado!", variant: "success" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    const res = await fetch(`/api/patients/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, isActive: !patient?.isActive }),
    });
    if (res.ok) {
      setPatient((prev) =>
        prev ? { ...prev, isActive: !prev.isActive } : prev
      );
      toast({
        title: patient?.isActive ? "Paciente inativado" : "Paciente reativado",
        variant: "success",
      });
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este paciente?")) return;
    const res = await fetch(`/api/patients/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Paciente excluído", variant: "success" });
      router.push("/pacientes");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return <p className="text-[#666]">Paciente não encontrado</p>;
  }

  const statusMap: Record<string, { label: string; variant: "active" | "pending" | "overdue" | "inactive" }> = {
    SCHEDULED: { label: "Agendada", variant: "active" },
    COMPLETED: { label: "Realizada", variant: "active" },
    CANCELLED: { label: "Cancelada", variant: "inactive" },
    NO_SHOW: { label: "Faltou", variant: "overdue" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-[#161616] border border-[#222] flex items-center justify-center hover:border-[#333] hover:bg-[#1a1a1a] transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 text-[#888]" strokeWidth={1.6} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-outfit text-2xl font-bold text-white">
              {patient.name}
            </h1>
            <Badge variant={patient.isActive ? "active" : "inactive"}>
              {patient.isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <p className="text-sm text-[#666]">
            Cadastrado em {formatDate(patient.createdAt)}
            {patient.lastAppointmentAt &&
              ` · Última consulta há ${daysSince(patient.lastAppointmentAt)} dias`}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://wa.me/55${patient.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleActive}>
            {patient.isActive ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {patient.isActive ? "Inativar" : "Reativar"}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Contato</p>
            <div className="space-y-2">
              <p className="text-sm text-white">{formatPhone(patient.phone)}</p>
              {patient.email && <p className="text-sm text-[#a1a1a1]">{patient.email}</p>}
              {patient.address && <p className="text-sm text-[#a1a1a1]">{patient.address}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Dados</p>
            <div className="space-y-2">
              {patient.cpf && <p className="text-sm text-[#a1a1a1]">CPF: {patient.cpf}</p>}
              {patient.birthDate && (
                <p className="text-sm text-[#a1a1a1]">
                  Nascimento: {formatDate(patient.birthDate)}
                </p>
              )}
              {patient.howFoundUs && (
                <p className="text-sm text-[#a1a1a1]">Origem: {patient.howFoundUs}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Observações</p>
            <p className="text-sm text-[#a1a1a1]">{patient.notes || "Nenhuma observação"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e1e]">
        {[
          { key: "appointments" as const, label: "Consultas", filledIcon: "calendar" as const, variant: "cyan" as const },
          { key: "payments" as const, label: "Pagamentos", filledIcon: "dollar" as const, variant: "emerald" as const },
          { key: "whatsapp" as const, label: "WhatsApp", filledIcon: "message" as const, variant: "green" as const },
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
            <GlassIcon icon={t.filledIcon} variant={t.variant} size="sm" className={tab !== t.key ? "opacity-40" : ""} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "appointments" && (
        <div className="space-y-2">
          {patient.appointments.length === 0 ? (
            <p className="text-sm text-[#666] text-center py-8">Nenhuma consulta registrada</p>
          ) : (
            patient.appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
              >
                <div>
                  <p className="text-sm text-white">{formatDateTime(apt.scheduledAt)}</p>
                  <p className="text-xs text-[#666]">{apt.duration}min{apt.notes ? ` · ${apt.notes}` : ""}</p>
                </div>
                <Badge variant={statusMap[apt.status]?.variant || "default"}>
                  {statusMap[apt.status]?.label || apt.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-2">
          {patient.payments.length === 0 ? (
            <p className="text-sm text-[#666] text-center py-8">Nenhum pagamento registrado</p>
          ) : (
            patient.payments.map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
              >
                <div>
                  <p className="text-sm text-white">{pay.serviceType.name}</p>
                  <p className="text-xs text-[#666]">
                    {formatCurrency(pay.finalAmount)} · {formatDate(pay.createdAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    pay.status === "PAID"
                      ? "paid"
                      : pay.status === "PENDING"
                      ? "pending"
                      : "overdue"
                  }
                >
                  {pay.status === "PAID"
                    ? "Pago"
                    : pay.status === "PENDING"
                    ? "Pendente"
                    : "Parcial"}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "whatsapp" && (
        <div className="space-y-2">
          {patient.whatsAppLogs.length === 0 ? (
            <p className="text-sm text-[#666] text-center py-8">Nenhuma mensagem enviada</p>
          ) : (
            patient.whatsAppLogs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={log.status === "SENT" ? "active" : "overdue"}>
                    {log.status === "SENT" ? "Enviada" : "Falhou"}
                  </Badge>
                  <span className="text-xs text-[#666]">
                    {formatDateTime(log.sentAt)}
                  </span>
                </div>
                <p className="text-sm text-[#a1a1a1]">{log.messageText}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>Atualize os dados do paciente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={editForm.cpf}
                  onChange={(e) => setEditForm((p) => ({ ...p, cpf: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
