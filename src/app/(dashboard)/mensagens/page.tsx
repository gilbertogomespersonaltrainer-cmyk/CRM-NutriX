"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { Search, X, Send, CheckSquare, Square, MessageCircle, Loader2 } from "lucide-react";

type PatientStage = "LEAD" | "FIRST_CONSULTATION" | "ACTIVE" | "INACTIVE" | "REACTIVATED";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  stage: PatientStage;
  tags: string[];
  howFoundUs: string | null;
};

const STAGE_LABELS: Record<PatientStage, { label: string; color: string }> = {
  LEAD:               { label: "Lead",        color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  FIRST_CONSULTATION: { label: "1ª Consulta", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  ACTIVE:             { label: "Ativo",        color: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/20" },
  INACTIVE:           { label: "Inativo",      color: "bg-red-500/15 text-red-400 border-red-500/20" },
  REACTIVATED:        { label: "Reativado",    color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
};

const STAGES: PatientStage[] = ["LEAD", "FIRST_CONSULTATION", "ACTIVE", "INACTIVE", "REACTIVATED"];

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

export default function MensagensPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStages, setSelectedStages] = useState<Set<PatientStage>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients");
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // All unique tags
  const allTags = Array.from(new Set(patients.flatMap((p) => p.tags))).sort();

  // Filtered patients based on filters + search
  const filteredPatients = patients.filter((p) => {
    if (selectedStages.size > 0 && !selectedStages.has(p.stage)) return false;
    if (selectedTags.size > 0 && !Array.from(selectedTags).some((t) => p.tags.includes(t))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.phone.includes(q)) return false;
    }
    return true;
  });

  function toggleStage(stage: PatientStage) {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function togglePatient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredPatients.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + variable);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.slice(0, start) + variable + message.slice(end);
    setMessage(newMessage);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      textarea.focus();
    }, 0);
  }

  const selectedPatients = patients.filter((p) => selectedIds.has(p.id));
  const previewPatient = selectedPatients[0];
  const previewMessage = previewPatient
    ? message.replace(/\{nome_paciente\}/g, previewPatient.name)
    : message;

  async function handleSend() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, patientIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(data);
        setShowConfirm(false);
        toast({
          title: `${data.sent} mensagens enviadas${data.failed > 0 ? `, ${data.failed} falhas` : ""}`,
          variant: data.failed > 0 ? "error" : "success",
        });
        if (data.sent > 0) {
          setSelectedIds(new Set());
          setMessage("");
        }
      } else {
        toast({ title: data.error || "Erro ao enviar mensagens", variant: "error" });
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">Mensagens em Massa</h1>
        <p className="text-sm text-[#666] mt-1">Envie mensagens para múltiplos pacientes via WhatsApp</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Filters + Patient list */}
        <div className="space-y-4">
          {/* Stage filters */}
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Filtrar por estágio</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((stage) => {
                const active = selectedStages.has(stage);
                const cfg = STAGE_LABELS[stage];
                return (
                  <button
                    key={stage}
                    onClick={() => toggleStage(stage)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active ? cfg.color : "bg-[#111] text-[#555] border-[#1e1e1e] hover:border-[#333] hover:text-[#888]"
                    }`}
                  >
                    {active ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Tag filters */}
            {allTags.length > 0 && (
              <>
                <p className="text-xs font-semibold text-[#666] uppercase tracking-wider pt-1">Filtrar por tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const active = selectedTags.has(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          active
                            ? "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30"
                            : "bg-[#111] text-[#555] border-[#1e1e1e] hover:border-[#333] hover:text-[#888]"
                        }`}
                      >
                        # {tag}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Patient list */}
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#1e1e1e] flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
                <input
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#22c55e]/30 transition-colors"
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={selectAll}
                  className="px-2 py-1.5 rounded-lg text-xs text-[#22c55e] hover:bg-[#22c55e]/5 border border-[#22c55e]/20 transition-colors"
                >
                  Todos
                </button>
                <button
                  onClick={clearSelection}
                  className="px-2 py-1.5 rounded-lg text-xs text-[#666] hover:text-white hover:bg-[#1a1a1a] border border-[#1e1e1e] transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
              <span className="text-xs text-[#555]">{filteredPatients.length} pacientes encontrados</span>
              <span className="text-xs text-[#22c55e] font-semibold">{selectedIds.size} selecionados</span>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <p className="text-sm text-[#555] text-center py-10">Nenhum paciente encontrado</p>
              ) : (
                filteredPatients.map((p) => {
                  const selected = selectedIds.has(p.id);
                  const stageCfg = STAGE_LABELS[p.stage];
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePatient(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#0d0d0d] hover:bg-[#111] transition-colors ${
                        selected ? "bg-[#22c55e]/[0.04]" : ""
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                        selected ? "bg-[#22c55e] border-[#22c55e]" : "border-[#333]"
                      }`}>
                        {selected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-xs flex-shrink-0">
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                        <p className="text-xs text-[#555]">{formatPhone(p.phone)}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${stageCfg.color}`}>
                        {stageCfg.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Message composer */}
        <div className="space-y-4">
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Mensagem</p>

            {/* Variable chips */}
            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-[#555] w-full">Variáveis disponíveis:</p>
              <button
                onClick={() => insertVariable("{nome_paciente}")}
                className="px-2.5 py-1 rounded-lg text-xs bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-colors font-mono"
              >
                {"{nome_paciente}"}
              </button>
            </div>

            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem... Use {nome_paciente} para personalizar."
              className="min-h-[160px] resize-none"
            />

            {/* Preview */}
            {message && previewPatient && (
              <div className="space-y-2">
                <p className="text-xs text-[#555]">Preview para <span className="text-[#888]">{previewPatient.name}</span>:</p>
                <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-[#22c55e] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#ccc] whitespace-pre-wrap">{previewMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Send button */}
            <Button
              className="w-full"
              disabled={selectedIds.size === 0 || !message.trim()}
              onClick={() => setShowConfirm(true)}
            >
              <Send className="h-4 w-4" />
              Enviar para {selectedIds.size} paciente{selectedIds.size !== 1 ? "s" : ""}
            </Button>

            {selectedIds.size === 0 && (
              <p className="text-xs text-[#555] text-center">Selecione ao menos um paciente</p>
            )}
          </div>

          {/* Result card */}
          {sendResult && (
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-3">Resultado do envio</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[#4ade80]">{sendResult.sent}</p>
                  <p className="text-xs text-[#666] mt-0.5">Enviadas</p>
                </div>
                <div className="bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[#f87171]">{sendResult.failed}</p>
                  <p className="text-xs text-[#666] mt-0.5">Falhas</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envio</DialogTitle>
            <DialogDescription>
              Você está prestes a enviar uma mensagem para <strong>{selectedIds.size} paciente{selectedIds.size !== 1 ? "s" : ""}</strong> via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-sm text-[#ccc] whitespace-pre-wrap">{message}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Confirmar envio
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
