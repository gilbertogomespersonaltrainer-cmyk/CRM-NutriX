import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — NutriX",
  description:
    "Saiba como o NutriX coleta, utiliza e protege seus dados, em conformidade com a LGPD e as políticas do Google.",
};

const s = {
  p: { color: "#aaa", marginBottom: 14, lineHeight: 1.8 } as React.CSSProperties,
  ul: { margin: "10px 0 14px 20px", color: "#aaa", lineHeight: 1.8 } as React.CSSProperties,
  a: { color: "#22c55e", textDecoration: "none" } as React.CSSProperties,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#ffffff",
          margin: "40px 0 12px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#080808", minHeight: "100vh", color: "#cccccc" }}>
      <header
        style={{
          padding: "28px 5%",
          borderBottom: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
        }}
      >
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 22, fontWeight: 300, color: "#fff" }}>Nutri</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>X</span>
        </a>
      </header>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: -1, marginBottom: 8 }}>
          Política de Privacidade
        </h1>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 48 }}>
          Última atualização: 18 de junho de 2026
        </p>

        <p style={s.p}>
          Esta Política de Privacidade descreve como o <strong>NutriX</strong> (&quot;nós&quot;, &quot;nosso&quot;)
          coleta, utiliza, armazena e protege as informações dos usuários da plataforma{" "}
          <strong>crmnutrix.com.br</strong>. Ao utilizar o NutriX, você concorda com os termos descritos neste
          documento.
        </p>
        <p style={s.p}>
          Esta política está em conformidade com a{" "}
          <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong> e com as políticas de
          privacidade do Google LLC.
        </p>

        <hr style={{ border: "none", borderTop: "1px solid #1a1a1a", margin: "40px 0" }} />

        <Section title="1. Quem somos">
          <p style={s.p}>
            O NutriX é um software de gestão (CRM) desenvolvido exclusivamente para nutricionistas, que permite
            gerenciar pacientes, agendamentos, financeiro e comunicação via WhatsApp. A plataforma é operada por seu
            desenvolvedor e pode ser acessada em{" "}
            <a href="https://crmnutrix.com.br" style={s.a}>crmnutrix.com.br</a>.
          </p>
          <p style={s.p}>
            Para dúvidas ou solicitações relacionadas à privacidade, entre em contato pelo e-mail:{" "}
            <a href="mailto:contato@crmnutrix.com.br" style={s.a}>contato@crmnutrix.com.br</a>
          </p>
        </Section>

        <Section title="2. Dados coletados">
          <p style={s.p}>
            O NutriX coleta dois tipos de dados: dados do nutricionista (titular da conta) e dados dos pacientes
            cadastrados por ele.
          </p>
          <p style={s.p}><strong>Dados do nutricionista:</strong></p>
          <ul style={s.ul}>
            <li>Nome completo, e-mail e senha (armazenada com hash)</li>
            <li>Número de registro profissional (CRN)</li>
            <li>Telefone e nome do consultório</li>
            <li>Token de acesso ao Google Calendar (quando a integração é ativada voluntariamente)</li>
            <li>Dados de conexão do WhatsApp (número conectado e status)</li>
          </ul>
          <p style={s.p}><strong>Dados dos pacientes cadastrados:</strong></p>
          <ul style={s.ul}>
            <li>Nome, CPF (opcional), data de nascimento (opcional), telefone e e-mail (opcional)</li>
            <li>Endereço (opcional) e como encontrou o consultório (opcional)</li>
            <li>Histórico de agendamentos e status de consultas</li>
            <li>Registros financeiros (pagamentos e parcelamentos)</li>
            <li>Anotações clínicas inseridas pelo nutricionista</li>
            <li>Histórico de mensagens trocadas via WhatsApp pelo NutriX</li>
          </ul>
          <div
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 10,
              padding: "18px 22px",
              margin: "24px 0",
              color: "#ccc",
              fontSize: 14,
            }}
          >
            <strong>Importante:</strong> os dados dos pacientes são inseridos exclusivamente pelo nutricionista
            titular da conta. O NutriX não coleta dados de pacientes de forma independente nem acessa informações
            além das fornecidas pelo nutricionista.
          </div>
        </Section>

        <Section title="3. Como usamos os dados">
          <p style={s.p}>Os dados coletados são utilizados exclusivamente para:</p>
          <ul style={s.ul}>
            <li>Operar a plataforma e fornecer os recursos contratados</li>
            <li>Enviar mensagens automáticas de confirmação, lembrete e reativação via WhatsApp</li>
            <li>Sincronizar agendamentos com o Google Calendar do nutricionista (quando autorizado)</li>
            <li>Gerar relatórios financeiros e de pacientes visíveis apenas pelo próprio nutricionista</li>
            <li>Autenticar o acesso à plataforma com segurança</li>
          </ul>
          <p style={s.p}>
            Não utilizamos os dados para publicidade, não os vendemos e não os compartilhamos com terceiros,
            exceto conforme descrito na seção 5.
          </p>
        </Section>

        <Section title="4. Integração com o Google Calendar">
          <p style={s.p}>
            O NutriX oferece integração opcional com o Google Calendar. Ao ativar essa funcionalidade, o
            nutricionista autoriza o NutriX a acessar o escopo:
          </p>
          <ul style={s.ul}>
            <li><code>https://www.googleapis.com/auth/calendar.events</code></li>
          </ul>
          <p style={s.p}>
            Esse escopo permite ao NutriX <strong>criar, atualizar e excluir eventos</strong> no Google Calendar
            do nutricionista, correspondentes aos agendamentos cadastrados na plataforma. O acesso é restrito
            exclusivamente a eventos — o NutriX não lê outros dados da conta Google, como e-mails, contatos ou
            arquivos.
          </p>
          <p style={s.p}>
            O token de acesso ao Google é armazenado de forma segura e utilizado apenas para sincronização de
            agendamentos. O nutricionista pode revogar esse acesso a qualquer momento nas configurações da
            plataforma ou diretamente em{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={s.a}>
              myaccount.google.com/permissions
            </a>.
          </p>
          <p style={s.p}>
            O uso das informações obtidas por meio das APIs do Google está em conformidade com a{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={s.a}
            >
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado.
          </p>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p style={s.p}>
            O NutriX não vende nem compartilha dados pessoais com terceiros para fins comerciais. O
            compartilhamento ocorre apenas nas seguintes situações:
          </p>
          <ul style={s.ul}>
            <li>
              <strong>Google LLC:</strong> para sincronização de agendamentos com o Google Calendar, mediante
              autorização expressa do nutricionista
            </li>
            <li>
              <strong>Provedor de infraestrutura:</strong> os dados são hospedados em servidores seguros para
              operação da plataforma
            </li>
            <li>
              <strong>Obrigação legal:</strong> quando exigido por lei, decisão judicial ou autoridade competente
            </li>
          </ul>
        </Section>

        <Section title="6. Armazenamento e segurança">
          <p style={s.p}>
            Os dados são armazenados em banco de dados protegido, com acesso restrito e autenticado. Senhas são
            armazenadas exclusivamente em formato hash — nunca em texto puro. Tokens de acesso ao Google são
            criptografados em repouso.
          </p>
          <p style={s.p}>
            Adotamos medidas técnicas e organizacionais adequadas para proteger os dados contra acesso não
            autorizado, perda, alteração ou divulgação indevida.
          </p>
        </Section>

        <Section title="7. Retenção de dados">
          <p style={s.p}>
            Os dados são mantidos enquanto a conta do nutricionista estiver ativa na plataforma. Após o
            cancelamento da assinatura, os dados ficam disponíveis por até 30 dias para eventual exportação,
            sendo excluídos definitivamente após esse prazo, salvo obrigação legal de retenção.
          </p>
        </Section>

        <Section title="8. Direitos do titular (LGPD)">
          <p style={s.p}>Em conformidade com a LGPD, o titular dos dados tem direito a:</p>
          <ul style={s.ul}>
            <li>Confirmar a existência de tratamento de seus dados</li>
            <li>Acessar os dados armazenados</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
            <li>Portabilidade dos dados a outro fornecedor de serviço</li>
            <li>Revogar o consentimento a qualquer momento</li>
          </ul>
          <p style={s.p}>
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
            <a href="mailto:contato@crmnutrix.com.br" style={s.a}>contato@crmnutrix.com.br</a>.
            Responderemos em até 15 dias úteis.
          </p>
        </Section>

        <Section title="9. Cookies">
          <p style={s.p}>
            O NutriX utiliza cookies de sessão estritamente necessários para manter o usuário autenticado durante
            o uso da plataforma. Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de
            terceiros.
          </p>
        </Section>

        <Section title="10. Menores de idade">
          <p style={s.p}>
            O NutriX é destinado exclusivamente a profissionais nutricionistas. Não coletamos intencionalmente
            dados de menores de 18 anos como titulares de conta. Dados de pacientes menores de idade podem ser
            cadastrados pelo nutricionista responsável, sob sua inteira responsabilidade legal e ética.
          </p>
        </Section>

        <Section title="11. Alterações nesta política">
          <p style={s.p}>
            Esta política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas ao
            nutricionista por e-mail ou por aviso na plataforma. O uso continuado do NutriX após a notificação
            implica aceitação das alterações.
          </p>
        </Section>

        <Section title="12. Contato">
          <p style={s.p}>
            Para dúvidas, solicitações ou exercício de direitos relacionados a esta política:
          </p>
          <ul style={s.ul}>
            <li>E-mail: <a href="mailto:contato@crmnutrix.com.br" style={s.a}>contato@crmnutrix.com.br</a></li>
            <li>Site: <a href="https://crmnutrix.com.br" style={s.a}>crmnutrix.com.br</a></li>
          </ul>
        </Section>
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
