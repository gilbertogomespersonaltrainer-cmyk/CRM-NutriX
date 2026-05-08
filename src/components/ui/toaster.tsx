"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
};

let toastCallback: ((t: Omit<ToastData, "id">) => void) | null = null;

export function toast(data: Omit<ToastData, "id">) {
  toastCallback?.(data);
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    toastCallback = (data) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...data, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      toastCallback = null;
    };
  }, []);

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            "fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl min-w-[300px] animate-in slide-in-from-bottom-5",
            t.variant === "error"
              ? "border-[#ef4444]/30 bg-[#1a0a0a] text-[#f87171]"
              : t.variant === "success"
              ? "border-[#22c55e]/30 bg-[#0a1a0f] text-[#4ade80]"
              : "border-[#1e1e1e] bg-[#111111] text-white"
          )}
        >
          <div className="flex-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
          </div>
          <ToastPrimitive.Close className="text-[#666] hover:text-white">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport />
    </ToastProvider>
  );
}
