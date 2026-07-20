/**
 * ============================================================================
 * dataService — Camada de serviço centralizada (IME Corte CNC)
 * ============================================================================
 *
 * Todas as leituras/gravações do domínio passam por este arquivo. Hoje ele
 * delega ao store Zustand persistido em localStorage. Quando a TI da Imetame
 * plugar o backend SQL, basta trocar a implementação de cada função abaixo por
 * uma chamada HTTP (fetch/axios) — a UI não precisa ser alterada.
 *
 * Convenção dos TODOs:
 *   // TODO: Substituir por API Backend SQL — <MÉTODO> <ROTA>
 *
 * Sugestão de rotas REST correspondentes:
 *   GET    /api/solicitacoes
 *   POST   /api/solicitacoes
 *   PATCH  /api/solicitacoes/:id
 *   POST   /api/solicitacoes/:id/revisao
 *   POST   /api/solicitacoes/:id/iniciar
 *   POST   /api/solicitacoes/:id/concluir
 *   POST   /api/solicitacoes/:id/agrupamentos (PDFs)
 *   POST   /api/solicitacoes/:id/agrupamentos/metadados (Excel)
 *   PATCH  /api/agrupamentos/:id/chapa-recebida
 *   POST   /api/agrupamentos/:id/alocar
 *   POST   /api/agrupamentos/:id/desalocar
 *   POST   /api/agrupamentos/:id/corte/iniciar
 *   POST   /api/agrupamentos/:id/corte/paralisar
 *   POST   /api/agrupamentos/:id/corte/retomar
 *   POST   /api/agrupamentos/:id/corte/finalizar
 *   POST   /api/manutencao/passivos-anteriores
 */

import { useStore } from "@/lib/store";
import type {
  Maquina,
  Solicitacao,
  StatusSolicitacao,
  Validacao,
} from "@/lib/types";

// ============================================================================
// LEITURAS
// ============================================================================

/** TODO: Substituir por API Backend SQL — GET /api/solicitacoes */
export function getSolicitacoes(): Solicitacao[] {
  return useStore.getState().solicitacoes;
}

/** TODO: Substituir por API Backend SQL — GET /api/solicitacoes/:id */
export function getSolicitacaoById(id: string): Solicitacao | undefined {
  return useStore.getState().solicitacoes.find((s) => s.id === id);
}

/**
 * Retorna todos os agrupamentos marcados como Passivo Anterior (não cortados
 * em semanas fechadas). Executa antes a rotina que os identifica e devolve
 * para a lista de disponíveis.
 * TODO: Substituir por API Backend SQL — GET /api/agrupamentos/passivos-anteriores
 */
export function getPassivosAnteriores() {
  useStore.getState().aplicarPassivosAnteriores();
  const out: { solic: Solicitacao; agrupId: string }[] = [];
  for (const s of useStore.getState().solicitacoes) {
    for (const a of s.agrupamentos) {
      if (a.isPassivoAnterior && a.statusCorte === "Aguardando") {
        out.push({ solic: s, agrupId: a.id });
      }
    }
  }
  return out;
}

// ============================================================================
// GRAVAÇÕES — SOLICITAÇÕES
// ============================================================================

/** TODO: Substituir por API Backend SQL — POST /api/solicitacoes */
export const createSolicitacao = (
  ...args: Parameters<typeof useStore.getState extends () => infer S ? S extends { addSolicitacao: infer F } ? F : never : never>
) => useStore.getState().addSolicitacao(...(args as Parameters<ReturnType<typeof useStore.getState>["addSolicitacao"]>));

/** TODO: Substituir por API Backend SQL — PATCH /api/solicitacoes/:id */
export const updateSolicitacao = (
  id: string,
  patch: Partial<Solicitacao>,
  usuario: string,
  descricao: string,
) => useStore.getState().editSolicitacao(id, patch, usuario, descricao);

/** TODO: Substituir por API Backend SQL — POST /api/solicitacoes/:id/revisao */
export const revisarSolicitacao = (id: string, novaDescricao: string, usuario: string) =>
  useStore.getState().revisarSolicitacao(id, novaDescricao, usuario);

/** TODO: Substituir por API Backend SQL — PATCH /api/solicitacoes/:id/status */
export const updateStatus = (id: string, status: StatusSolicitacao, usuario: string) =>
  useStore.getState().setStatus(id, status, usuario);

/** TODO: Substituir por API Backend SQL — POST /api/solicitacoes/:id/iniciar */
export const iniciarPlano = (id: string, programador: string) =>
  useStore.getState().iniciarPlano(id, programador);

/** TODO: Substituir por API Backend SQL — POST /api/solicitacoes/:id/concluir */
export const concluirPlano = (id: string, usuario: string) =>
  useStore.getState().concluirPlano(id, usuario);

/** TODO: Substituir por API Backend SQL — PATCH /api/solicitacoes/:id/observacoes */
export const salvarObservacoesProg = (id: string, obs: string, usuario: string) =>
  useStore.getState().salvarObservacoesProg(id, obs, usuario);

// ============================================================================
// AGRUPAMENTOS
// ============================================================================

/** TODO: Substituir por API Backend SQL — POST /api/solicitacoes/:id/agrupamentos (multipart PDFs) */
export const addAgrupamentosDePDFs = (
  id: string,
  arquivos: { nome: string; url?: string }[],
  usuario: string,
) => useStore.getState().addAgrupamentosDePDFs(id, arquivos, usuario);

/** TODO: Substituir por API Backend SQL — POST /api/solicitacoes/:id/agrupamentos/metadados */
export const aplicarMetadadosExcel = (
  id: string,
  rows: Record<string, unknown>[],
  usuario: string,
) => useStore.getState().aplicarMetadadosExcel(id, rows, usuario);

/** TODO: Substituir por API Backend SQL — PATCH /api/agrupamentos/:id/chapa-recebida */
export const toggleChapaRecebida = (solicId: string, agrupId: string) =>
  useStore.getState().toggleChapaRecebida(solicId, agrupId);

/** TODO: Substituir por API Backend SQL — POST /api/agrupamentos/:id/alocar */
export const alocarAgrupamento = (
  solicId: string,
  agrupId: string,
  maquina: Maquina,
  diaISO: string,
  usuario: string,
) => useStore.getState().alocarAgrupamento(solicId, agrupId, maquina, diaISO, usuario);

/** TODO: Substituir por API Backend SQL — POST /api/agrupamentos/:id/desalocar */
export const desalocarAgrupamento = (solicId: string, agrupId: string) =>
  useStore.getState().desalocarAgrupamento(solicId, agrupId);

// ============================================================================
// CORTE (Operador)
// ============================================================================

/** TODO: Substituir por API Backend SQL — POST /api/agrupamentos/:id/corte/iniciar */
export const iniciarCorte = (
  solicId: string,
  agrupId: string,
  operador: string,
  validacao: Validacao,
) => useStore.getState().iniciarCorte(solicId, agrupId, operador, validacao);

/** TODO: Substituir por API Backend SQL — POST /api/agrupamentos/:id/corte/paralisar */
export const paralisarCorte = (
  solicId: string,
  agrupId: string,
  operador: string,
  motivo: string,
) => useStore.getState().paralisarCorte(solicId, agrupId, operador, motivo);

/** TODO: Substituir por API Backend SQL — POST /api/agrupamentos/:id/corte/retomar */
export const retomarCorte = (solicId: string, agrupId: string, operador: string) =>
  useStore.getState().retomarCorte(solicId, agrupId, operador);

/** TODO: Substituir por API Backend SQL — POST /api/agrupamentos/:id/corte/finalizar */
export const finalizarCorte = (
  solicId: string,
  agrupId: string,
  operador: string,
  obs?: string,
) => useStore.getState().finalizarCorte(solicId, agrupId, operador, obs);

// ============================================================================
// MANUTENÇÃO
// ============================================================================

/**
 * Varre a base procurando agrupamentos alocados em semanas passadas cujo
 * corte não foi finalizado, devolvendo-os para o topo da lista de
 * "Disponíveis" com a flag `isPassivoAnterior = true`.
 * TODO: Substituir por API Backend SQL — POST /api/manutencao/passivos-anteriores
 */
export const aplicarPassivosAnteriores = () =>
  useStore.getState().aplicarPassivosAnteriores();

export const MOTIVOS_PARADA = [
  "Troca de Bico",
  "Falta de Gás",
  "Manutenção da Máquina",
  "Aguardando Ponte Rolante",
  "Troca de Chapa",
  "Outro",
] as const;
