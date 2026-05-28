"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Link inválido ou expirado.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } else {
      setError(data.error || "Erro ao redefinir senha");
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
        <p className="text-[#666] text-sm mt-3">Nova senha</p>
      </div>

      {success ? (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 space-y-5 text-center">
          <CheckCircle className="h-12 w-12 text-[#22c55e] mx-auto" />
          <div className="space-y-2">
            <p className="text-white font-semibold text-lg">Senha redefinida!</p>
            <p className="text-[#666] text-sm">
              Sua senha foi atualizada com sucesso. Redirecionando para o login...
            </p>
          </div>
        </div>
      ) : !token ? (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 space-y-5 text-center">
          <XCircle className="h-12 w-12 text-[#ef4444] mx-auto" />
          <div className="space-y-2">
            <p className="text-white font-semibold text-lg">Link inválido</p>
            <p className="text-[#666] text-sm">
              Este link é inválido ou expirou. Solicite um novo link de recuperação.
            </p>
          </div>
          <Link
            href="/esqueci-senha"
            className="inline-block text-[#22c55e] hover:underline text-sm font-medium"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8"
        >
          <p className="text-[#888] text-sm">
            Crie uma nova senha para a sua conta NutriX.
          </p>

          {error && (
            <div className="bg-[#450a0a]/50 border border-[#ef4444]/30 text-[#f87171] text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar nova senha"
            )}
          </Button>
        </form>
      )}

      {!success && token && (
        <p className="text-center text-sm text-[#666]">
          <Link href="/login" className="text-[#22c55e] hover:underline font-medium">
            Voltar para o login
          </Link>
        </p>
      )}
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaForm />
    </Suspense>
  );
}
