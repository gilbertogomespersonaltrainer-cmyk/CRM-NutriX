import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NutriX — CRM para Nutricionistas",
  description:
    "NutriX é um software de gestão completo para nutricionistas: pacientes, agendamentos, financeiro, automações WhatsApp e integração com Google Agenda.",
};

export default function AboutPage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#080808", minHeight: "100vh", color: "#cccccc" }}>
      <header
        style={{
          padding: "28px 5%",
          borderBottom: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 22, fontWeight: 300, color: "#fff" }}>Nutri</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>X</span>
        </a>
        <a
          href="/login"
          style={{
            fontSize: 14,
            color: "#22c55e",
            textDecoration: "none",
            border: "1px solid rgba(34,197,94,0.3)",
            padding: "8px 16px",
            borderRadius: 8,
          }}
        >
          Entrar
        </a>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "80px 24px 100px" }}>
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#22c55e",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            CRM para Nutricionistas
          </span>
        </div>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1.5,
            marginBottom: 20,
            lineHeight: 1.1,
          }}
        >
          Nutri<span style={{ color: "#22c55e" }}>X</span>
        </h1>

        <p style={{ fontSize: 20, color: "#888", marginBottom: 48, lineHeight: 1.6, maxWidth: 600 }}>
          Software de gestão completo para nutricionistas que querem organizar pacientes,
          agendamentos, financeiro e comunicação em um único lugar.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 60,
          }}
        >
          {[
            { title: "Gestão de Pacientes", desc: "Cadastro completo com histórico, tags e pipeline de acompanhamento." },
            { title: "Agendamentos", desc: "Agenda integrada com sincronização automática no Google Agenda." },
            { title: "Automações WhatsApp", desc: "Confirmações, lembretes e reativação de pacientes inativos no automático." },
            { title: "Financeiro", desc: "Controle de honorários, inadimplentes e relatórios de faturamento." },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "#0d0d0d",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                padding: "20px 22px",
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{item.title}</p>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <a
            href="/login"
            style={{
              background: "#22c55e",
              color: "#000",
              fontWeight: 600,
              fontSize: 15,
              padding: "12px 28px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Acessar plataforma
          </a>
          <a
            href="/privacidade"
            style={{
              color: "#555",
              fontSize: 14,
              padding: "12px 20px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            Política de Privacidade
          </a>
        </div>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: 32,
          borderTop: "1px solid #1a1a1a",
          fontSize: 12,
          color: "#444",
        }}
      >
        &copy; 2026 NutriX. Todos os direitos reservados.
      </footer>
    </div>
  );
}
