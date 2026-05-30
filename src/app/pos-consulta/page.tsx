"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, MessageSquare, Check } from "lucide-react";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Settings = {
  enabled: boolean;
  dayOfWeek: number;
  daysAfter: number;
  message: string;
};

export default function PosConsultaPage() {
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    dayOfWeek: 1,
    daysAfter: 3,
    message: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/pos-consulta")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/pos-consulta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const preview = settings.message.replace(/\{nome_paciente\}/g, "Maria");

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-2xl font-bold text-white">Pós Consulta</h1>
        <p className="text-sm text-[#666] mt-1">
          Envio automático semanal de mensagem WhatsApp para todos os pacientes ativos em acompanhamento.
        </p>
      </div>

      {/* Ativar/desativar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-white font-semibold">Envio automático</p>
              <p className="text-sm text-[#666]">
                {settings.enabled
                  ? "Ativo — mensagens serão enviadas automaticamente"
                  : "Inativo — nenhuma mensagem será enviada"}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-white font-semibold">Configurações de envio</h2>

          {/* Dia da semana */}
          <div className="space-y-3">
            <Label className="text-[#888]">Dia da semana para enviar</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setSettings((s) => ({ ...s, dayOfWeek: i }))}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    settings.dayOfWeek === i
                      ? "bg-[#22c55e] text-black"
                      : "bg-[#1a1a1a] text-[#666] hover:text-white border border-[#2a2a2a]"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#555]">
              Toda <span className="text-[#22c55e]">{DAYS[settings.dayOfWeek]}</span> o sistema verificará quais pacientes precisam receber a mensagem.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Mensagem */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Mensagem</h2>
            <span className="text-xs text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded-md font-mono">
              {"{nome_paciente}"}
            </span>
          </div>

          <Textarea
            value={settings.message}
            onChange={(e) => setSettings((s) => ({ ...s, message: e.target.value }))}
            rows={4}
            placeholder="Digite a mensagem..."
            className="resize-none"
          />

          <p className="text-xs text-[#555]">
            Use <span className="text-[#22c55e] font-mono">{"{nome_paciente}"}</span> para inserir o primeiro nome do paciente automaticamente.
          </p>

          {/* Preview */}
          {settings.message && (
            <div className="space-y-2">
              <p className="text-xs text-[#555] font-medium uppercase tracking-wider">Preview</p>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="h-4 w-4 text-[#22c55e]" />
                  </div>
                  <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-xs">
                    <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{preview}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salvar */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
        ) : saved ? (
          <><Check className="h-4 w-4" /> Configurações salvas!</>
        ) : (
          <><Save className="h-4 w-4" /> Salvar configurações</>
        )}
      </Button>

      {/* Info */}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
        <p className="text-xs text-[#555] leading-relaxed">
          <span className="text-[#888] font-medium">Como funciona:</span> Todo{" "}
          <span className="text-[#22c55e]">{DAYS[settings.dayOfWeek]}</span> o sistema envia automaticamente
          para <strong className="text-[#888]">todos os pacientes ativos em acompanhamento</strong>,
          independente de quando foi a última consulta.
          A mensagem se repete toda semana enquanto o paciente estiver ativo.
          O WhatsApp precisa estar conectado nas configurações.
        </p>
      </div>
    </div>
  );
}
