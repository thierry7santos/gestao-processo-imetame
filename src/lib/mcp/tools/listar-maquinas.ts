import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MAQUINAS_POR_TIPO } from "@/lib/auth";
import type { TipoPlano } from "@/lib/types";

const TIPOS: TipoPlano[] = ["Chapa", "Perfil", "Tubulação"];

export default defineTool({
  name: "listar_maquinas",
  title: "Listar máquinas por tipo de plano",
  description:
    "Lista as máquinas de corte CNC disponíveis, opcionalmente filtradas por tipo de plano (Chapa, Perfil ou Tubulação).",
  inputSchema: {
    tipo: z
      .enum(["Chapa", "Perfil", "Tubulação"])
      .optional()
      .describe("Tipo do plano para filtrar as máquinas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ tipo }) => {
    const tipos = tipo ? [tipo] : TIPOS;
    const dados = tipos.map((t) => ({ tipo: t, maquinas: MAQUINAS_POR_TIPO[t] }));
    return {
      content: [{ type: "text", text: JSON.stringify(dados, null, 2) }],
      structuredContent: { tipos: dados },
    };
  },
});
