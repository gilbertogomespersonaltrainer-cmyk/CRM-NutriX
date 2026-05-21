"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

export default function DemoPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    signIn("credentials", {
      email: "demo@nutrix.com",
      password: "demo2026",
      callbackUrl: "/dashboard",
      redirect: true,
    }).catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="text-center space-y-5">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1 mb-8">
          <span className="font-outfit text-4xl font-black text-white tracking-tighter">Nutri</span>
          <span className="font-outfit text-4xl font-black text-[#22c55e] tracking-tighter">X</span>
        </div>

        {status === "loading" ? (
          <>
            <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-white font-medium">Preparando sua demo...</p>
              <p className="text-[#555] text-sm">Você será redirecionado em instantes</p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-[#ef4444] text-sm">Não foi possível entrar na demo.</p>
            <a
              href="/login"
              className="inline-block text-sm text-[#22c55e] hover:underline"
            >
              Ir para o login →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
