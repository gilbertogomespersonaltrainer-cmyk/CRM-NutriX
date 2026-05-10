"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";
import { GlassIcon } from "@/components/ui/premium-icon";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  QrCode,
  Wifi,
  WifiOff,
  CheckCircle,
  MessageCircle,
  Smartphone,
} from "lucide-react";

type TenantSettings = {
  id: string;
  name: string;
  email: string;
  crn: string;
  phone: string;
  clinicName: string | null;
  inactiveDaysThreshold: number;
  defaultDuration: number;
  whatsappStatus: string;
};

type ServiceType = {
  id: string;
  name: string;
  defaultPrice: number;
  isActive: boolean;
  sortOrder: number;
};

type Template = {
  id: string;
  type: string;
  content: string;
};

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"profile" | "services" | "whatsapp" | "templates">("profile");

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // New service type
  const [newService, setNewService] = useState({ name: "", defaultPrice: "" });

  const fetchAll = useCallback(async () => {
    const [sRes, stRes, tRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/service-types"),
      fetch("/api/templates"),
    ]);
    const sData = await sRes.json();
    setSettings(sData);
    setWhatsappStatus(sData.whatsappStatus);
    setServiceTypes(await stRes.json());
    setTemplates(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll WhatsApp status while connecting
  useEffect(() => {
    if (whatsappStatus !== "CONNECTING") return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      if (data.whatsappStatus === "CONNECTED") {
        setWhatsappStatus("CONNECTED");
        setQrCode(null);
        toast({ title: "WhatsApp conectado!", variant: "success" });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [whatsappStatus]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast({ title: "Perfil atualizado!", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  async function connectWhatsApp() {
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (data.base64) {
        setQrCode(data.base64);
        setWhatsappStatus("CONNECTING");
      } else if (data.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setWhatsappStatus("CONNECTING");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectWhatsApp() {
    await fetch("/api/whatsapp/disconnect", { method: "DELETE" });
    setWhatsappStatus("DISCONNECTED");
    setQrCode(null);
    toast({ title: "WhatsApp desconectado", variant: "success" });
  }

  async function addServiceType(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/service-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newService.name,
        defaultPrice: parseFloat(newService.defaultPrice),
      }),
    });
    if (res.ok) {
      setNewService({ name: "", defaultPrice: "" });
      const updated = await fetch("/api/service-types").then((r) => r.json());
      setServiceTypes(updated);
      toast({ title: "Tipo de serviço adicionado!", variant: "success" });
    }
  }

  async function toggleServiceType(id: string, isActive: boolean) {
    await fetch(`/api/service-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setServiceTypes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  async function deleteServiceType(id: string) {
    await fetch(`/api/service-types/${id}`, { method: "DELETE" });
    setServiceTypes((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Tipo removido", variant: "success" });
  }

  async function saveTemplate(type: string, content: string) {
    const res = await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content }),
    });
    if (res.ok) toast({ title: "Template salvo!", variant: "success" });
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
          Configurações
        </h1>
        <p className="text-sm text-[#666] mt-1">Gerencie seu consultório</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e1e1e]">
        {[
          { key: "profile" as const, label: "Perfil", filledIcon: "settings" as const, variant: "blue" as const },
          { key: "services" as const, label: "Tipos de Serviço", filledIcon: "receipt" as const, variant: "emerald" as const },
          { key: "whatsapp" as const, label: "WhatsApp", filledIcon: "message" as const, variant: "green" as const },
          { key: "templates" as const, label: "Templates", filledIcon: "clipboard" as const, variant: "purple" as const },
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

      {/* Profile */}
      {tab === "profile" && settings && (
        <form onSubmit={saveProfile} className="max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CRN</Label>
                  <Input
                    value={settings.crn}
                    onChange={(e) => setSettings({ ...settings, crn: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Clínica</Label>
                  <Input
                    value={settings.clinicName || ""}
                    onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dias para inatividade</Label>
                  <Input
                    type="number"
                    value={settings.inactiveDaysThreshold}
                    onChange={(e) => setSettings({ ...settings, inactiveDaysThreshold: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração padrão (min)</Label>
                  <Input
                    type="number"
                    value={settings.defaultDuration}
                    onChange={(e) => setSettings({ ...settings, defaultDuration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Service Types */}
      {tab === "services" && (
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Serviço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceTypes.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{st.name}</p>
                    <p className="text-xs text-[#666]">{formatCurrency(st.defaultPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={st.isActive ? "active" : "inactive"}>
                      {st.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleServiceType(st.id, st.isActive)}
                    >
                      {st.isActive ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteServiceType(st.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addServiceType} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    required
                    placeholder="Ex: Consulta Online"
                  />
                </div>
                <div className="w-40 space-y-2">
                  <Label>Valor Padrão</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.defaultPrice}
                    onChange={(e) => setNewService({ ...newService, defaultPrice: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WhatsApp */}
      {tab === "whatsapp" && (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#22c55e]" />
                Conexão WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {whatsappStatus === "CONNECTED" ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 shadow-[0_0_30px_rgba(34,197,94,0.1)] flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-[#4ade80]" strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white flex items-center justify-center gap-2">
                      <Wifi className="h-5 w-5 text-[#22c55e]" />
                      WhatsApp Conectado
                    </p>
                    <p className="text-sm text-[#666] mt-1">
                      Seu WhatsApp está ativo e pronto para enviar mensagens
                    </p>
                  </div>
                  <Button variant="danger" onClick={disconnectWhatsApp}>
                    <WifiOff className="h-4 w-4" />
                    Desconectar
                  </Button>
                </div>
              ) : whatsappStatus === "CONNECTING" && qrCode ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-[#a1a1a1] mb-4">
                    Escaneie o QR Code abaixo com seu WhatsApp
                  </p>
                  <div className="inline-block p-4 bg-white rounded-2xl">
                    <img
                      src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[#fbbf24]">
                    <QrCode className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">Aguardando escaneamento...</span>
                  </div>
                  <Button variant="secondary" onClick={connectWhatsApp}>
                    Atualizar QR Code
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#ef4444]/15 to-[#dc2626]/5 border border-[#ef4444]/20 shadow-[0_0_30px_rgba(239,68,68,0.08)] flex items-center justify-center">
                    <WifiOff className="h-7 w-7 text-[#f87171]" strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      WhatsApp Desconectado
                    </p>
                    <p className="text-sm text-[#666] mt-1">
                      Conecte seu WhatsApp para enviar mensagens automáticas
                    </p>
                  </div>
                  <Button onClick={connectWhatsApp} disabled={connecting}>
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    Conectar WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates */}
      {tab === "templates" && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-[#666]">
            Variáveis disponíveis: {"{nome_paciente}"}, {"{data_consulta}"}, {"{hora_consulta}"}, {"{nome_nutricionista}"}, {"{nome_clinica}"}, {"{dias_inativo}"}
          </p>
          {[
            { type: "CONFIRMATION", label: "Confirmação de Agendamento" },
            { type: "REMINDER", label: "Lembrete 24h Antes" },
            { type: "FOLLOWUP", label: "Follow-up de Inativo" },
          ].map((tmpl) => {
            const existing = templates.find((t) => t.type === tmpl.type);
            return (
              <Card key={tmpl.type}>
                <CardHeader>
                  <CardTitle className="text-sm">{tmpl.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplateEditor
                    type={tmpl.type}
                    initialContent={existing?.content || ""}
                    onSave={saveTemplate}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  type,
  initialContent,
  onSave,
}: {
  type: string;
  initialContent: string;
  onSave: (type: string, content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(type, content);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Salvar
      </Button>
    </div>
  );
}
