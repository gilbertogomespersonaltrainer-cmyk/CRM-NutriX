"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, MessageSquare, Check } from "lucide-react";

type Settings = {
  enabled: boolean;
  daysAfter: number;
  message: string;
};

export default function PosConsultaPage() {
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    daysAfter: 3,
    message: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/pos-consulta")
      .then((r) => r.json())
      .then((data) => setSettings({ enabled: data.enabled, daysAfter: data.daysAfter, message: data.message }))
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

  const preview = settings.message
    .replace(/\{nome_paciente\}/g, "Maria")
    .replace(/\{nome_nutricionista\}/g, "Dra. Ana")
    .replace(/\{nome_clinica\}/g, "Clínica NutriX");

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
          Envio automático de mensagem WhatsApp após a consulta ser concluída — sem esforço para o nutricionista.
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
                  ? "Ativo — mensagem será enviada após cada consulta concluída"
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

      {/* Dias após consulta */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-white font-semibold">Quando enviar</h2>
          <p className="text-sm text-[#666]">
            Quantos dias após a consulta ser marcada como <span className="text-white font-medium">Concluída</span> a mensagem deve ser enviada?
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettings(s => ({ ...s, daysAfter: Math.max(1, s.daysAfter - 1) }))}
                className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-lg font-bold hover:border-[#22c55e]/40 transition-colors flex items-center justify-center"
              >−</button>
              <div className="w-16 text-center">
                <span className="text-3xl font-bold text-[#22c55e]">{settings.daysAfter}</span>
                <p className="text-xs text-[#555] mt-0.5">{settings.daysAfter === 1 ? "dia" : "dias"}</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, daysAfter: Math.min(30, s.daysAfter + 1) }))}
                className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-lg font-bold hover:border-[#22c55e]/40 transition-colors flex items-center justify-center"
              >+</button>
            </div>
            <p className="text-sm text-[#555]">
              após a consulta ser concluída
            </p>
          </div>

          {/* Presets rápidos */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 5, 7].map(d => (
              <button
                key={d}
                onClick={() => setSettings(s => ({ ...s, daysAfter: d }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  settings.daysAfter === d
                    ? "bg-[#22c55e]/15 border-[#22c55e]/40 text-[#4ade80]"
                    : "bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:text-white"
                }`}
              >
                {d} {d === 1 ? "dia" : "dias"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mensagem */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-white font-semibold">Mensagem</h2>
            <div className="flex gap-2 flex-wrap">
              {["{nome_paciente}", "{nome_nutricionista}", "{nome_clinica}"].map(v => (
                <span key={v} className="text-xs text-[#555] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-1 rounded-md font-mono">
                  {v}
                </span>
              ))}
            </div>
          </div>

          <Textarea
            value={settings.message}
            onChange={(e) => setSettings((s) => ({ ...s, message: e.target.value }))}
            rows={5}
            placeholder="Ex: Olá {nome_paciente}! Passando para saber como você está se sentindo após nossa consulta. Está conseguindo seguir as orientações? 😊"
            className="resize-none"
          />

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
          <span className="text-[#888] font-medium">Como funciona:</span> Quando uma consulta é marcada como{" "}
          <span className="text-white">Concluída</span>, o sistema aguarda{" "}
          <span className="text-[#22c55e]">{settings.daysAfter} {settings.daysAfter === 1 ? "dia" : "dias"}</span> e envia
          automaticamente a mensagem para o paciente. Cada consulta gera apenas um envio.
          O WhatsApp precisa estar conectado nas configurações.
        </p>
      </div>
    </div>
  );
}
