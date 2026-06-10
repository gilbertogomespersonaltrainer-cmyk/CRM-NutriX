"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Search, Send, MessageCircle, User, Loader2, CheckCheck, Link2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PatientStage = "LEAD" | "FIRST_CONSULTATION" | "ACTIVE" | "INACTIVE" | "REACTIVATED";

type Conversation = {
  phone: string;
  name: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  patientId: string | null;
  patientName: string | null;
  patientStage: PatientStage | null;
};

type Message = {
  id: string;
  phone: string;
  name: string | null;
  body: string;
  fromMe: boolean;
  timestamp: string;
  read: boolean;
};

const STAGE_LABELS: Record<PatientStage, { label: string; color: string }> = {
  LEAD:               { label: "Lead",        color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  FIRST_CONSULTATION: { label: "1ª Consulta", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  ACTIVE:             { label: "Ativo",        color: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/20" },
  INACTIVE:           { label: "Inativo",      color: "bg-red-500/15 text-red-400 border-red-500/20" },
  REACTIVATED:        { label: "Ativo",        color: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/20" },
};

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  // LID ou número não-padrão: formata os últimos 13 dígitos como número brasileiro
  if (d.length > 13) {
    const last13 = d.slice(-13);
    return `+${last13.slice(0,2)} (${last13.slice(2,4)}) ${last13.slice(4,9)}-${last13.slice(9)}`;
  }
  return phone;
}

// Retorna verdadeiro se o número é um LID (>13 dígitos) — não é um telefone real
function isLidNumber(phone: string) {
  return phone.replace(/\D/g, "").length > 13;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Ontem";
  if (days < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getDisplayName(conv: Conversation) {
  // Prioridade: nome do paciente cadastrado > nome do WhatsApp (pushName) > número formatado
  if (conv.patientName) return conv.patientName;
  if (conv.name) return conv.name;
  // Se for LID (número interno do WhatsApp), mostra "Contato WhatsApp"
  if (isLidNumber(conv.phone)) return "Contato WhatsApp";
  return formatPhone(conv.phone);
}

function getDisplaySubtitle(conv: Conversation) {
  // Linha secundária: mostra o número real se tiver nome, ou omite LID
  if (conv.patientName || conv.name) {
    if (isLidNumber(conv.phone)) return "WhatsApp";
    return formatPhone(conv.phone);
  }
  return null;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Modal de vincular contato LID a paciente
  const [linkModal, setLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkPatients, setLinkPatients] = useState<{id:string;name:string;phone:string}[]>([]);
  const [linking, setLinking] = useState(false);
  // controla se é o primeiro carregamento (mostra spinner) ou refresh silencioso
  const initialConvsLoad = useRef(true);
  const initialMsgsLoad = useRef<string | null>(null); // phone da conversa carregando pela 1ª vez

  // Fetch conversations list — spinner só no primeiro load, depois atualiza silenciosamente
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ } finally {
      if (initialConvsLoad.current) {
        setLoadingConvs(false);
        initialConvsLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (phone: string) => {
    // Mostra spinner apenas quando abre uma conversa pela primeira vez
    if (initialMsgsLoad.current === phone) {
      setLoadingMsgs(true);
    }
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Poll messages when a conversation is open
  useEffect(() => {
    if (!selectedPhone) return;
    // Marca como primeiro carregamento para mostrar spinner só na abertura
    initialMsgsLoad.current = selectedPhone;
    fetchMessages(selectedPhone);
    // Após o primeiro fetch, marca como nulo para refreshes silenciosos
    const silentInterval = setInterval(() => {
      initialMsgsLoad.current = null;
      fetchMessages(selectedPhone);
    }, 5000);
    return () => clearInterval(silentInterval);
  }, [selectedPhone, fetchMessages]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectConversation(phone: string) {
    setSelectedPhone(phone);
    setMessages([]);
    setLoadingMsgs(false); // reseta antes do useEffect definir o spinner
    setReply("");
    // Mark as read locally
    setConversations(prev =>
      prev.map(c => c.phone === phone ? { ...c, unread: 0 } : c)
    );
  }

  async function handleSend() {
    if (!selectedPhone || !reply.trim() || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply("");
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(selectedPhone)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        // Update last message in conversation list
        setConversations(prev =>
          prev.map(c =>
            c.phone === selectedPhone
              ? { ...c, lastMessage: text, lastAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch { /* ignore */ } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Busca pacientes para o modal de vinculação
  useEffect(() => {
    if (!linkModal) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(linkSearch)}&includeLeads=true`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setLinkPatients(list.slice(0, 20));
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [linkSearch, linkModal]);

  async function handleLinkPatient(patientId: string) {
    if (!selectedPhone || linking) return;
    setLinking(true);
    try {
      const res = await fetch("/api/inbox/link-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone, patientId }),
      });
      if (res.ok) {
        setLinkModal(false);
        await fetchConversations();
      }
    } catch { /* ignore */ } finally {
      setLinking(false);
    }
  }

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = getDisplayName(c).toLowerCase();
    return name.includes(q) || c.phone.includes(q);
  });

  const selectedConv = conversations.find(c => c.phone === selectedPhone);

  return (
    <div className="flex gap-0 -mx-8 -my-8 h-screen overflow-hidden">
      {/* ─── Conversation List ─── */}
      <div className="w-[320px] flex-shrink-0 border-r border-[#1a1a1a] flex flex-col bg-[#0a0a0a]">
        {/* Header */}
        <div className="p-4 border-b border-[#1a1a1a]">
          <h1 className="font-outfit text-lg font-semibold text-white mb-3">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
            <input
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#555] outline-none focus:border-[#22c55e]/30 transition-colors"
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageCircle className="h-10 w-10 text-[#333] mb-3" />
              <p className="text-sm text-[#555]">
                {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
              {!search && (
                <p className="text-xs text-[#444] mt-1">
                  Mensagens recebidas via WhatsApp aparecerão aqui
                </p>
              )}
            </div>
          ) : (
            filteredConvs.map(conv => {
              const isSelected = selectedPhone === conv.phone;
              const displayName = getDisplayName(conv);
              const subtitle = getDisplaySubtitle(conv);
              const avatarLetter = displayName === "Contato WhatsApp" ? "?" : (displayName[0]?.toUpperCase() ?? "?");
              return (
                <button
                  key={conv.phone}
                  onClick={() => selectConversation(conv.phone)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 border-b border-[#111] transition-all text-left",
                    isSelected
                      ? "bg-[#22c55e]/[0.06] border-l-2 border-l-[#22c55e]"
                      : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm">
                    {avatarLetter}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        conv.unread > 0 ? "text-white" : "text-[#ccc]"
                      )}>
                        {displayName}
                      </span>
                      <span className="text-[10px] text-[#555] flex-shrink-0">
                        {formatTime(conv.lastAt)}
                      </span>
                    </div>
                    {subtitle && (
                      <p className="text-[11px] text-[#444] truncate mt-0.5">{subtitle}</p>
                    )}
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-xs text-[#555] truncate">{conv.lastMessage}</span>
                      {conv.unread > 0 && (
                        <span className="flex-shrink-0 bg-[#22c55e] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {conv.unread > 99 ? "99+" : conv.unread}
                        </span>
                      )}
                    </div>
                    {conv.patientStage && (
                      <span className={cn(
                        "inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border",
                        STAGE_LABELS[conv.patientStage].color
                      )}>
                        {STAGE_LABELS[conv.patientStage].label}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Chat Panel ─── */}
      {selectedPhone && selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#080808]">
          {/* Chat header */}
          <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center gap-3 bg-[#0a0a0a]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e]/15 to-[#16a34a]/5 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm flex-shrink-0">
              {getDisplayName(selectedConv) === "Contato WhatsApp" ? "?" : getDisplayName(selectedConv)[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{getDisplayName(selectedConv)}</p>
              <p className="text-xs text-[#555]">
                {isLidNumber(selectedConv.phone)
                  ? "WhatsApp — sem número identificável"
                  : formatPhone(selectedConv.phone)}
              </p>
            </div>
            {selectedConv.patientId && (
              <Link
                href={`/pacientes/${selectedConv.patientId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22c55e]/8 border border-[#22c55e]/20 text-[#4ade80] text-xs font-medium hover:bg-[#22c55e]/15 transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Ver paciente
              </Link>
            )}
            {/* Botão visível para contatos LID sem paciente identificado */}
            {isLidNumber(selectedConv.phone) && (
              <button
                onClick={() => { setLinkModal(true); setLinkSearch(""); setLinkPatients([]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                title="Vincular este contato a um paciente cadastrado"
              >
                <Link2 className="h-3.5 w-3.5" />
                Vincular paciente
              </button>
            )}
            {selectedConv.patientStage && (
              <span className={cn(
                "text-[11px] px-2 py-1 rounded border",
                STAGE_LABELS[selectedConv.patientStage].color
              )}>
                {STAGE_LABELS[selectedConv.patientStage].label}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {loadingMsgs ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-10 w-10 text-[#333] mb-3" />
                <p className="text-sm text-[#555]">Nenhuma mensagem</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showDate =
                  !prev ||
                  new Date(msg.timestamp).toDateString() !== new Date(prev.timestamp).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] text-[#555] bg-[#111] border border-[#1a1a1a] px-3 py-1 rounded-full">
                          {new Date(msg.timestamp).toLocaleDateString("pt-BR", {
                            weekday: "long", day: "2-digit", month: "long"
                          })}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] px-3.5 py-2 rounded-2xl text-sm",
                          msg.fromMe
                            ? "bg-[#22c55e]/20 text-white rounded-br-sm border border-[#22c55e]/20"
                            : "bg-[#1a1a1a] text-[#ddd] rounded-bl-sm border border-[#222]"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          msg.fromMe ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-[10px] text-[#555]">{formatTimestamp(msg.timestamp)}</span>
                          {msg.fromMe && (
                            <CheckCheck className="h-3 w-3 text-[#4ade80]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                rows={1}
                className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#444] outline-none focus:border-[#22c55e]/30 transition-colors resize-none overflow-hidden"
                style={{ maxHeight: "120px" }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                  reply.trim() && !sending
                    ? "bg-[#22c55e] text-black hover:bg-[#16a34a]"
                    : "bg-[#1a1a1a] text-[#444]"
                )}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center bg-[#080808] text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-[#22c55e]/50" />
          </div>
          <h2 className="text-base font-semibold text-[#555] mb-1">Selecione uma conversa</h2>
          <p className="text-sm text-[#444] max-w-xs">
            Escolha uma conversa à esquerda para ver as mensagens e responder
          </p>
        </div>
      )}

      {/* ─── Modal: Vincular contato LID a paciente ─── */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Vincular ao paciente</h2>
            <p className="text-xs text-[#555] mb-4">
              Selecione o paciente correspondente a este contato WhatsApp. As mensagens serão vinculadas e os envios futuros usarão o canal correto.
            </p>
            <input
              type="text"
              placeholder="Buscar paciente pelo nome..."
              value={linkSearch}
              onChange={e => setLinkSearch(e.target.value)}
              autoFocus
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#22c55e]/40 mb-3"
            />
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {linkPatients.length === 0 && linkSearch && (
                <p className="text-xs text-[#555] text-center py-4">Nenhum paciente encontrado</p>
              )}
              {linkPatients.length === 0 && !linkSearch && (
                <p className="text-xs text-[#555] text-center py-4">Digite o nome do paciente</p>
              )}
              {linkPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLinkPatient(p.id)}
                  disabled={linking}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#22c55e]/10 border border-transparent hover:border-[#22c55e]/20 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#4ade80] font-bold text-xs flex-shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-xs text-[#555] truncate">{p.phone}</p>
                  </div>
                  {linking && <Loader2 className="h-3.5 w-3.5 text-[#555] animate-spin flex-shrink-0" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLinkModal(false)}
              className="mt-4 w-full py-2 rounded-lg border border-[#2a2a2a] text-[#555] text-sm hover:border-[#333] hover:text-[#888] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
