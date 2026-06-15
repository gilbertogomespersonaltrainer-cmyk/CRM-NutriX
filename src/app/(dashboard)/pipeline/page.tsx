"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatPhone, isLidPhone } from "@/lib/utils";
import { GlassIcon } from "@/components/ui/premium-icon";
import {
  Search,
  MessageCircle,
  GripVertical,
  SlidersHorizontal,
  X,
  Plus,
  GripVertical as Grip,
  Eye,
  EyeOff,
  Pencil,
  Check,
  Trash2,
} from "lucide-react";

type PatientStage = "LEAD" | "FIRST_CONSULTATION" | "ACTIVE" | "INACTIVE" | "REACTIVATED";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  stage: PatientStage;
  tags: string[];
  howFoundUs: string | null;
  lastAppointmentAt: string | null;
  createdAt: string;
};

type ColumnConfig = {
  key: string; // PatientStage or "CUSTOM_xxx"
  label: string;
  visible: boolean;
  isCustom?: boolean;
  filledIcon: "userPlus" | "users" | "userCheck" | "userX" | "refresh";
  variant: "purple" | "blue" | "green" | "red" | "amber";
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "LEAD", label: "Lead", visible: true, filledIcon: "userPlus", variant: "purple" },
  { key: "FIRST_CONSULTATION", label: "1ª Consulta", visible: true, filledIcon: "users", variant: "blue" },
  { key: "ACTIVE", label: "Ativo", visible: true, filledIcon: "userCheck", variant: "green" },
  { key: "INACTIVE", label: "Inativo", visible: true, filledIcon: "userX", variant: "red" },
];

const CHANNEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  instagram:   { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
  google:      { bg: "bg-blue-500/10",   text: "text-blue-400",   dot: "bg-blue-400"   },
  indicação:   { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400"  },
  indicacao:   { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400"  },
  whatsapp:    { bg: "bg-teal-500/10",   text: "text-teal-400",   dot: "bg-teal-400"   },
  facebook:    { bg: "bg-blue-600/10",   text: "text-blue-300",   dot: "bg-blue-300"   },
  tiktok:      { bg: "bg-pink-500/10",   text: "text-pink-400",   dot: "bg-pink-400"   },
  youtube:     { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400"    },
};

const TAG_PALETTE = [
  "bg-[#22c55e]/10 text-[#4ade80] border-[#22c55e]/20",
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
];

function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

function channelStyle(channel: string | null) {
  if (!channel) return null;
  const key = channel.toLowerCase().trim();
  for (const k of Object.keys(CHANNEL_COLORS)) {
    if (key.includes(k)) return { ...CHANNEL_COLORS[k], label: channel };
  }
  return { bg: "bg-[#222]", text: "text-[#888]", dot: "bg-[#888]", label: channel };
}

const CUSTOM_POSITIONS_KEY = "nutrix_custom_positions";

// Guarda também o stage do paciente no momento em que foi movido para a coluna
// customizada — se o stage mudar depois (automação do Pipeline), a posição
// customizada é descartada e o card volta a seguir o stage atual.
type CustomPosition = { col: string; stage: string };

function loadCustomPositions(): Record<string, CustomPosition> {
  try {
    const saved = localStorage.getItem(CUSTOM_POSITIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, string | CustomPosition>;
      const migrated: Record<string, CustomPosition> = {};
      for (const [pid, val] of Object.entries(parsed)) {
        // Migra formato antigo (Record<string, string>): stage vazio é preenchido no próximo fetch
        migrated[pid] = typeof val === "string" ? { col: val, stage: "" } : val;
      }
      return migrated;
    }
  } catch {}
  return {};
}

function saveCustomPositions(positions: Record<string, CustomPosition>) {
  localStorage.setItem(CUSTOM_POSITIONS_KEY, JSON.stringify(positions));
}

function loadColumns(): ColumnConfig[] {
  try {
    const saved = localStorage.getItem("nutrix_pipeline_columns");
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnConfig[];
      // Merge defaults with saved (preserving label/visible), then append custom cols
      const merged = DEFAULT_COLUMNS.map((def) => {
        const found = parsed.find((p) => p.key === def.key);
        return found ? { ...def, label: found.label, visible: found.visible } : def;
      });
      const customCols = parsed.filter((p) => p.isCustom);
      return [...merged, ...customCols];
    }
  } catch {}
  return DEFAULT_COLUMNS;
}

function saveColumns(cols: ColumnConfig[]) {
  localStorage.setItem("nutrix_pipeline_columns", JSON.stringify(cols));
}

function generateCustomKey(existing: ColumnConfig[]): string {
  const customNums = existing
    .filter((c) => c.isCustom && c.key.startsWith("CUSTOM_"))
    .map((c) => parseInt(c.key.replace("CUSTOM_", "")) || 0);
  const max = customNums.length > 0 ? Math.max(...customNums) : 0;
  return `CUSTOM_${max + 1}`;
}

// ─── Patient Card ────────────────────────────────────────────────────────────
function PatientCard({
  patient,
  onDragStart,
}: {
  patient: Patient;
  onDragStart: (e: React.DragEvent, patientId: string) => void;
}) {
  const ch = channelStyle(patient.howFoundUs);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, patient.id)}
      className="group bg-[#111] border border-[#1e1e1e] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#333] transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <GripVertical className="h-4 w-4 text-[#2a2a2a] mt-0.5 shrink-0 group-hover:text-[#444]" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <Link
            href={`/pacientes/${patient.id}`}
            className="text-sm font-medium text-white hover:text-[#22c55e] transition-colors block truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {patient.name}
          </Link>
          <p className="text-xs text-[#555] mt-0.5 truncate">{formatPhone(patient.phone)}</p>

          {ch && (
            <div className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-transparent ${ch.bg} ${ch.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ch.dot}`} />
              {ch.label}
            </div>
          )}

          {patient.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {patient.tags.slice(0, 3).map((tag) => (
                <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${tagColor(tag)}`}>
                  {tag}
                </span>
              ))}
              {patient.tags.length > 3 && (
                <span className="text-[10px] text-[#555]">+{patient.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {!isLidPhone(patient.phone) && (
          <a
            href={`https://wa.me/55${patient.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-lg bg-[#161616] border border-[#222] flex items-center justify-center hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 transition-all duration-200 shrink-0"
            title="WhatsApp"
          >
            <MessageCircle className="h-3 w-3 text-[#4ade80]" strokeWidth={1.6} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Stage Column ─────────────────────────────────────────────────────────────
function StageColumn({
  col,
  patients,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  col: ColumnConfig;
  patients: Patient[];
  onDragStart: (e: React.DragEvent, patientId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, colKey: string) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-xl border transition-colors ${
        isDragOver ? "border-[#22c55e]/50 bg-[#22c55e]/5" : "border-[#1e1e1e] bg-[#0a0a0a]"
      }`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, col.key)}
    >
      <div className="p-3 border-b border-[#1e1e1e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GlassIcon icon={col.filledIcon} variant={col.variant} size="sm" />
            <span className="text-sm font-medium text-white">{col.label}</span>
            {col.isCustom && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#555] border border-[#2a2a2a]">custom</span>
            )}
          </div>
          <span className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md bg-[#161616] border border-[#222] text-[#888]">
            {patients.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {patients.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#444]">Nenhum paciente</p>
          </div>
        ) : (
          patients.map((p) => (
            <PatientCard key={p.id} patient={p} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({
  columns,
  onSave,
  onClose,
}: {
  columns: ColumnConfig[];
  onSave: (cols: ColumnConfig[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ColumnConfig[]>(columns.map((c) => ({ ...c })));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function toggleVisible(key: string) {
    setDraft((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  }

  function startEdit(col: ColumnConfig) {
    setEditingKey(col.key);
    setEditValue(col.label);
  }

  function confirmEdit(key: string) {
    if (editValue.trim()) {
      setDraft((prev) => prev.map((c) => (c.key === key ? { ...c, label: editValue.trim() } : c)));
    }
    setEditingKey(null);
  }

  function resetDefaults() {
    const customCols = draft.filter((c) => c.isCustom);
    setDraft([...DEFAULT_COLUMNS.map((c) => ({ ...c })), ...customCols]);
  }

  function addCustomColumn() {
    const newKey = generateCustomKey(draft);
    const newCol: ColumnConfig = {
      key: newKey,
      label: "Nova Coluna",
      visible: true,
      isCustom: true,
      filledIcon: "userPlus",
      variant: "purple",
    };
    setDraft((prev) => [...prev, newCol]);
    setEditingKey(newKey);
    setEditValue("Nova Coluna");
  }

  function deleteCustomColumn(key: string) {
    setDraft((prev) => prev.filter((c) => c.key !== key));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#1e1e1e]">
          <div>
            <h2 className="font-outfit text-lg font-bold text-white">Configurar Pipeline</h2>
            <p className="text-xs text-[#666] mt-0.5">Renomeie, oculte ou crie novas colunas</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#222] flex items-center justify-center text-[#666] hover:text-white hover:border-[#333] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {draft.map((col) => (
            <div key={col.key} className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
              <Grip className="h-4 w-4 text-[#333]" />
              <GlassIcon icon={col.filledIcon} variant={col.variant} size="sm" />

              {editingKey === col.key ? (
                <input
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-md px-2 py-1 text-sm text-white outline-none focus:border-[#22c55e]/50"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit(col.key);
                    if (e.key === "Escape") setEditingKey(null);
                  }}
                  autoFocus
                />
              ) : (
                <span className={`flex-1 text-sm ${col.visible ? "text-white" : "text-[#444] line-through"}`}>
                  {col.label}
                  {col.isCustom && <span className="ml-1.5 text-[9px] text-[#555]">custom</span>}
                </span>
              )}

              <div className="flex items-center gap-1">
                {editingKey === col.key ? (
                  <button onClick={() => confirmEdit(col.key)} className="w-7 h-7 rounded-md border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button onClick={() => startEdit(col)} className="w-7 h-7 rounded-md border border-[#222] flex items-center justify-center text-[#555] hover:text-white hover:border-[#333] transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}

                {col.isCustom ? (
                  <button onClick={() => deleteCustomColumn(col.key)} className="w-7 h-7 rounded-md border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444]/60 hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : (
                  <button onClick={() => toggleVisible(col.key)} className="w-7 h-7 rounded-md border border-[#222] flex items-center justify-center text-[#555] hover:text-white hover:border-[#333] transition-colors">
                    {col.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add new column button */}
          <button
            onClick={addCustomColumn}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-[#2a2a2a] text-[#555] hover:text-[#888] hover:border-[#333] transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Nova coluna
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[#1e1e1e]">
          <button onClick={resetDefaults} className="text-xs text-[#555] hover:text-[#888] transition-colors">
            Restaurar padrão
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => { onSave(draft); onClose(); }}>Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [activeChannelFilter, setActiveChannelFilter] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<Record<string, CustomPosition>>({});
  const dragPatientId = useRef<string | null>(null);

  // Load column config and custom positions from localStorage
  useEffect(() => {
    setColumns(loadColumns());
    setCustomPositions(loadCustomPositions());
  }, []);

  const fetchPatients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("includeLeads", "true");
    const res = await fetch(`/api/patients?${params}`);
    if (res.ok) {
      const data: Patient[] = await res.json();
      setPatients(data);

      // Reconcilia posições customizadas: se o stage do paciente mudou desde que
      // foi colocado na coluna customizada (ex: automação do Pipeline avançou o
      // estágio), remove a posição customizada para o card seguir o novo stage.
      setCustomPositions((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const p of data) {
          const cp = next[p.id];
          if (!cp) continue;
          if (!cp.stage) {
            next[p.id] = { ...cp, stage: p.stage };
            changed = true;
          } else if (cp.stage !== p.stage) {
            delete next[p.id];
            changed = true;
          }
        }
        if (changed) saveCustomPositions(next);
        return changed ? next : prev;
      });
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // All tags and channels for filter chips
  const allTags = Array.from(new Set(patients.flatMap((p) => p.tags))).sort();
  const allChannels = Array.from(new Set(patients.map((p) => p.howFoundUs).filter(Boolean) as string[])).sort();

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    if (activeTagFilter && !p.tags.includes(activeTagFilter)) return false;
    if (activeChannelFilter && p.howFoundUs !== activeChannelFilter) return false;
    return true;
  });

  function handleDragStart(e: React.DragEvent, patientId: string) {
    dragPatientId.current = patientId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(colKey);
  }

  async function handleDrop(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    setDragOverKey(null);
    const patientId = dragPatientId.current;
    if (!patientId) return;

    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    const col = columns.find((c) => c.key === colKey);
    if (!col) return;

    if (col.isCustom) {
      // Custom column: update custom position in localStorage
      const prevCustomKey = customPositions[patientId]?.col;
      if (prevCustomKey === colKey) return;

      const newPositions = { ...customPositions, [patientId]: { col: colKey, stage: patient.stage } };
      setCustomPositions(newPositions);
      saveCustomPositions(newPositions);
      toast({ title: `${patient.name} movido para ${col.label}`, variant: "success" });
    } else {
      // Standard column: remove custom position if any, update stage via API
      const newStage = colKey as PatientStage;
      const prevCustomKey = customPositions[patientId];
      const wasInCustom = !!prevCustomKey;

      if (!wasInCustom && patient.stage === newStage) return;

      // Remove from custom positions if coming from custom column
      if (wasInCustom) {
        const newPositions = { ...customPositions };
        delete newPositions[patientId];
        setCustomPositions(newPositions);
        saveCustomPositions(newPositions);
      }

      // Optimistically update
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, stage: newStage } : p)));

      try {
        const res = await fetch(`/api/patients/${patientId}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
        if (!res.ok) throw new Error();
        toast({ title: `${patient.name} movido para ${col.label}`, variant: "success" });
      } catch {
        // Revert
        setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, stage: patient.stage } : p)));
        if (!wasInCustom) {
          // Restore custom position if we removed it
        }
        toast({ title: "Erro ao mover paciente", variant: "error" });
      }
    }
  }

  function handleSaveColumns(cols: ColumnConfig[]) {
    setColumns(cols);
    saveColumns(cols);
    // Clean up custom positions for deleted custom columns
    const existingCustomKeys = new Set(cols.filter((c) => c.isCustom).map((c) => c.key));
    const cleanPositions: Record<string, CustomPosition> = {};
    for (const [pid, pos] of Object.entries(customPositions)) {
      if (existingCustomKeys.has(pos.col)) cleanPositions[pid] = pos;
    }
    setCustomPositions(cleanPositions);
    saveCustomPositions(cleanPositions);
    toast({ title: "Pipeline atualizado!", variant: "success" });
  }

  const visibleColumns = columns.filter((c) => c.visible);

  // Group patients: custom positions take priority over stage
  const grouped = columns.reduce(
    (acc, col) => {
      if (col.isCustom) {
        // Custom column: patients whose customPositions[id].col === col.key
        acc[col.key] = filteredPatients.filter((p) => customPositions[p.id]?.col === col.key);
      } else {
        // Standard column: patients in this stage AND not in a custom column
        // REACTIVATED patients are shown alongside ACTIVE (same column)
        acc[col.key] = filteredPatients.filter((p) => {
          if (customPositions[p.id]) return false;
          if (col.key === "ACTIVE") return p.stage === "ACTIVE" || p.stage === "REACTIVATED";
          return p.stage === col.key;
        });
      }
      return acc;
    },
    {} as Record<string, Patient[]>
  );

  const hasFilters = activeTagFilter || activeChannelFilter;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-[#666] mt-1">Acompanhe a jornada dos seus pacientes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
            <Input
              placeholder="Buscar paciente..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#1e1e1e] text-[#888] hover:text-white hover:border-[#333] transition-colors text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Configurar
          </button>
        </div>
      </div>

      {/* Filtros */}
      {(allTags.length > 0 || allChannels.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#555] font-medium">Filtrar:</span>

          {allChannels.map((ch) => {
            const style = channelStyle(ch);
            const active = activeChannelFilter === ch;
            return (
              <button
                key={ch}
                onClick={() => setActiveChannelFilter(active ? null : ch)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? `${style?.bg} ${style?.text} border-current`
                    : "bg-[#111] text-[#666] border-[#1e1e1e] hover:border-[#333] hover:text-white"
                }`}
              >
                {style && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                {ch}
              </button>
            );
          })}

          {allTags.slice(0, 8).map((tag) => {
            const active = activeTagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(active ? null : tag)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? tagColor(tag)
                    : "bg-[#111] text-[#666] border-[#1e1e1e] hover:border-[#333] hover:text-white"
                }`}
              >
                # {tag}
              </button>
            );
          })}

          {hasFilters && (
            <button
              onClick={() => { setActiveTagFilter(null); setActiveChannelFilter(null); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-[#ef4444] border border-[#ef4444]/20 bg-[#ef4444]/5 hover:bg-[#ef4444]/10 transition-colors"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          onDragLeave={() => setDragOverKey(null)}
        >
          {visibleColumns.map((col) => (
            <StageColumn
              key={col.key}
              col={col}
              patients={grouped[col.key] || []}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDrop={handleDrop}
              isDragOver={dragOverKey === col.key}
            />
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          columns={columns}
          onSave={handleSaveColumns}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
