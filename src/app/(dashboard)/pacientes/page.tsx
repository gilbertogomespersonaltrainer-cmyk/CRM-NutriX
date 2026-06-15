"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
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
import { formatPhone, isLidPhone } from "@/lib/utils";
import {
  Plus,
  Search,
  Users,
  UserX,
  Loader2,
  MessageCircle,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ImportRow = {
  name: string;
  phone: string;
  cpf?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  howFoundUs?: string;
  notes?: string;
};

// ─── CSV Parser ───────────────────────────────────────────────────────────────

// Maps flexible CSV header names (PT + EN) to our field names
const COLUMN_MAP: Record<string, keyof ImportRow> = {
  nome: "name", name: "name", "nome completo": "name", paciente: "name",
  telefone: "phone", celular: "phone", phone: "phone", whatsapp: "phone",
  tel: "phone", fone: "phone", número: "phone", numero: "phone", "phone number": "phone",
  cpf: "cpf",
  nascimento: "birthDate", "data de nascimento": "birthDate", data_nascimento: "birthDate",
  birthdate: "birthDate", dt_nascimento: "birthDate", "data nasc": "birthDate", "data nascimento": "birthDate",
  email: "email", "e-mail": "email",
  endereço: "address", endereco: "address", address: "address",
  "como conheceu": "howFoundUs", origem: "howFoundUs", canal: "howFoundUs",
  howfoundus: "howFoundUs", como_conheceu: "howFoundUs",
  "observações": "notes", observacoes: "notes",
  notas: "notes", obs: "notes", notes: "notes", anotações: "notes", anotacoes: "notes",
};

function detectSeparator(line: string): "," | ";" {
  const commas = (line.match(/,/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  return semis >= commas ? ";" : ",";
}

function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string): { rows: ImportRow[]; unmappedHeaders: string[] } {
  // Strip BOM
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], unmappedHeaders: [] };

  const sep = detectSeparator(lines[0]);
  const rawHeaders = splitCSVLine(lines[0], sep);

  // Build index map: column index → ImportRow field
  const indexMap: Record<number, keyof ImportRow> = {};
  const unmappedHeaders: string[] = [];

  rawHeaders.forEach((h, i) => {
    const key = h.toLowerCase().trim().replace(/[_-]/g, " ");
    if (COLUMN_MAP[key]) {
      indexMap[i] = COLUMN_MAP[key];
    } else if (h.trim()) {
      unmappedHeaders.push(h.trim());
    }
  });

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i], sep);
    const row: Partial<ImportRow> = {};
    cells.forEach((cell, idx) => {
      const field = indexMap[idx];
      if (field && cell.trim()) row[field] = cell.trim();
    });
    if (row.name || row.phone) rows.push(row as ImportRow);
  }

  return { rows, unmappedHeaders };
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

type ImportStep = "upload" | "preview" | "result";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: number;
  details: string[];
};

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (!file.name.match(/\.csv$/i)) {
      toast({ title: "Selecione um arquivo .csv", variant: "error" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows: parsed, unmappedHeaders } = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Nenhuma linha válida encontrada no arquivo", variant: "error" });
        return;
      }
      setRows(parsed);
      setUnmapped(unmappedHeaders);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/patients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep("result");
        if (data.imported > 0) onDone();
      } else {
        toast({ title: data.error || "Erro ao importar", variant: "error" });
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "error" });
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = "nome,telefone,cpf,email,nascimento,endereço,como conheceu,observações\nMaria Silva,(11) 99999-0001,123.456.789-00,maria@email.com,15/03/1990,Rua das Flores 10,Instagram,Quer emagrecer";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const preview = rows.slice(0, 5);
  const hasName = rows.some((r) => r.name);
  const hasPhone = rows.some((r) => r.phone);
  const validRows = rows.filter((r) => r.name && r.phone);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Pacientes via CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Faça upload de uma planilha CSV com seus pacientes"}
            {step === "preview" && `${rows.length} linha${rows.length !== 1 ? "s" : ""} encontrada${rows.length !== 1 ? "s" : ""} em "${fileName}"`}
            {step === "result" && "Importação concluída"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">

          {/* ── STEP 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors p-10 flex flex-col items-center gap-3 ${
                  dragOver
                    ? "border-[#22c55e] bg-[#22c55e]/5"
                    : "border-[#2a2a2a] hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.02]"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center">
                  <Upload className="h-5 w-5 text-[#22c55e]" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Clique ou arraste o arquivo CSV</p>
                  <p className="text-xs text-[#555] mt-1">Separador vírgula ou ponto-e-vírgula, UTF-8</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-[#555]" />
                  <div>
                    <p className="text-xs font-medium text-[#888]">Precisa de um modelo?</p>
                    <p className="text-[11px] text-[#555]">Baixe o arquivo CSV de exemplo</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                  <Download className="h-3.5 w-3.5" />
                  Modelo
                </Button>
              </div>

              {/* Supported columns */}
              <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] space-y-2">
                <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Colunas reconhecidas</p>
                <div className="flex flex-wrap gap-1.5">
                  {["nome *", "telefone *", "cpf", "email", "nascimento", "endereço", "como conheceu", "observações"].map((col) => (
                    <span key={col} className={`text-[11px] px-2 py-0.5 rounded border ${col.endsWith("*") ? "bg-[#22c55e]/10 text-[#4ade80] border-[#22c55e]/20" : "bg-[#111] text-[#666] border-[#222]"}`}>
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[#444]">* obrigatório — pacientes existentes (mesmo telefone) serão ignorados automaticamente</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Validation warnings */}
              {(!hasName || !hasPhone) && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-300">
                    {!hasName && <p>Coluna <strong>nome</strong> não encontrada. Verifique os cabeçalhos do CSV.</p>}
                    {!hasPhone && <p>Coluna <strong>telefone</strong> não encontrada. Verifique os cabeçalhos do CSV.</p>}
                  </div>
                </div>
              )}

              {unmapped.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
                  <AlertCircle className="h-3.5 w-3.5 text-[#555] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[#555]">
                    Colunas ignoradas (não reconhecidas): <span className="text-[#666]">{unmapped.join(", ")}</span>
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-center">
                  <p className="text-lg font-bold text-white">{rows.length}</p>
                  <p className="text-[11px] text-[#555]">linhas no arquivo</p>
                </div>
                <div className="p-3 rounded-lg bg-[#22c55e]/5 border border-[#22c55e]/15 text-center">
                  <p className="text-lg font-bold text-[#4ade80]">{validRows.length}</p>
                  <p className="text-[11px] text-[#555]">válidas (nome + tel)</p>
                </div>
                <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-center">
                  <p className="text-lg font-bold text-[#888]">{rows.length - validRows.length}</p>
                  <p className="text-[11px] text-[#555]">incompletas</p>
                </div>
              </div>

              {/* Preview table */}
              <div>
                <p className="text-xs text-[#555] mb-2">Prévia (primeiras {preview.length} linhas):</p>
                <div className="rounded-lg border border-[#1a1a1a] overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
                        {["Nome", "Telefone", "Email", "Nascimento", "CPF"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[#555] font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-[#111] last:border-0">
                          <td className="px-3 py-2 text-white truncate max-w-[140px]">{row.name || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2 text-[#888] whitespace-nowrap">{row.phone || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2 text-[#666] truncate max-w-[120px]">{row.email || "—"}</td>
                          <td className="px-3 py-2 text-[#666] whitespace-nowrap">{row.birthDate || "—"}</td>
                          <td className="px-3 py-2 text-[#666]">{row.cpf || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 5 && (
                    <p className="text-center text-[11px] text-[#444] py-2">+ {rows.length - 5} linha{rows.length - 5 !== 1 ? "s" : ""} não exibida{rows.length - 5 !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Result ── */}
          {step === "result" && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-[#4ade80]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-[#22c55e]/5 border border-[#22c55e]/15 text-center">
                  <p className="text-2xl font-bold text-[#4ade80]">{result.imported}</p>
                  <p className="text-xs text-[#555] mt-0.5">Importados</p>
                </div>
                <div className="p-4 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-center">
                  <p className="text-2xl font-bold text-[#888]">{result.skipped}</p>
                  <p className="text-xs text-[#555] mt-0.5">Já existiam</p>
                </div>
                <div className="p-4 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-center">
                  <p className={`text-2xl font-bold ${result.errors > 0 ? "text-red-400" : "text-[#888]"}`}>{result.errors}</p>
                  <p className="text-xs text-[#555] mt-0.5">Erros</p>
                </div>
              </div>

              {result.details.length > 0 && (
                <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] space-y-1">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-2">Detalhes</p>
                  {result.details.map((d, i) => (
                    <p key={i} className="text-xs text-[#666]">· {d}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-[#1e1e1e] mt-4">
          {step === "preview" && (
            <button
              onClick={() => setStep("upload")}
              className="text-xs text-[#555] hover:text-[#888] transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Trocar arquivo
            </button>
          )}
          {step !== "preview" && <div />}

          <div className="flex gap-2">
            {step === "result" ? (
              <Button onClick={onClose}>Fechar</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                {step === "preview" && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                  >
                    {importing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Importar {validRows.length} paciente{validRows.length !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PacientesContent() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showNew, setShowNew] = useState(searchParams.get("new") === "true");
  const [showImport, setShowImport] = useState(false);
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
        setForm({ name: "", cpf: "", birthDate: "", phone: "", email: "", address: "", howFoundUs: "", notes: "" });
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
          <h1 className="font-outfit text-2xl font-bold text-white">Pacientes</h1>
          <p className="text-sm text-[#666] mt-1">Gerencie seus pacientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>
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
          <Button variant={filter === "all" ? "default" : "secondary"} size="sm" onClick={() => setFilter("all")}>
            Todos
          </Button>
          <Button variant={filter === "active" ? "default" : "secondary"} size="sm" onClick={() => setFilter("active")}>
            <Users className="h-3.5 w-3.5" />
            Ativos
          </Button>
          <Button variant={filter === "inactive" ? "default" : "secondary"} size="sm" onClick={() => setFilter("inactive")}>
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
                    {!isLidPhone(patient.phone) && (
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
                    )}
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

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { fetchPatients(); }}
        />
      )}

      {/* New Patient Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>Preencha os dados do paciente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input name="phone" value={form.phone} onChange={handleChange} required placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Como conheceu?</Label>
                <Input name="howFoundUs" value={form.howFoundUs} onChange={handleChange} placeholder="Instagram, indicação..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Observações gerais sobre o paciente..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
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
