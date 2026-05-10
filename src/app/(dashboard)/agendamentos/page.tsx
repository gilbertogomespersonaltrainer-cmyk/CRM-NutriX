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
import { formatDateTime } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";

type Appointment = {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  patient: { name: string; phone: string };
};

type Patient = {
  id: string;
  name: string;
};

const statusMap: Record<string, { label: string; variant: "active" | "pending" | "inactive" | "overdue" }> = {
  SCHEDULED: { label: "Agendada", variant: "active" },
  COMPLETED: { label: "Realizada", variant: "active" },
  CANCELLED: { label: "Cancelada", variant: "inactive" },
  NO_SHOW: { label: "Faltou", variant: "overdue" },
};

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [form, setForm] = useState({
    patientId: "",
    scheduledAt: "",
    duration: "50",
    notes: "",
  });

  const fetchAppointments = useCallback(async () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    if (view === "week") {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 7);
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    }

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const res = await fetch(`/api/appointments?${params}`);
    setAppointments(await res.json());
    setLoading(false);
  }, [currentDate, view]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetch("/api/patients?status=active")
      .then((r) => r.json())
      .then(setPatients);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          duration: parseInt(form.duration),
        }),
      });
      if (res.ok) {
        toast({ title: "Agendamento criado!", variant: "success" });
        setShowNew(false);
        setForm({ patientId: "", scheduledAt: "", duration: "50", notes: "" });
        fetchAppointments();
      } else {
        toast({ title: "Erro ao criar agendamento", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast({ title: "Status atualizado!", variant: "success" });
      fetchAppointments();
    }
  }

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  }

  const grouped = appointments.reduce(
    (acc, apt) => {
      const day = new Date(apt.scheduledAt).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
      if (!acc[day]) acc[day] = [];
      acc[day].push(apt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">
            Agendamentos
          </h1>
          <p className="text-sm text-[#666] mt-1">
            Gerencie suas consultas
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-white min-w-[200px] text-center">
            {currentDate.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button variant="secondary" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "week" ? "default" : "secondary"}
            size="sm"
            onClick={() => setView("week")}
          >
            Semana
          </Button>
          <Button
            variant={view === "month" ? "default" : "secondary"}
            size="sm"
            onClick={() => setView("month")}
          >
            Mês
          </Button>
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#06b6d4]/10 to-[#0891b2]/5 border border-[#06b6d4]/15 flex items-center justify-center">
              <Calendar className="h-7 w-7 text-[#22d3ee]/50" strokeWidth={1.4} />
            </div>
            <p className="text-[#666]">Nenhum agendamento neste período</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, apts]) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-sm capitalize">{day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {apts.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.06)]">
                        {apt.patient.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {apt.patient.name}
                        </p>
                        <p className="text-xs text-[#666]">
                          {formatDateTime(apt.scheduledAt)} · {apt.duration}min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusMap[apt.status]?.variant || "default"}>
                        {statusMap[apt.status]?.label || apt.status}
                      </Badge>
                      {apt.status === "SCHEDULED" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(apt.id, "COMPLETED")}
                            className="text-xs"
                          >
                            Realizada
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(apt.id, "NO_SHOW")}
                            className="text-xs text-[#f59e0b]"
                          >
                            Faltou
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(apt.id, "CANCELLED")}
                            className="text-xs text-[#ef4444]"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Appointment Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Agende uma nova consulta</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select
                value={form.patientId}
                onValueChange={(v) => setForm((p) => ({ ...p, patientId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, scheduledAt: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, duration: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
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
              <Button type="submit" disabled={saving || !form.patientId}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Agendar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
