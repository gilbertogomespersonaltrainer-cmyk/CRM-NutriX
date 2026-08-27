"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, ChevronLeft, ChevronRight, Loader2, Calendar, X, Clock, ChevronsLeft, ChevronsRight } from "lucide-react";

type Appointment = {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  consultationType: string | null;
  appointmentModality: string | null;
  patient: { name: string; phone: string };
};

type Patient = {
  id: string;
  name: string;
};

const STATUS_COLORS: Record<string, { dot: string; label: string }> = {
  SCHEDULED: { dot: "bg-[#22c55e]", label: "Agendada" },
  COMPLETED: { dot: "bg-[#888]", label: "Realizada" },
  NO_SHOW:   { dot: "bg-[#f59e0b]", label: "Faltou" },
  CANCELLED: { dot: "bg-[#ef4444]", label: "Cancelada" },
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekStart(d: Date) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

const WEEK_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [nav, setNav] = useState(() => {
    const base = selected || today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const firstDay = new Date(nav.year, nav.month, 1).getDay();
  const daysInMonth = new Date(nav.year, nav.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(day: number) {
    const mm = String(nav.month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${nav.year}-${mm}-${dd}`);
    setOpen(false);
  }

  function goToday() {
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    onChange(`${today.getFullYear()}-${mm}-${dd}`);
    setNav({ year: today.getFullYear(), month: today.getMonth() });
    setOpen(false);
  }

  const displayLabel = selected
    ? selected.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "Selecione uma data";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#222] bg-[#0d0d0d] text-sm text-left hover:border-[#333] transition-colors"
      >
        <Calendar className="h-4 w-4 text-[#555] flex-shrink-0" />
        <span className={selected ? "text-white" : "text-[#555]"}>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-[#111] border border-[#1e1e1e] rounded-xl shadow-2xl p-2 select-none w-64">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center">
              <button type="button" onClick={() => setNav((n) => ({ ...n, year: n.year - 1 }))} className="w-5 h-5 rounded flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
                <ChevronsLeft className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => setNav((n) => n.month === 0 ? { year: n.year - 1, month: 11 } : { ...n, month: n.month - 1 })} className="w-5 h-5 rounded flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
                <ChevronLeft className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs font-semibold text-white capitalize">{MONTHS_PT[nav.month]} {nav.year}</span>
            <div className="flex items-center">
              <button type="button" onClick={() => setNav((n) => n.month === 11 ? { year: n.year + 1, month: 0 } : { ...n, month: n.month + 1 })} className="w-5 h-5 rounded flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
                <ChevronRight className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => setNav((n) => ({ ...n, year: n.year + 1 }))} className="w-5 h-5 rounded flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
                <ChevronsRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          {/* Dias da semana */}
          <div className="grid grid-cols-7">
            {WEEK_DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[9px] text-[#444] font-medium py-0.5">{d}</div>
            ))}
          </div>
          {/* Células */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isSel = day && selected && selected.getFullYear() === nav.year && selected.getMonth() === nav.month && selected.getDate() === day;
              const isTod = day && today.getFullYear() === nav.year && today.getMonth() === nav.month && today.getDate() === day;
              return (
                <div key={i} className="flex items-center justify-center py-0.5">
                  {day ? (
                    <button type="button" onClick={() => selectDay(day)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                        ${isSel ? "bg-[#22c55e] text-black font-bold" : isTod ? "border border-[#22c55e]/50 text-[#4ade80]" : "text-[#888] hover:bg-[#1a1a1a] hover:text-white"}`}>
                      {day}
                    </button>
                  ) : <span />}
                </div>
              );
            })}
          </div>
          {/* Hoje */}
          <div className="mt-1 pt-1 border-t border-[#1a1a1a] flex justify-center">
            <button type="button" onClick={goToday} className="text-[10px] text-[#555] hover:text-[#22c55e] transition-colors">Hoje</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    patientId: "",
    date: "",
    time: "",
    duration: "50",
    notes: "",
    consultationType: "",
    appointmentModality: "",
  });
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeServiceId, setCompleteServiceId] = useState("");
  const [completePaymentMethod, setCompletePaymentMethod] = useState("");
  const [completeAmount, setCompleteAmount] = useState("");
  const [completeDiscount, setCompleteDiscount] = useState("0");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<{ id: string; name: string; defaultPrice: number }[]>([]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    let start: Date, end: Date;
    if (view === "week") {
      start = getWeekStart(currentDate);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    } else {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    }

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });

    try {
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAppointments([]);
    }
    setLoading(false);
  }, [currentDate, view]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetch("/api/patients?status=active")
      .then((r) => r.json())
      .then((d) => setPatients(Array.isArray(d) ? d : []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setAppointmentTypes(d.appointmentTypes || []));
    fetch("/api/service-types")
      .then((r) => r.json())
      .then((d) => setServiceTypes(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const scheduledAt = form.date && form.time ? `${form.date}T${form.time}:00-03:00` : "";
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduledAt, duration: parseInt(form.duration) }),
      });
      if (res.ok) {
        toast({ title: "Agendamento criado!", variant: "success" });
        setShowNew(false);
        setForm({ patientId: "", date: "", time: "", duration: "50", notes: "", consultationType: "", appointmentModality: "" });
        fetchAppointments();
      } else {
        toast({ title: "Erro ao criar agendamento", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule() {
    if (!selectedApt || !rescheduleForm.date || !rescheduleForm.time) return;
    setRescheduleLoading(true);
    try {
      const scheduledAt = `${rescheduleForm.date}T${rescheduleForm.time}:00-03:00`;
      const res = await fetch(`/api/appointments/${selectedApt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt, sendConfirmation: true }),
      });
      if (res.ok) {
        toast({ title: "Reagendado! Nova confirmação enviada ao paciente.", variant: "success" });
        setSelectedApt(null);
        setRescheduling(false);
        setRescheduleForm({ date: "", time: "" });
        fetchAppointments();
      } else {
        toast({ title: "Erro ao reagendar", variant: "error" });
      }
    } finally {
      setRescheduleLoading(false);
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
      setSelectedApt(null);
      fetchAppointments();
    }
  }

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
    setSelectedDay(null);
  }

  // ─── Week view helpers ────────────────────────────────────────────────────
  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function aptsForDay(day: Date) {
    return appointments.filter((apt) => isSameDay(new Date(apt.scheduledAt), day));
  }

  function weekLabel() {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const startStr = weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }

  function monthLabel() {
    return currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  // ─── Month view helpers ────────────────────────────────────────────────────
  function buildMonthGrid() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const monthGrid = buildMonthGrid();
  const today = new Date();

  function closeAptModal() {
    setSelectedApt(null);
    setRescheduling(false);
    setRescheduleForm({ date: "", time: "" });
    setCompleting(false);
    setCompleteServiceId("");
    setCompletePaymentMethod("");
    setCompleteAmount("");
    setCompleteDiscount("0");
    setCompleteNotes("");
  }

  async function handleComplete() {
    if (!selectedApt || !completeServiceId || !completePaymentMethod) return;
    setCompleteLoading(true);
    try {
      const res = await fetch(`/api/appointments/${selectedApt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          serviceTypeId: completeServiceId,
          paymentMethod: completePaymentMethod,
          totalAmount: parseFloat(completeAmount) || undefined,
          discountAmount: parseFloat(completeDiscount) || 0,
          notes: completeNotes || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Consulta concluída e pagamento registrado!", variant: "success" });
        closeAptModal();
        fetchAppointments();
      } else {
        toast({ title: "Erro ao concluir consulta", variant: "error" });
      }
    } finally {
      setCompleteLoading(false);
    }
  }

  // Appointment detail modal
  const AptModal = selectedApt ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeAptModal}>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[selectedApt.status]?.dot || "bg-[#888]"}`} />
            <span className="text-sm font-medium text-[#888]">{STATUS_COLORS[selectedApt.status]?.label}</span>
          </div>
          <button onClick={closeAptModal} className="w-7 h-7 rounded-lg border border-[#222] flex items-center justify-center text-[#666] hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm">
              {selectedApt.patient.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{selectedApt.patient.name}</p>
              <p className="text-xs text-[#666]">{selectedApt.patient.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#888]">
            <Clock className="h-4 w-4 text-[#555]" />
            <span>{formatTime(selectedApt.scheduledAt)} · {selectedApt.duration}min</span>
          </div>
          {(selectedApt.consultationType || selectedApt.appointmentModality) && (
            <div className="flex flex-wrap gap-1.5">
              {selectedApt.consultationType && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#222] text-[#aaa]">
                  {selectedApt.consultationType}
                </span>
              )}
              {selectedApt.appointmentModality && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#222] text-[#aaa]">
                  {selectedApt.appointmentModality}
                </span>
              )}
            </div>
          )}
          {selectedApt.notes && (
            <p className="text-xs text-[#666] bg-[#0d0d0d] rounded-lg p-2.5 border border-[#1a1a1a]">{selectedApt.notes}</p>
          )}
        </div>
        {selectedApt.status === "SCHEDULED" && (
          <>
            {rescheduling ? (
              <div className="p-4 border-t border-[#1e1e1e] space-y-3">
                <p className="text-xs font-medium text-[#888]">Nova data e hora</p>
                <DatePicker value={rescheduleForm.date} onChange={(v) => setRescheduleForm((p) => ({ ...p, date: v }))} />
                {rescheduleForm.date && (
                  <p className="text-xs text-[#555]">
                    {new Date(`${rescheduleForm.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </p>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Hora</Label>
                  <Input
                    type="time"
                    value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    disabled={!rescheduleForm.date || !rescheduleForm.time || rescheduleLoading}
                    onClick={handleReschedule}
                  >
                    {rescheduleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar reagendamento"}
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs" onClick={() => setRescheduling(false)}>
                    Voltar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-[#1e1e1e] space-y-3">
                <p className="text-xs font-medium text-[#888] uppercase tracking-wide">Registrar pagamento</p>
                <Select value={completeServiceId} onValueChange={(v) => {
                  setCompleteServiceId(v);
                  const st = serviceTypes.find(s => s.id === v);
                  if (st) setCompleteAmount(st.defaultPrice.toFixed(2));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Serviço realizado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} — R$ {st.defaultPrice.toFixed(2).replace(".", ",")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#555] uppercase tracking-wide">Valor (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={completeAmount}
                      onChange={(e) => setCompleteAmount(e.target.value)}
                      placeholder="0,00"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#555] uppercase tracking-wide">Desconto (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={completeDiscount}
                      onChange={(e) => setCompleteDiscount(e.target.value)}
                      placeholder="0,00"
                      className="text-sm"
                    />
                  </div>
                </div>
                {completeAmount && (
                  <p className="text-xs text-[#22c55e] font-medium">
                    Total: R$ {(Math.max(0, parseFloat(completeAmount || "0") - parseFloat(completeDiscount || "0"))).toFixed(2).replace(".", ",")}
                  </p>
                )}
                <Select value={completePaymentMethod} onValueChange={setCompletePaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Forma de pagamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                    <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Observações (opcional)..."
                  className="text-sm"
                />
                <Button size="sm" className="w-full text-xs" disabled={!completeServiceId || !completePaymentMethod || !completeAmount || completeLoading} onClick={handleComplete}>
                  {completeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar como Realizada e Lançar"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs text-[#f59e0b] hover:text-[#f59e0b]" onClick={() => updateStatus(selectedApt.id, "NO_SHOW")}>
                    Faltou
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-xs text-[#ef4444] hover:text-[#ef4444]" onClick={() => updateStatus(selectedApt.id, "CANCELLED")}>
                    Cancelar
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const d = new Date(selectedApt.scheduledAt);
                    setRescheduleForm({
                      date: d.toISOString().slice(0, 10),
                      time: d.toTimeString().slice(0, 5),
                    });
                    setRescheduling(true);
                  }}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Reagendar
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Agendamentos</h1>
          <p className="text-sm text-[#666] mt-1">Gerencie suas consultas</p>
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
          <span className="text-sm font-medium text-white min-w-[260px] text-center">
            {view === "week" ? weekLabel() : monthLabel()}
          </span>
          <Button variant="secondary" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "week" ? "default" : "secondary"} size="sm" onClick={() => { setView("week"); setSelectedDay(null); }}>
            Semana
          </Button>
          <Button variant={view === "month" ? "default" : "secondary"} size="sm" onClick={() => { setView("month"); setSelectedDay(null); }}>
            Mês
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === "week" ? (
        /* ── Week View ── */
        <div className="border border-[#1e1e1e] rounded-2xl overflow-hidden bg-[#0a0a0a]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#1e1e1e]">
            {weekDays.map((day, i) => (
              <div key={i} className={`p-3 text-center border-r border-[#1e1e1e] last:border-r-0 ${isSameDay(day, today) ? "bg-[#22c55e]/5" : ""}`}>
                <p className="text-xs text-[#555] font-medium">{WEEK_DAYS[day.getDay()]}</p>
                <p className={`text-lg font-bold mt-0.5 ${isSameDay(day, today) ? "text-[#4ade80]" : "text-white"}`}>
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>
          {/* Day columns */}
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day, i) => {
              const dayApts = aptsForDay(day);
              return (
                <div key={i} className={`border-r border-[#1e1e1e] last:border-r-0 p-2 space-y-1.5 ${isSameDay(day, today) ? "bg-[#22c55e]/[0.02]" : ""}`}>
                  {dayApts.length === 0 ? (
                    <div className="h-16 rounded-lg bg-[#0d0d0d]/50 border border-dashed border-[#1a1a1a]" />
                  ) : (
                    dayApts.map((apt) => (
                      <button
                        key={apt.id}
                        onClick={() => setSelectedApt(apt)}
                        className="w-full text-left p-2 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[apt.status]?.dot || "bg-[#888]"}`} />
                          <span className="text-[10px] text-[#666] font-medium">{formatTime(apt.scheduledAt)}</span>
                        </div>
                        <p className="text-xs text-white font-medium truncate group-hover:text-[#4ade80] transition-colors">
                          {apt.patient.name}
                        </p>
                        {(apt.consultationType || apt.appointmentModality) && (
                          <p className="text-[9px] text-[#555] truncate mt-0.5">
                            {[apt.consultationType, apt.appointmentModality].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Month View ── */
        <div className="border border-[#1e1e1e] rounded-2xl overflow-hidden bg-[#0a0a0a]">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-[#1e1e1e]">
            {MONTH_DAYS.map((d) => (
              <div key={d} className="p-2 text-center border-r border-[#1e1e1e] last:border-r-0">
                <p className="text-xs text-[#555] font-medium">{d}</p>
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {monthGrid.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="border-r border-b border-[#1e1e1e] last:border-r-0 h-24 bg-[#070707]" />;
              }
              const dayApts = aptsForDay(day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`border-r border-b border-[#1e1e1e] last:border-r-0 h-28 p-2 text-left transition-colors hover:bg-[#0f0f0f] ${
                    isSelected ? "bg-[#22c55e]/5 border-[#22c55e]/20" : ""
                  } ${isToday ? "bg-[#22c55e]/[0.03]" : ""}`}
                >
                  <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday ? "bg-[#22c55e] text-black" : isCurrentMonth ? "text-white" : "text-[#333]"
                  }`}>
                    {day.getDate()}
                  </span>
                  {dayApts.length > 0 && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      {dayApts.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                          className="flex items-center gap-1 px-1 py-0.5 rounded bg-[#111] border border-[#1e1e1e] overflow-hidden cursor-pointer hover:border-[#22c55e]/40 hover:bg-[#22c55e]/5 transition-colors"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[apt.status]?.dot || "bg-[#888]"}`} />
                          <span className="text-[9px] text-[#aaa] truncate leading-tight">{apt.patient.name.split(" ")[0]}</span>
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <span className="text-[9px] text-[#555] pl-1">+{dayApts.length - 2} mais</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day expanded (month view) */}
      {view === "month" && selectedDay && (
        <div className="border border-[#1e1e1e] rounded-2xl bg-[#0a0a0a] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
            <p className="text-sm font-medium text-white capitalize">
              {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
            <button onClick={() => setSelectedDay(null)} className="w-7 h-7 rounded-lg border border-[#222] flex items-center justify-center text-[#666] hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4">
            {aptsForDay(selectedDay).length === 0 ? (
              <p className="text-sm text-[#555] text-center py-6">Nenhum agendamento neste dia</p>
            ) : (
              <div className="space-y-2">
                {aptsForDay(selectedDay).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedApt(apt)}
                    className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-xs">
                      {apt.patient.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-[#4ade80] transition-colors">{apt.patient.name}</p>
                      <p className="text-xs text-[#666]">{formatTime(apt.scheduledAt)} · {apt.duration}min</p>
                      {(apt.consultationType || apt.appointmentModality) && (
                        <p className="text-xs text-[#555] truncate mt-0.5">
                          {[apt.consultationType, apt.appointmentModality].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[apt.status]?.dot || "bg-[#888]"}`} />
                      <span className="text-xs text-[#666]">{STATUS_COLORS[apt.status]?.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {AptModal}

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
              <Select value={form.patientId} onValueChange={(v) => setForm((p) => ({ ...p, patientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <DatePicker value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
              {form.date && (
                <p className="text-xs text-[#555]">
                  Selecionado: {new Date(`${form.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Hora *</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Atendimento</Label>
              <p className="text-[11px] text-[#555]">Propósito da consulta — ex: Primeira Consulta, Retorno, Reavaliação</p>
              {appointmentTypes.length > 0 ? (
                <Select
                  value={form.consultationType}
                  onValueChange={(v) => setForm((p) => ({ ...p, consultationType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de atendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.consultationType}
                  onChange={(e) => setForm((p) => ({ ...p, consultationType: e.target.value }))}
                  placeholder="Ex: Primeira Consulta, Retorno, Reavaliação..."
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <p className="text-[11px] text-[#555]">Meio de realização — Presencial, Online ou Híbrido</p>
              <Select
                value={form.appointmentModality}
                onValueChange={(v) => setForm((p) => ({ ...p, appointmentModality: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a modalidade (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.patientId}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agendar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
