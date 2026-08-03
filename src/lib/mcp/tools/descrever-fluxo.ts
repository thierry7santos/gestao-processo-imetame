import { defineTool } from "@lovable.dev/mcp-js";

const ETAPAS = [
  {
    ordem: 1,
    equipe: "Planejamento",
    descricao:
      "Cria a solicitação de plano (OS, título, tipo, data de necessidade, RIRs quando Perfil/Tubulação) e libera para produção.",
    statusGerados: ["Em Fila", "A Revisar", "Cancelado", "Liberado"],
  },
  {
    ordem: 2,
    equipe: "Programação",
    descricao:
      "Gera o número do plano (sufixo C/P/T), importa PDFs criando agrupamentos e aplica metadados via Excel. Controla tempo de programação e ocioso.",
    statusGerados: ["Em Processo", "Paralisado", "Concluído", "Em Revisão", "Revisado"],
  },
  {
    ordem: 3,
    equipe: "Materiais",
    descricao: "Confirma chapa recebida e movimenta os agrupamentos para a preparação.",
    statusGerados: ["Liberado", "Movimentado"],
  },
  {
    ordem: 4,
    equipe: "Preparação",
    descricao:
      "Aloca agrupamentos movimentados no calendário semanal por máquina e turno, respeitando o limite diário de horas.",
    statusGerados: ["Alocado"],
  },
  {
    ordem: 5,
    equipe: "Operação",
    descricao:
      "Valida medidas (poka-yoke), inicia, paralisa com motivo e finaliza o corte no tablet.",
    statusGerados: ["Em Corte", "Corte Paralisado", "Cortado"],
  },
];

export default defineTool({
  name: "descrever_fluxo",
  title: "Descrever o fluxo de produção",
  description:
    "Descreve as etapas do fluxo de gestão de processos CNC (Planejamento → Programação → Materiais → Preparação → Operação) e os status gerados em cada uma.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(ETAPAS, null, 2) }],
    structuredContent: { etapas: ETAPAS },
  }),
});
