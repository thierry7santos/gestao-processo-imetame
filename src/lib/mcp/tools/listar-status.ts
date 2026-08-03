import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SOLICITACAO: { status: string; significado: string }[] = [
  { status: "Em Fila", significado: "Solicitação criada, aguardando programação." },
  { status: "Em Processo", significado: "Programador trabalhando no plano." },
  { status: "Paralisado", significado: "Programação interrompida; acumula tempo ocioso." },
  { status: "Concluído", significado: "Programação finalizada." },
  { status: "A Revisar", significado: "Planejamento solicitou revisão do plano concluído." },
  { status: "Em Revisão", significado: "Programador executando a revisão." },
  { status: "Revisado", significado: "Revisão concluída." },
  { status: "Cancelado", significado: "Solicitação cancelada." },
];

const CORTE: { status: string; significado: string }[] = [
  { status: "Aguardando", significado: "Agrupamento sem liberação do Planejamento." },
  { status: "Liberado", significado: "Liberado para Materiais." },
  { status: "Movimentado", significado: "Material movimentado; visível para a Preparação." },
  { status: "Alocado", significado: "Alocado em máquina, turno e dia." },
  { status: "Em Corte", significado: "Corte em andamento no operador." },
  { status: "Corte Paralisado", significado: "Corte parado com motivo registrado." },
  { status: "Cortado", significado: "Corte concluído." },
];

export default defineTool({
  name: "listar_status",
  title: "Listar status do processo",
  description:
    "Lista os status possíveis de uma solicitação e de um agrupamento (corte) com o significado de cada um.",
  inputSchema: {
    escopo: z
      .enum(["solicitacao", "corte"])
      .optional()
      .describe("Limita a resposta aos status de solicitação ou de corte."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ escopo }) => {
    const dados = {
      ...(escopo !== "corte" ? { solicitacao: SOLICITACAO } : {}),
      ...(escopo !== "solicitacao" ? { corte: CORTE } : {}),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
      structuredContent: dados,
    };
  },
});
