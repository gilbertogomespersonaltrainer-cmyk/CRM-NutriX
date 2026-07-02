"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Smartphone,
  Pencil,
  X,
  Calendar,
  ExternalLink,
  Unlink,
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
  appointmentTypes: string[];
  googleCalendarEnabled: boolean;
  googleCalendarConnected: boolean;
  googleCalendarError: boolean;
  googleCalendarId: string | null;
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

const LOGO_KEY = "nutrix_logo";
const BRAND_COLOR_KEY = "nutrix_brand_color";

const PALETTE_COLORS = [
  { hex: "#15803d", label: "Verde escuro" },
  { hex: "#22c55e", label: "Verde" },
  { hex: "#0ea5e9", label: "Azul céu" },
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#6366f1", label: "Índigo" },
  { hex: "#8b5cf6", label: "Roxo" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#f97316", label: "Laranja" },
  { hex: "#f59e0b", label: "Âmbar" },
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#1e293b", label: "Preto azulado" },
];

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"profile" | "services" | "whatsapp" | "templates" | "agenda">("profile");
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [logo, setLogo] = useState<string>("");
  const [brandColor, setBrandColor] = useState<string>("#15803d");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // New service type
  const [newService, setNewService] = useState({ name: "", defaultPrice: "" });
  const [editingService, setEditingService] = useState<{ id: string; name: string; defaultPrice: string } | null>(null);

  // Appointment types
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  const [newAptType, setNewAptType] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(LOGO_KEY);
    if (saved) setLogo(saved);
    const savedColor = localStorage.getItem(BRAND_COLOR_KEY);
    if (savedColor) setBrandColor(savedColor);
  }, []);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogo(result);
      localStorage.setItem(LOGO_KEY, result);
      toast({ title: "Logomarca salva!", variant: "success" });
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogo("");
    localStorage.removeItem(LOGO_KEY);
    toast({ title: "Logomarca removida", variant: "success" });
  }

  const fetchAll = useCallback(async () => {
    const [sRes, stRes, tRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/service-types"),
      fetch("/api/templates"),
    ]);
    const sData = await sRes.json();
    setSettings(sData);
    setWhatsappStatus(sData.whatsappStatus);
    setAppointmentTypes(sData.appointmentTypes || []);
    setServiceTypes(await stRes.json());
    setTemplates(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    // Abre a aba correta se vier de redirect OAuth (?tab=agenda&success=1)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "agenda") {
        setTab("agenda");
        if (params.get("success") === "1") {
          toast({ title: "Google Agenda conectado com sucesso!", variant: "success" });
        } else if (params.get("error")) {
          toast({ title: "Falha ao conectar Google Agenda", variant: "error" });
        }
        // Remove os params da URL sem recarregar
        window.history.replaceState({}, "", "/configuracoes");
      }
    }
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
    setQrCode(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Erro ao conectar WhatsApp",
          description: data.error || "Verifique as configurações da Evolution API.",
          variant: "error",
        });
        return;
      }
      setWhatsappStatus("CONNECTING");

      // Se o QR code já está pronto (veio do server-side polling), busca imediatamente
      if (data.qrReady) {
        const qrRes = await fetch("/api/whatsapp/qrcode");
        const qrData = await qrRes.json();
        if (qrData.base64) {
          setQrCode(qrData.base64);
          setConnecting(false);
          return;
        }
      }

      // qrReady: false — servidor não conseguiu ainda, continua tentando via webhook
      toast({ title: "Aguardando QR Code...", description: "Pode levar alguns segundos..." });
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const qrRes = await fetch("/api/whatsapp/qrcode");
        const qrData = await qrRes.json();
        if (qrData.base64) {
          setQrCode(qrData.base64);
          setConnecting(false);
          return;
        }
      }
      toast({
        title: "QR Code não chegou",
        description: "Tente clicar em Conectar novamente.",
        variant: "error",
      });
    } catch {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível alcançar o serviço de WhatsApp. Tente novamente.",
        variant: "error",
      });
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

  async function saveEditServiceType(e: React.FormEvent) {
    e.preventDefault();
    if (!editingService) return;
    const res = await fetch(`/api/service-types/${editingService.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingService.name,
        defaultPrice: parseFloat(editingService.defaultPrice),
      }),
    });
    if (res.ok) {
      setServiceTypes((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? { ...s, name: editingService.name, defaultPrice: parseFloat(editingService.defaultPrice) }
            : s
        )
      );
      setEditingService(null);
      toast({ title: "Tipo atualizado!", variant: "success" });
    }
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
          { key: "agenda" as const, label: "Google Agenda", filledIcon: "calendar" as const, variant: "cyan" as const },
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

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Logomarca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#666]">
                A logomarca será exibida automaticamente nos recibos e atestados gerados.
              </p>
              {logo ? (
                <div className="space-y-3">
                  <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0d0d0d] flex items-center justify-center min-h-[100px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="Logomarca" className="max-h-20 max-w-[200px] object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>
                      Trocar logomarca
                    </Button>
                    <Button variant="danger" size="sm" onClick={removeLogo}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 p-6 border border-dashed border-[#2a2a2a] rounded-xl text-[#555] hover:text-[#888] hover:border-[#333] transition-colors"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">Carregar logomarca</span>
                  <span className="text-xs text-[#444]">PNG, JPG ou SVG · Aparecerá nos documentos</span>
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </CardContent>
          </Card>

          {/* Cor da marca */}
          <Card>
            <CardHeader>
              <CardTitle>Cor da Marca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#666]">
                Escolha a cor principal do seu consultório. Ela será aplicada nos documentos gerados.
              </p>
              <div className="grid grid-cols-6 gap-2">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      setBrandColor(c.hex);
                      localStorage.setItem(BRAND_COLOR_KEY, c.hex);
                      toast({ title: "Cor salva!", variant: "success" });
                    }}
                    className="relative h-10 w-full rounded-lg border-2 transition-all"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: brandColor === c.hex ? "#fff" : "transparent",
                      boxShadow: brandColor === c.hex ? `0 0 0 2px ${c.hex}` : "none",
                    }}
                  >
                    {brandColor === c.hex && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-[#666]">Cor personalizada:</label>
                <div className="relative">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => {
                      setBrandColor(e.target.value);
                      localStorage.setItem(BRAND_COLOR_KEY, e.target.value);
                    }}
                    className="h-9 w-16 cursor-pointer rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-1"
                  />
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1e1e1e] text-xs text-[#888]"
                  style={{ borderLeftColor: brandColor, borderLeftWidth: "3px" }}
                >
                  <span>{brandColor.toUpperCase()}</span>
                </div>
              </div>
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
              {serviceTypes.map((st) =>
                editingService?.id === st.id ? (
                  <form
                    key={st.id}
                    onSubmit={saveEditServiceType}
                    className="flex items-end gap-3 px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#22c55e]/30"
                  >
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-[#666]">Nome</Label>
                      <Input
                        value={editingService.name}
                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-xs text-[#666]">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingService.defaultPrice}
                        onChange={(e) => setEditingService({ ...editingService, defaultPrice: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" size="sm">
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditingService(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                ) : (
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
                        onClick={() => setEditingService({ id: st.id, name: st.name, defaultPrice: String(st.defaultPrice) })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
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
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar Serviço</CardTitle>
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
          {/* Tipos de Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[#666]">
                Defina o <strong className="text-white">propósito</strong> do atendimento (ex: Primeira Consulta, Retorno, Reavaliação). Aparece na variável <span className="text-[#22c55e]">{"{tipo_consulta}"}</span> das mensagens automáticas. Não confundir com <strong className="text-white">Modalidade</strong> (Presencial/Online/Híbrido), que é um campo separado no agendamento.
              </p>
              {appointmentTypes.length === 0 && (
                <p className="text-sm text-[#555] text-center py-4">Nenhum tipo cadastrado ainda.</p>
              )}
              {appointmentTypes.map((type, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
                >
                  <p className="text-sm text-white">{type}</p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const updated = appointmentTypes.filter((_, i) => i !== idx);
                      setAppointmentTypes(updated);
                      await fetch("/api/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ appointmentTypes: updated }),
                      });
                      toast({ title: "Tipo removido", variant: "success" });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newAptType.trim()) return;
                  const updated = [...appointmentTypes, newAptType.trim()];
                  setAppointmentTypes(updated);
                  setNewAptType("");
                  await fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ appointmentTypes: updated }),
                  });
                  toast({ title: "Tipo adicionado!", variant: "success" });
                }}
                className="flex gap-3 items-end pt-2"
              >
                <div className="flex-1 space-y-2">
                  <Label>Novo tipo</Label>
                  <Input
                    value={newAptType}
                    onChange={(e) => setNewAptType(e.target.value)}
                    placeholder="Ex: Primeira Consulta, Retorno, Reavaliação..."
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
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#22c55e]/10 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center">
                      <Smartphone className="h-7 w-7 text-[#22c55e]/60" strokeWidth={1.6} />
                    </div>
                    <div>
                      <p className="text-sm text-[#888]">
                        Clique em <strong className="text-white">Conectar WhatsApp</strong> e escaneie o QR Code com seu celular.
                      </p>
                    </div>
                    <Button onClick={connectWhatsApp} disabled={connecting} className="w-full">
                      {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      {connecting ? "Gerando QR Code..." : "Conectar WhatsApp"}
                    </Button>
                  </div>
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
            Clique em uma variável para inserir no template que estiver editando.
          </p>
          {[
            {
              type: "CONFIRMATION",
              label: "Confirmação de Consulta",
              default: "Olá {nome_paciente}! Sua {tipo_consulta} com {nome_nutricionista} está confirmada para {data_consulta} às {hora_consulta}. Qualquer dúvida, estou à disposição! 😊",
            },
            {
              type: "REMINDER_8D",
              label: "Lembrete 8 Dias Antes",
              default: "Olá {nome_paciente}! Passando para lembrar que sua {tipo_consulta} com {nome_nutricionista} está agendada para {data_consulta} às {hora_consulta}. Confirme sua presença respondendo esta mensagem! 😊",
            },
            {
              type: "REMINDER",
              label: "Lembrete 24h Antes",
              default: "Olá {nome_paciente}! Lembrando que você tem {tipo_consulta} amanhã, {data_consulta} às {hora_consulta} com {nome_nutricionista}. Até lá! 👋",
            },
            {
              type: "FOLLOWUP",
              label: "Follow-up de Inativo",
              default: "Olá {nome_paciente}! Tudo bem com você? 😊 Estava pensando em você e quis dar um oi. Como você está se sentindo em relação à sua alimentação ultimamente? Estou aqui se precisar de mim! 🌱",
            },
            {
              type: "BIRTHDAY",
              label: "🎂 Aniversário",
              default: "Olá {nome_paciente}! 🎉 Hoje é um dia especial — feliz aniversário! Desejo que este novo ciclo seja repleto de saúde, alegria e conquistas. Um abraço carinhoso de {nome_nutricionista}! 🎂",
            },
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
                    initialContent={existing?.content || tmpl.default}
                    onSave={saveTemplate}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── AGENDA ── */}
      {tab === "agenda" && settings && (
        <div className="max-w-xl space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Google Agenda</h2>
            <p className="text-sm text-[#666]">
              Ao conectar, cada agendamento criado no NutriX será automaticamente adicionado ao seu Google Agenda, evitando conflito com outros compromissos.
            </p>
          </div>

          {/* Status Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    settings.googleCalendarConnected
                      ? "bg-[#22c55e]/10 border-[#22c55e]/20"
                      : settings.googleCalendarError
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-[#111] border-[#222]"
                  }`}>
                    <Calendar className={`h-5 w-5 ${settings.googleCalendarConnected ? "text-[#4ade80]" : settings.googleCalendarError ? "text-red-400" : "text-[#555]"}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Google Agenda</p>
                    <p className={`text-xs mt-0.5 ${settings.googleCalendarConnected ? "text-[#666]" : settings.googleCalendarError ? "text-red-400" : "text-[#666]"}`}>
                      {settings.googleCalendarConnected ? "Conectado e sincronizando" : settings.googleCalendarError ? "Conexão interrompida — reconecte" : "Não conectado"}
                    </p>
                  </div>
                </div>

                {settings.googleCalendarConnected ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={disconnectingGoogle}
                    onClick={async () => {
                      setDisconnectingGoogle(true);
                      try {
                        const res = await fetch("/api/google/disconnect", { method: "DELETE" });
                        if (res.ok) {
                          setSettings(s => s ? { ...s, googleCalendarConnected: false, googleCalendarEnabled: false, googleCalendarError: false } : s);
                          toast({ title: "Google Agenda desconectado", variant: "success" });
                        }
                      } finally {
                        setDisconnectingGoogle(false);
                      }
                    }}
                  >
                    {disconnectingGoogle
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Unlink className="h-4 w-4" />
                    }
                    Desconectar
                  </Button>
                ) : (
                  <a href="/api/google/auth">
                    <Button variant={settings.googleCalendarError ? "danger" : "default"}>
                      <ExternalLink className="h-4 w-4" />
                      {settings.googleCalendarError ? "Reconectar Google Agenda" : "Conectar Google Agenda"}
                    </Button>
                  </a>
                )}
              </div>

              {settings.googleCalendarConnected && (
                <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#22c55e]" />
                  <p className="text-xs text-[#666]">
                    Novos agendamentos são criados no seu Google Agenda automaticamente.
                    Cancelamentos e alterações de horário também são sincronizados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Banner de erro de conexão */}
          {settings.googleCalendarError && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-3">
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-red-400 text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-medium text-red-400">Conexão com o Google Agenda interrompida</p>
                <p className="text-xs text-[#666] mt-1">
                  O NutriX não conseguiu renovar o acesso ao Google Agenda. Os agendamentos criados durante esse período não foram sincronizados.
                  Clique em <span className="text-white font-medium">Reconectar Google Agenda</span> para restaurar a sincronização.
                </p>
              </div>
            </div>
          )}

          {/* Instruções */}
          {!settings.googleCalendarConnected && !settings.googleCalendarError && (
            <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] space-y-3">
              <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Como configurar</p>
              <ol className="space-y-2 text-xs text-[#666]">
                <li className="flex gap-2"><span className="text-[#22c55e] font-bold shrink-0">1.</span>Clique em <span className="text-white font-medium">Conectar Google Agenda</span></li>
                <li className="flex gap-2"><span className="text-[#22c55e] font-bold shrink-0">2.</span>Faça login com a conta Google onde quer ver as consultas</li>
                <li className="flex gap-2"><span className="text-[#22c55e] font-bold shrink-0">3.</span>Autorize o NutriX a gerenciar eventos do Agenda</li>
                <li className="flex gap-2"><span className="text-[#22c55e] font-bold shrink-0">4.</span>Pronto — os próximos agendamentos aparecerão no seu Google Agenda automaticamente</li>
              </ol>
              <p className="text-[11px] text-[#444]">
                Apenas eventos de consultas são criados. O NutriX não lê nenhum outro evento da sua agenda.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TEMPLATE_VARIABLES = [
  "{nome_paciente}",
  "{data_consulta}",
  "{hora_consulta}",
  "{tipo_consulta}",
  "{modalidade_consulta}",
  "{nome_nutricionista}",
  "{nome_clinica}",
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSave() {
    setSaving(true);
    await onSave(type, content);
    setSaving(false);
  }

  function insertVariable(variable: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const newContent = content.slice(0, start) + variable + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            className="text-xs px-2 py-0.5 rounded-md bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-colors font-mono"
          >
            {v}
          </button>
        ))}
      </div>
      <Textarea
        ref={textareaRef}
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
