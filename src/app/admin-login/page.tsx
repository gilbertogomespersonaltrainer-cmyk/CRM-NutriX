"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

type View = "login" | "forgot" | "reset";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const token = searchParams.get("reset");
    if (token) {
      setResetToken(token);
      setView("reset");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao fazer login");
    }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSuccess("Se o e-mail estiver cadastrado, você receberá um link em instantes.");
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/reset-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess("Senha redefinida com sucesso! Faça login.");
      setTimeout(() => {
        router.replace("/admin-login");
        setView("login");
        setSuccess("");
      }, 2000);
    } else {
      setError(data.error || "Erro ao redefinir senha");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-1">
            <span className="font-outfit text-5xl font-black text-white tracking-tighter">Nutri</span>
            <span className="font-outfit text-5xl font-black text-[#22c55e] tracking-tighter">X</span>
          </div>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#22c55e] to-transparent" />
          <p className="text-[#666] text-sm mt-3">Painel Administrativo</p>
        </div>

        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 space-y-5">
          {error && (
            <div className="bg-[#450a0a]/50 border border-[#ef4444]/30 text-[#f87171] text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-[#052e16]/50 border border-[#22c55e]/30 text-[#4ade80] text-sm px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@nutrix.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" required />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</> : "Entrar"}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => { setView("forgot"); setError(""); setSuccess(""); }} className="text-sm text-[#555] hover:text-[#22c55e] transition-colors">
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-white font-semibold">Redefinir senha</h2>
                <p className="text-[#555] text-sm">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" placeholder="admin@nutrix.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</> : "Enviar link"}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => { setView("login"); setError(""); setSuccess(""); }} className="text-sm text-[#555] hover:text-white transition-colors flex items-center gap-1 mx-auto">
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
                </button>
              </div>
            </form>
          )}

          {view === "reset" && (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-white font-semibold">Nova senha</h2>
                <p className="text-[#555] text-sm">Digite e confirme sua nova senha.</p>
              </div>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <Input type="password" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : "Redefinir senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
