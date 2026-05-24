"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Upload, FileText, ClipboardList } from "lucide-react";

type TenantSettings = {
  name: string;
  clinicName: string | null;
  crn: string | null;
  phone: string | null;
  email: string;
};

type Tab = "recibo" | "atestado";

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const SIGNATURE_KEY = "nutrix_signature";
const LOGO_KEY = "nutrix_logo";

export default function DocumentosPage() {
  const [tab, setTab] = useState<Tab>("recibo");
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [signature, setSignature] = useState<string>("");
  const [logo, setLogo] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recibo form
  const [recibo, setRecibo] = useState({
    paciente: "",
    data: "",
    servico: "Consulta Nutricional",
    valor: "",
    formaPagamento: "Pix",
    observacoes: "",
  });

  // Atestado form
  const [atestado, setAtestado] = useState({
    paciente: "",
    data: "",
    horaEntrada: "",
    horaSaida: "",
    finalidade: "fins de comprovação de consulta nutricional",
    observacoes: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});

    const saved = localStorage.getItem(SIGNATURE_KEY);
    if (saved) setSignature(saved);
    const savedLogo = localStorage.getItem(LOGO_KEY);
    if (savedLogo) setLogo(savedLogo);
  }, []);

  function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSignature(result);
      localStorage.setItem(SIGNATURE_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  function handlePrint() {
    window.print();
  }

  const clinicName = settings?.clinicName || settings?.name || "Clínica";
  const profissional = settings?.name || "";
  const crn = settings?.crn || "";
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #document-preview, #document-preview * { visibility: visible !important; }
          #document-preview {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 40px !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white">Gerador de Documentos</h1>
          <p className="text-sm text-[#666] mt-1">Crie recibos e atestados profissionais</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl w-fit">
          <button
            onClick={() => setTab("recibo")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "recibo"
                ? "bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/20"
                : "text-[#666] hover:text-[#888]"
            }`}
          >
            <FileText className="h-4 w-4" />
            Recibo de Consulta
          </button>
          <button
            onClick={() => setTab("atestado")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "atestado"
                ? "bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/20"
                : "text-[#666] hover:text-[#888]"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Atestado de Comparecimento
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
              {tab === "recibo" ? (
                <>
                  <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Dados do Recibo</p>
                  <div className="space-y-2">
                    <Label>Paciente *</Label>
                    <Input
                      value={recibo.paciente}
                      onChange={(e) => setRecibo((p) => ({ ...p, paciente: e.target.value }))}
                      placeholder="Nome completo do paciente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data da Consulta *</Label>
                    <Input
                      type="date"
                      value={recibo.data}
                      onChange={(e) => setRecibo((p) => ({ ...p, data: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serviço Prestado *</Label>
                    <Input
                      value={recibo.servico}
                      onChange={(e) => setRecibo((p) => ({ ...p, servico: e.target.value }))}
                      placeholder="Ex: Consulta Nutricional"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor (R$) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={recibo.valor}
                        onChange={(e) => setRecibo((p) => ({ ...p, valor: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Forma de Pagamento</Label>
                      <select
                        className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#22c55e]/30 transition-colors"
                        value={recibo.formaPagamento}
                        onChange={(e) => setRecibo((p) => ({ ...p, formaPagamento: e.target.value }))}
                      >
                        {["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Transferência Bancária", "Outro"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={recibo.observacoes}
                      onChange={(e) => setRecibo((p) => ({ ...p, observacoes: e.target.value }))}
                      placeholder="Observações opcionais..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Dados do Atestado</p>
                  <div className="space-y-2">
                    <Label>Paciente *</Label>
                    <Input
                      value={atestado.paciente}
                      onChange={(e) => setAtestado((p) => ({ ...p, paciente: e.target.value }))}
                      placeholder="Nome completo do paciente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data da Consulta *</Label>
                    <Input
                      type="date"
                      value={atestado.data}
                      onChange={(e) => setAtestado((p) => ({ ...p, data: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horário de Entrada</Label>
                      <Input
                        type="time"
                        value={atestado.horaEntrada}
                        onChange={(e) => setAtestado((p) => ({ ...p, horaEntrada: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horário de Saída</Label>
                      <Input
                        type="time"
                        value={atestado.horaSaida}
                        onChange={(e) => setAtestado((p) => ({ ...p, horaSaida: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Finalidade</Label>
                    <Input
                      value={atestado.finalidade}
                      onChange={(e) => setAtestado((p) => ({ ...p, finalidade: e.target.value }))}
                      placeholder="fins de comprovação de consulta nutricional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={atestado.observacoes}
                      onChange={(e) => setAtestado((p) => ({ ...p, observacoes: e.target.value }))}
                      placeholder="Observações opcionais..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Signature section */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Assinatura do Profissional</p>
              {signature ? (
                <div className="space-y-3">
                  <div className="border border-[#1e1e1e] rounded-lg p-3 bg-[#0d0d0d] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signature} alt="Assinatura" className="max-h-20 object-contain" />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#555] hover:text-[#888] transition-colors"
                  >
                    Trocar assinatura
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 p-6 border border-dashed border-[#2a2a2a] rounded-xl text-[#555] hover:text-[#888] hover:border-[#333] transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Carregar assinatura</span>
                  <span className="text-xs text-[#444]">PNG, JPG ou SVG — ficará salva para reutilização</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSignatureUpload}
              />
            </div>

            <Button className="w-full" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir / Gerar PDF
            </Button>
          </div>

          {/* Document Preview */}
          <div>
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-4 mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#666] uppercase tracking-wider">Preview do Documento</p>
              <span className="text-[10px] text-[#444] bg-[#0d0d0d] border border-[#1a1a1a] rounded px-2 py-1">Clique em Imprimir para gerar PDF</span>
            </div>

            {/* The actual printable document */}
            <div
              id="document-preview"
              style={{
                background: "white",
                color: "#111",
                fontFamily: "Georgia, serif",
                padding: "40px",
                borderRadius: "12px",
                minHeight: "600px",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* Header */}
              <div style={{ borderBottom: "2px solid #16a34a", paddingBottom: "20px", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
                <div>
                  <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#15803d", margin: 0, fontFamily: "sans-serif" }}>
                    {clinicName}
                  </h1>
                  {profissional && (
                    <p style={{ fontSize: "14px", color: "#555", margin: "4px 0 0", fontFamily: "sans-serif" }}>
                      {profissional}{crn ? ` · CRN: ${crn}` : ""}
                    </p>
                  )}
                  {settings?.phone && (
                    <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0", fontFamily: "sans-serif" }}>{settings.phone}</p>
                  )}
                </div>
                {logo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logo} alt="Logo" style={{ maxHeight: "64px", maxWidth: "160px", objectFit: "contain" }} />
                )}
              </div>

              {/* Document title */}
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: "#222", fontFamily: "sans-serif" }}>
                  {tab === "recibo" ? "Recibo de Consulta" : "Atestado de Comparecimento"}
                </h2>
                <div style={{ width: "60px", height: "2px", background: "#16a34a", margin: "8px auto 0" }} />
              </div>

              {tab === "recibo" ? (
                /* Recibo content */
                <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#333", fontFamily: "sans-serif" }}>
                  <p>
                    Recebi do(a) paciente <strong>{recibo.paciente || "___________________________"}</strong> a
                    importância de <strong>{recibo.valor ? formatCurrency(recibo.valor) : "R$ ___________"}</strong>{" "}
                    referente à prestação de serviços de <strong>{recibo.servico || "___________________________"}</strong>,
                    realizada em <strong>{recibo.data ? formatDate(recibo.data) : "__/__/____"}</strong>.
                  </p>
                  <p style={{ marginTop: "16px" }}>
                    <strong>Forma de pagamento:</strong> {recibo.formaPagamento}
                  </p>
                  {recibo.observacoes && (
                    <p style={{ marginTop: "12px" }}>
                      <strong>Observações:</strong> {recibo.observacoes}
                    </p>
                  )}
                </div>
              ) : (
                /* Atestado content */
                <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#333", fontFamily: "sans-serif" }}>
                  <p>
                    Atesto para os devidos fins que o(a) paciente <strong>{atestado.paciente || "___________________________"}</strong>{" "}
                    esteve presente nesta clínica no dia <strong>{atestado.data ? formatDate(atestado.data) : "__/__/____"}</strong>
                    {atestado.horaEntrada ? `, das <strong>${atestado.horaEntrada}</strong>` : ""}
                    {atestado.horaSaida ? ` às <strong>${atestado.horaSaida}</strong>` : ""},
                    para <strong>{atestado.finalidade || "fins de comprovação de consulta nutricional"}</strong>.
                  </p>
                  {atestado.observacoes && (
                    <p style={{ marginTop: "16px" }}>
                      <strong>Observações:</strong> {atestado.observacoes}
                    </p>
                  )}
                </div>
              )}

              {/* Signature area */}
              <div style={{ marginTop: "60px", paddingTop: "20px" }}>
                {signature ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signature} alt="Assinatura" style={{ maxHeight: "80px", maxWidth: "200px", objectFit: "contain" }} />
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid #ccc", width: "220px" }} />
                )}
                <p style={{ fontSize: "13px", color: "#333", marginTop: signature ? "4px" : "8px", fontFamily: "sans-serif" }}>
                  {profissional || "Profissional"}{crn ? ` — CRN: ${crn}` : ""}
                </p>
                <p style={{ fontSize: "12px", color: "#888", fontFamily: "sans-serif" }}>Nutricionista</p>
              </div>

              {/* Footer */}
              <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: "11px", color: "#aaa", fontFamily: "sans-serif" }}>
                  Emitido em: {today}
                </p>
                <p style={{ fontSize: "11px", color: "#aaa", fontFamily: "sans-serif" }}>
                  {clinicName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
