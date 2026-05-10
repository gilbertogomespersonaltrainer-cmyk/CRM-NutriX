"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { formatPhone } from "@/lib/utils";
import { GlassIcon } from "@/components/ui/premium-icon";
import {
  Search,
  MessageCircle,
  GripVertical,
} from "lucide-react";

type PatientStage = "LEAD" | "FIRST_CONSULTATION" | "ACTIVE" | "INACTIVE" | "REACTIVATED";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  stage: PatientStage;
  tags: string[];
  lastAppointmentAt: string | null;
  createdAt: string;
};

const STAGES: { key: PatientStage; label: string; filledIcon: "userPlus" | "users" | "userCheck" | "userX" | "refresh"; variant: "purple" | "blue" | "green" | "red" | "amber" }[] = [
  { key: "LEAD", label: "Lead", filledIcon: "userPlus", variant: "purple" },
  { key: "FIRST_CONSULTATION", label: "1ª Consulta", filledIcon: "users", variant: "blue" },
  { key: "ACTIVE", label: "Ativo", filledIcon: "userCheck", variant: "green" },
  { key: "INACTIVE", label: "Inativo", filledIcon: "userX", variant: "red" },
  { key: "REACTIVATED", label: "Reativado", filledIcon: "refresh", variant: "amber" },
];

function PatientCard({
  patient,
  onDragStart,
}: {
  patient: Patient;
  onDragStart: (e: React.DragEvent, patientId: string) => void;
}) {
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
          <p className="text-xs text-[#666] mt-0.5 truncate">
            {formatPhone(patient.phone)}
          </p>
          {patient.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {patient.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#222]"
                >
                  {tag}
                </span>
              ))}
              {patient.tags.length > 3 && (
                <span className="text-[10px] text-[#555]">
                  +{patient.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
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
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  patients,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  stage: (typeof STAGES)[number];
  patients: Patient[];
  onDragStart: (e: React.DragEvent, patientId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: PatientStage) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-xl border transition-colors ${
        isDragOver
          ? "border-[#22c55e]/50 bg-[#22c55e]/5"
          : "border-[#1e1e1e] bg-[#0a0a0a]"
      }`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.key)}
    >
      <div className="p-3 border-b border-[#1e1e1e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GlassIcon icon={stage.filledIcon} variant={stage.variant} size="sm" />
            <span className="text-sm font-medium text-white">{stage.label}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md bg-[#161616] border border-[#222] text-[#888]">
            {patients.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-240px)]">
        {patients.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#444]">Nenhum paciente</p>
          </div>
        ) : (
          patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dragOverStage, setDragOverStage] = useState<PatientStage | null>(null);
  const dragPatientId = useRef<string | null>(null);

  const fetchPatients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/patients?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPatients(data);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  function handleDragStart(e: React.DragEvent, patientId: string) {
    dragPatientId.current = patientId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, stage: PatientStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  async function handleDrop(e: React.DragEvent, newStage: PatientStage) {
    e.preventDefault();
    setDragOverStage(null);

    const patientId = dragPatientId.current;
    if (!patientId) return;

    const patient = patients.find((p) => p.id === patientId);
    if (!patient || patient.stage === newStage) return;

    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, stage: newStage } : p))
    );

    try {
      const res = await fetch(`/api/patients/${patientId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) throw new Error();

      const stageLabel = STAGES.find((s) => s.key === newStage)?.label;
      toast({
        title: `${patient.name} movido para ${stageLabel}`,
        variant: "success",
      });
    } catch {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId ? { ...p, stage: patient.stage } : p
        )
      );
      toast({ title: "Erro ao mover paciente", variant: "error" });
    }
  }

  const grouped = STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = patients.filter((p) => p.stage === stage.key);
      return acc;
    },
    {} as Record<PatientStage, Patient[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-[#666] mt-1">
            Acompanhe a jornada dos seus pacientes
          </p>
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
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          onDragLeave={() => setDragOverStage(null)}
        >
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.key}
              stage={stage}
              patients={grouped[stage.key]}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDrop={handleDrop}
              isDragOver={dragOverStage === stage.key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
