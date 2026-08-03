import { defineTool } from "@lovable.dev/mcp-js";
import { PERFIS_DESAFIO, perfilLabel, USUARIOS, maquinasDoUsuario } from "@/lib/auth";

export default defineTool({
  name: "listar_perfis",
  title: "Listar perfis e áreas de acesso",
  description:
    "Lista os perfis de acesso do aplicativo (Planejamento, Programação, Materiais, Preparação, Operação), as contas de demonstração de cada um e as máquinas que cada conta acessa.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const perfis = PERFIS_DESAFIO.map((p) => ({
      perfil: p,
      rotulo: perfilLabel(p),
      contasDemo: USUARIOS.filter((u) => u.perfil === p).map((u) => ({
        usuario: u.username,
        nome: u.nome,
        tipo: u.tipo ?? null,
        maquinas: maquinasDoUsuario(u),
      })),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(perfis, null, 2) }],
      structuredContent: { perfis },
    };
  },
});
