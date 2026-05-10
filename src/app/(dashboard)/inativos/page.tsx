"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatPhone, daysSince } from "@/lib/utils";
import {
  UserX,
  MessageCircle,
  Check,
  Loader2,
  Clock,
  Send,
} from "lucide-react";

type InactivePatient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lastAppointmentAt: string | null;
  followUpLogs: { contactedAt: string; notes: string | null }[];
};

export default function InativosPage() {
  const [patients, setPatients] = useState<InactivePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactNotes, setContactNotes] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/follow-up")
      .then((res) => res.json())
      .then(setPatients)
      .finally(() => setLoading(false));
  }, []);

  async function sendWhatsApp(patientId: string, phone: string, name: string) {
    setSending(patientId);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          phone,
          messageType: "FOLLOWUP",
          message: `Olá ${name}! Faz um tempo que não nos vemos. Que tal agendar uma consulta?`,
        }),
      });
      if (res.ok) {
        toast({ title: "Mensagem enviada!", variant: "success" });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Erro ao enviar", variant: "error" });
      }
    } finally {
      setSending(null);
    }
  }

  async function markContacted() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedId, notes: contactNotes }),
      });
      if (res.ok) {
        toast({ title: "Contato registrado!", variant: "success" });
        setShowContact(false);
        setContactNotes("");
        // Refresh
        const updated = await fetch("/api/follow-up").then((r) => r.json());
        setPatients(updated);
      }
    } finally {
      setSaving(false);
    }
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
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">
          Pacientes Inativos
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Follow-up de pacientes que não consultam há tempo
        </p>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#f59e0b]/10 to-[#d97706]/5 border border-[#f59e0b]/15 flex items-center justify-center">
              <UserX className="h-7 w-7 text-[#fbbf24]/50" strokeWidth={1.4} />
            </div>
            <p className="text-[#666]">Nenhum paciente inativo</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#666]">
              {patients.length} paciente{patients.length !== 1 ? "s" : ""} inativo{patients.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patients.map((patient) => {
              const days = patient.lastAppointmentAt
                ? daysSince(patient.lastAppointmentAt)
                : null;
              const lastContact = patient.followUpLogs[0];

              return (
                <div
                  key={patient.id}
                  className="flex items-center justify-between px-4 py-4 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/15 to-[#d97706]/5 border border-[#f59e0b]/20 flex items-center justify-center text-[#fbbf24] font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.06)]">
                      {patient.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {patient.name}
                      </p>
                      <p className="text-xs text-[#666]">
                        {formatPhone(patient.phone)}
                      </p>
                      {lastContact && (
                        <p className="text-xs text-[#444] mt-0.5">
                          Último contato: {new Date(lastContact.contactedAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {days !== null && (
                      <Badge variant="pending">
                        <Clock className="h-3 w-3" />
                        {days} dias
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        sendWhatsApp(patient.id, patient.phone, patient.name)
                      }
                      disabled={sending === patient.id}
                    >
                      {sending === patient.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      WhatsApp
                    </Button>
                    <a
                      href={`https://wa.me/55${patient.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedId(patient.id);
                        setShowContact(true);
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Contatado
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Contato</DialogTitle>
            <DialogDescription>
              Anote o resultado do contato com o paciente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Observações sobre o contato..."
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowContact(false)}>
                Cancelar
              </Button>
              <Button onClick={markContacted} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Registrar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
