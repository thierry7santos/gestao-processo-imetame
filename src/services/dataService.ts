import { useStore } from "@/lib/store";
import type { Maquina, Solicitacao, StatusSolicitacao, Turno, Validacao, Desafio } from "@/lib/types";

// LEITURAS
export function getSolicitacoes(): Solicitacao[] { return useStore.getState().solicitacoes; }
export function getSolicitacaoById(id: string): Solicitacao | undefined {
  return useStore.getState().solicitacoes.find((s) => s.id === id);
}
export function getPassivosAnteriores() {
  useStore.getState().aplicarPassivosAnteriores();
  const out: { solic: Solicitacao; agrupId: string }[] = [];
  for (const s of useStore.getState().solicitacoes) {
    for (const a of s.agrupamentos) {
      if (a.isPassivoAnterior && a.statusCorte === "Movimentado") out.push({ solic: s, agrupId: a.id });
    }
  }
  return out;
}

// GRAVAÇÕES
export const createSolicitacao: ReturnType<typeof useStore.getState>["addSolicitacao"] = (data) =>
  useStore.getState().addSolicitacao(data);
export const updateSolicitacao = (id: string, patch: Partial<Solicitacao>, usuario: string, descricao: string) =>
  useStore.getState().editSolicitacao(id, patch, usuario, descricao);
export const revisarSolicitacao = (id: string, novaDescricao: string, usuario: string) =>
  useStore.getState().revisarSolicitacao(id, novaDescricao, usuario);
export const updateStatus = (id: string, status: StatusSolicitacao, usuario: string) =>
  useStore.getState().setStatus(id, status, usuario);
export const iniciarPlano = (id: string, programador: string) =>
  useStore.getState().iniciarPlano(id, programador);
export const concluirPlano = (id: string, usuario: string) =>
  useStore.getState().concluirPlano(id, usuario);
export const salvarObservacoesProg = (id: string, obs: string, usuario: string) =>
  useStore.getState().salvarObservacoesProg(id, obs, usuario);

// AGRUPAMENTOS
export const addAgrupamentosDePDFs = (id: string, arquivos: { nome: string; url?: string }[], usuario: string) =>
  useStore.getState().addAgrupamentosDePDFs(id, arquivos, usuario);
export const aplicarMetadadosExcel = (id: string, rows: Record<string, unknown>[], usuario: string) =>
  useStore.getState().aplicarMetadadosExcel(id, rows, usuario);
export const toggleChapaRecebida = (solicId: string, agrupId: string) =>
  useStore.getState().toggleChapaRecebida(solicId, agrupId);
export const liberarSolicitacao = (solicId: string, usuario: string) =>
  useStore.getState().liberarSolicitacao(solicId, usuario);
export const movimentarAgrupamento = (solicId: string, agrupId: string, usuario: string) =>
  useStore.getState().movimentarAgrupamento(solicId, agrupId, usuario);
export const alocarAgrupamento = (solicId: string, agrupId: string, maquina: Maquina, turno: Turno, diaISO: string, usuario: string) =>
  useStore.getState().alocarAgrupamento(solicId, agrupId, maquina, turno, diaISO, usuario);
export const desalocarAgrupamento = (solicId: string, agrupId: string) =>
  useStore.getState().desalocarAgrupamento(solicId, agrupId);
export const iniciarSetup = (solicId: string, agrupId: string, usuario: string) =>
  useStore.getState().iniciarSetup(solicId, agrupId, usuario);
export const finalizarSetup = (solicId: string, agrupId: string, usuario: string) =>
  useStore.getState().finalizarSetup(solicId, agrupId, usuario);
export const reabrirSetup = (solicId: string, agrupId: string, usuario: string) =>
  useStore.getState().reabrirSetup(solicId, agrupId, usuario);

// CORTE
export const iniciarCorte = (solicId: string, agrupId: string, operador: string, validacao: Validacao) =>
  useStore.getState().iniciarCorte(solicId, agrupId, operador, validacao);
export const paralisarCorte = (solicId: string, agrupId: string, operador: string, motivo: string) =>
  useStore.getState().paralisarCorte(solicId, agrupId, operador, motivo);
export const retomarCorte = (solicId: string, agrupId: string, operador: string) =>
  useStore.getState().retomarCorte(solicId, agrupId, operador);
export const finalizarCorte = (solicId: string, agrupId: string, operador: string, obs?: string) =>
  useStore.getState().finalizarCorte(solicId, agrupId, operador, obs);

// DESAFIOS
export const addDesafio = (d: Omit<Desafio, "id" | "criadoEm" | "status">) =>
  useStore.getState().addDesafio(d);
export const resolverDesafio = (id: string, resolucao: string, usuario: string) =>
  useStore.getState().resolverDesafio(id, resolucao, usuario);

export const aplicarPassivosAnteriores = () =>
  useStore.getState().aplicarPassivosAnteriores();

export const MOTIVOS_PARADA = [
  "Troca de Bico", "Falta de Gás", "Manutenção da Máquina",
  "Aguardando Ponte Rolante", "Troca de Chapa", "Outro",
] as const;
