"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    crn: "",
    phone: "",
    clinicName: "",
  });

  // Pré-preenche e-mail vindo do link do e-mail da Hotmart
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setForm((prev) => ({ ...prev, email: decodeURIComponent(emailParam) }));
    }
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar conta");
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
      setLoading(false);
    }
  }

  const planParam = searchParams.get("plan");
  const comingFromHotmart = !!searchParams.get("email");

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
        <p className="text-[#666] text-sm mt-3">Crie sua conta</p>
      </div>

      {/* Banner Hotmart */}
      {comingFromHotmart && (
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-[#22c55e] font-semibold">
            🎉 Pagamento confirmado{planParam ? ` — Plano ${planParam}` : ""}
          </p>
          <p className="text-xs text-[#888] mt-1">
            Preencha seus dados abaixo para ativar seu acesso imediatamente.
          </p>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8"
      >
        {error && (
          <div className="bg-[#450a0a]/50 border border-[#ef4444]/30 text-[#f87171] text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Seu nome"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crn">CRN *</Label>
            <Input
              id="crn"
              name="crn"
              placeholder="CRN-0 00000"
              value={form.crn}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={handleChange}
            required
            readOnly={comingFromHotmart}
            className={comingFromHotmart ? "opacity-75 cursor-not-allowed" : ""}
          />
          {comingFromHotmart && (
            <p className="text-xs text-[#22c55e]">✓ E-mail confirmado pela Hotmart</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="(00) 00000-0000"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clinicName">Nome da clínica</Label>
          <Input
            id="clinicName"
            name="clinicName"
            placeholder="Nome da sua clínica (opcional)"
            value={form.clinicName}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-[#666]">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="text-[#22c55e] hover:underline font-medium"
        >
          Faça login
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
