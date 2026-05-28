interface TemplateVars {
  nome_paciente: string;
  nome_nutricionista: string;
  nome_clinica: string;
  data_consulta?: string;
  hora_consulta?: string;
  tipo_consulta?: string;
}

export function replaceTemplateVars(
  content: string,
  vars: TemplateVars
): string {
  return content
    .replace(/{nome_paciente}/g, vars.nome_paciente)
    .replace(/{nome_nutricionista}/g, vars.nome_nutricionista)
    .replace(/{nome_clinica}/g, vars.nome_clinica)
    .replace(/{data_consulta}/g, vars.data_consulta || "")
    .replace(/{hora_consulta}/g, vars.hora_consulta || "")
    .replace(/{tipo_consulta}/g, vars.tipo_consulta || "");
}

export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

export function formatTimeBR(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
