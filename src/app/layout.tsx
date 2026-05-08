import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "NutriX - CRM para Nutricionistas",
  description: "Gestão inteligente para nutricionistas que levam resultados a sério.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
