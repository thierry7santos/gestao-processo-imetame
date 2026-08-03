import { defineMcp } from "@lovable.dev/mcp-js";
import listarMaquinas from "./tools/listar-maquinas";
import listarStatus from "./tools/listar-status";
import listarPerfis from "./tools/listar-perfis";
import descreverFluxo from "./tools/descrever-fluxo";

export default defineMcp({
  name: "cnc-flow",
  title: "CNC Flow",
  version: "0.1.0",
  instructions:
    "Ferramentas de referência do app de Gestão de Processos CNC da Imetame. Use `descrever_fluxo` para entender as etapas do processo, `listar_status` para os status de solicitações e cortes, `listar_maquinas` para as máquinas por tipo de plano e `listar_perfis` para os perfis de acesso. Os dados operacionais das solicitações ficam no navegador de cada usuário e não são acessíveis por estas ferramentas.",
  tools: [descreverFluxo, listarStatus, listarMaquinas, listarPerfis],
});
