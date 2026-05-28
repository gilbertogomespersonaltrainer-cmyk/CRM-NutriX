"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setSent(true);
    } else {
      setError(data.error || "Erro ao enviar e-mail");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-0 mb-2">
          <span className="font-outfit text-5xl font-light text-white tracking-tighter">
            Nutri
          </span>
          <span className="font-outfit text-5xl font-black text-[#22c55e] tracking-tighter">
            X
          </span>
        </div>
        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#22c55e] to-transparent" />
        <p className="text-[#666] text-sm mt-3">Recuperar senha</p>
      </div>

      {sent ? (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 space-y-5 text-center">
          <CheckCircle className="h-12 w-12 text-[#22c55e] mx-auto" />
          <div className="space-y-2">
            <p className="text-white font-semibold text-lg">E-mail enviado!</p>
            <p className="text-[#666] text-sm leading-relaxed">
              Se o e-mail <span className="text-[#aaa]">{email}</span> estiver cadastrado,
              você receberá as instruções para redefinir sua senha em instantes.
            </p>
          </div>
          <p className="text-[#555] text-xs">
            Não recebeu? Verifique a pasta de spam.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#22c55e] hover:underline text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8"
        >
          <p className="text-[#888] text-sm leading-relaxed">
            Digite o e-mail da sua conta e enviaremos um link para você criar uma nova senha.
          </p>

          {error && (
            <div className="bg-[#450a0a]/50 border border-[#ef4444]/30 text-[#f87171] text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>
        </form>
      )}

      {!sent && (
        <p className="text-center text-sm text-[#666]">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-[#22c55e] hover:underline font-medium">
            Voltar para o login
          </Link>
        </p>
      )}
    </div>
  );
}
