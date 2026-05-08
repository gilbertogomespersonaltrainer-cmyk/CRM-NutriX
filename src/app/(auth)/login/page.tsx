"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha incorretos");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
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
        <p className="text-[#666] text-sm mt-3">
          Acesse sua conta para continuar
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8"
      >
        {error && (
          <div className="bg-[#450a0a]/50 border border-[#ef4444]/30 text-[#f87171] text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-[#666]">
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="text-[#22c55e] hover:underline font-medium"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
