import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Solicitacao,
  StatusSolicitacao,
  Agrupamento,
  LogEntry,
  Maquina,
  Validacao,
} from "./types";
import { nowISO } from "./formatters";
import { seedData } from "./seed";

interface Actions {
  login: (username: string) => void;
  logout: () => void;
  addSolicitacao: (s: Omit<Solicitacao, "id" | "createdAt" | "historico" | "agrupamentos" | "status" | "tempoOciosoMin">) => Solicitacao;
  editSolicitacao: (id: string, patch: Partial<Solicitacao>, usuario: string, descricaoMudanca: string) => void;
  revisarSolicitacao: (id: string, novaDescricao: string, usuario: string) => void;
  setStatus: (id: string, status: StatusSolicitacao, usuario: string) => void;
  iniciarPlano: (id: string, programador: string) => void;
  concluirPlano: (id: string, usuario: string) => void;
  salvarObservacoesProg: (id: string, obs: string, usuario: string) => void;
  addAgrupamentosDePDFs: (id: string, arquivos: { nome: string; url?: string }[], usuario: string) => void;
  aplicarMetadadosExcel: (id: string, rows: Record<string, unknown>[], usuario: string) => void;
  toggleChapaRecebida: (solicId: string, agrupId: string) => void;
  alocarAgrupamento: (solicId: string, agrupId: string, maquina: Maquina, diaISO: string, usuario: string) => void;
  desalocarAgrupamento: (solicId: string, agrupId: string) => void;
  iniciarCorte: (solicId: string, agrupId: string, operador: string, validacao: Validacao) => void;
  paralisarCorte: (solicId: string, agrupId: string, operador: string, motivo: string) => void;
  retomarCorte: (solicId: string, agrupId: string, operador: string) => void;
  finalizarCorte: (solicId: string, agrupId: string, operador: string, obs?: string) => void;
  aplicarPassivosAnteriores: () => number;
  resetSeed: () => void;
}

function log(usuario: string, mudanca: string): LogEntry {
  return { usuario, dataHora: nowISO(), mudanca };
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      sessao: null,
      solicitacoes: [],
      nextSolicId: 1,
      nextPlanoNum: 1250,
      seeded: false,

      login: (username) => set({ sessao: { username } }),
      logout: () => set({ sessao: null }),

      addSolicitacao: (data) => {
        const id = `#${String(get().nextSolicId).padStart(4, "0")}`;
        const nova: Solicitacao = {
          ...data,
          id,
          createdAt: nowISO(),
          status: "Em Fila",
          agrupamentos: [],
          tempoOciosoMin: 0,
          historico: [log(data.planejadorCriador, "Solicitação criada")],
        };
        set({
          solicitacoes: [...get().solicitacoes, nova],
          nextSolicId: get().nextSolicId + 1,
        });
        return nova;
      },

      editSolicitacao: (id, patch, usuario, descricaoMudanca) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === id
              ? { ...s, ...patch, historico: [...s.historico, log(usuario, descricaoMudanca)] }
              : s,
          ),
        });
      },

      revisarSolicitacao: (id, novaDescricao, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) => {
            if (s.id !== id) return s;
            if (s.status === "Concluído") {
              return {
                ...s,
                status: "A Revisar",
                descricaoRevisao: novaDescricao,
                historico: [...s.historico, log(usuario, "Solicitou revisão de plano concluído")],
              };
            }
            return {
              ...s,
              descricao: novaDescricao,
              historico: [...s.historico, log(usuario, "Editou descrição")],
            };
          }),
        });
      },

      setStatus: (id, status, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) => {
            if (s.id !== id) return s;
            let extra: Partial<Solicitacao> = {};
            if (status === "Paralisado") extra.paralisadoDesde = nowISO();
            if (s.status === "Paralisado" && status !== "Paralisado" && s.paralisadoDesde) {
              const delta = Math.round((Date.now() - new Date(s.paralisadoDesde).getTime()) / 60000);
              extra.tempoOciosoMin = s.tempoOciosoMin + delta;
              extra.paralisadoDesde = undefined;
            }
            return {
              ...s,
              ...extra,
              status,
              historico: [...s.historico, log(usuario, `Status → ${status}`)],
            };
          }),
        });
      },

      iniciarPlano: (id, programador) => {
        const num = get().nextPlanoNum;
        set({
          nextPlanoNum: num + 1,
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "Em Processo",
                  numeroPlano: `${num}C`,
                  programador,
                  inicioProg: nowISO(),
                  historico: [...s.historico, log(programador, `Iniciou plano ${num}C`)],
                }
              : s,
          ),
        });
      },

      concluirPlano: (id, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "Concluído",
                  fimProg: nowISO(),
                  agrupamentos: s.agrupamentos.map((a) => ({
                    ...a,
                    statusCorte: a.statusCorte === "Aguardando" ? "Aguardando" : a.statusCorte,
                  })),
                  historico: [...s.historico, log(usuario, "Concluiu programação")],
                }
              : s,
          ),
        });
      },

      salvarObservacoesProg: (id, obs, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === id
              ? {
                  ...s,
                  observacoesProgramador: obs,
                  historico: [...s.historico, log(usuario, "Salvou observações do programador")],
                }
              : s,
          ),
        });
      },

      addAgrupamentosDePDFs: (id, arquivos, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) => {
            if (s.id !== id) return s;
            const novos: Agrupamento[] = arquivos.map((f, i) => ({
              id: `${id}-ag-${s.agrupamentos.length + i + 1}`,
              nome: f.nome.replace(/\.pdf$/i, ""),
              pdfNome: f.nome,
              pdfUrl: f.url,
              chapaRecebida: false,
              statusCorte: "Aguardando",
            }));
            return {
              ...s,
              agrupamentos: [...s.agrupamentos, ...novos],
              historico: [...s.historico, log(usuario, `Importou ${arquivos.length} PDF(s) → agrupamentos`)],
            };
          }),
        });
      },

      aplicarMetadadosExcel: (id, rows, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) => {
            if (s.id !== id) return s;
            const map = new Map<string, Record<string, unknown>>();
            rows.forEach((r) => {
              const nome = String(r.Agrupamento ?? r.agrupamento ?? r.Nome ?? r.nome ?? "").trim();
              if (nome) map.set(nome, r);
            });
            return {
              ...s,
              agrupamentos: s.agrupamentos.map((a) => {
                const r = map.get(a.nome) ?? map.get(a.nome.toUpperCase());
                if (!r) return a;
                const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v));
                return {
                  ...a,
                  rir: (r.RIR ?? r.rir ?? a.rir) as string | undefined,
                  material: (r.Material ?? r.material ?? a.material) as string | undefined,
                  espessura: num(r.Espessura ?? r.espessura) ?? a.espessura,
                  comprimento: num(r.Comprimento ?? r.comprimento) ?? a.comprimento,
                  largura: num(r.Largura ?? r.largura) ?? a.largura,
                  qtdItens: num(r.QtdItens ?? r.qtd ?? r.Qtd) ?? a.qtdItens,
                  peso: num(r.Peso ?? r.peso) ?? a.peso,
                  tempoEstMin: num(r.TempoEstMin ?? r.tempo ?? r.Tempo) ?? a.tempoEstMin,
                };
              }),
              historico: [...s.historico, log(usuario, "Aplicou metadados do Excel")],
            };
          }),
        });
      },

      toggleChapaRecebida: (solicId, agrupId) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) =>
                    a.id === agrupId ? { ...a, chapaRecebida: !a.chapaRecebida } : a,
                  ),
                }
              : s,
          ),
        });
      },

      alocarAgrupamento: (solicId, agrupId, maquina, diaISO, usuario) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) =>
                    a.id === agrupId
                      ? { ...a, maquina, diaAlocado: diaISO, statusCorte: "Alocado" }
                      : a,
                  ),
                  historico: [...s.historico, log(usuario, `Alocou ${a_(s, agrupId)} em ${maquina} · ${diaISO}`)],
                }
              : s,
          ),
        });
      },

      desalocarAgrupamento: (solicId, agrupId) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) =>
                    a.id === agrupId && a.statusCorte === "Alocado"
                      ? { ...a, maquina: undefined, diaAlocado: undefined, statusCorte: "Aguardando" }
                      : a,
                  ),
                }
              : s,
          ),
        });
      },

      iniciarCorte: (solicId, agrupId, operador, validacao) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) =>
                    a.id === agrupId
                      ? {
                          ...a,
                          statusCorte: "Em Corte",
                          inicioCorte: nowISO(),
                          operador,
                          validacao,
                        }
                      : a,
                  ),
                  historico: [...s.historico, log(operador, `Iniciou corte de ${a_(s, agrupId)}`)],
                }
              : s,
          ),
        });
      },

      finalizarCorte: (solicId, agrupId, operador, obs) => {
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) =>
                    a.id === agrupId
                      ? { ...a, statusCorte: "Cortado", fimCorte: nowISO(), obsOperacao: obs, operador }
                      : a,
                  ),
                  historico: [...s.historico, log(operador, `Finalizou corte de ${a_(s, agrupId)}`)],
                }
              : s,
          ),
        });
      },

      paralisarCorte: (solicId, agrupId, operador, motivo) => {
        const ts = nowISO();
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) =>
                    a.id === agrupId && a.statusCorte === "Em Corte"
                      ? {
                          ...a,
                          statusCorte: "Corte Paralisado",
                          paradas: [...(a.paradas ?? []), { inicio: ts, motivo, operador }],
                        }
                      : a,
                  ),
                  historico: [...s.historico, log(operador, `Paralisou corte de ${a_(s, agrupId)} — motivo: ${motivo}`)],
                }
              : s,
          ),
        });
      },

      retomarCorte: (solicId, agrupId, operador) => {
        const ts = nowISO();
        set({
          solicitacoes: get().solicitacoes.map((s) =>
            s.id === solicId
              ? {
                  ...s,
                  agrupamentos: s.agrupamentos.map((a) => {
                    if (a.id !== agrupId || a.statusCorte !== "Corte Paralisado") return a;
                    const paradas = [...(a.paradas ?? [])];
                    const idx = paradas.length - 1;
                    if (idx >= 0 && !paradas[idx].fim) paradas[idx] = { ...paradas[idx], fim: ts };
                    return { ...a, statusCorte: "Em Corte", paradas };
                  }),
                  historico: [...s.historico, log(operador, `Retomou corte de ${a_(s, agrupId)}`)],
                }
              : s,
          ),
        });
      },

      aplicarPassivosAnteriores: () => {
        // Segunda-feira desta semana (semana vigente contendo hoje)
        const hoje = new Date();
        const dow = hoje.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(hoje);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() + diff);
        const mondayISO = monday.toISOString().slice(0, 10);
        let count = 0;
        set({
          solicitacoes: get().solicitacoes.map((s) => ({
            ...s,
            agrupamentos: s.agrupamentos.map((a) => {
              if (!a.diaAlocado) return a;
              if (a.statusCorte === "Cortado") return a; // Histórico verde permanece.
              if (a.diaAlocado >= mondayISO) return a; // Semana vigente ou futuras: mantém.
              count++;
              return {
                ...a,
                diaAlocado: undefined,
                maquina: undefined,
                statusCorte: "Aguardando",
                isPassivoAnterior: true,
              };
            }),
            historico: s.agrupamentos.some(
              (a) => a.diaAlocado && a.diaAlocado < mondayISO && a.statusCorte !== "Cortado",
            )
              ? [...s.historico, log("Sistema", "Agrupamento(s) devolvidos como Passivo Anterior (semana fechou sem corte)")]
              : s.historico,
          })),
        });
        return count;
      },

      resetSeed: () => {
        const seed = seedData();
        set({ ...seed, sessao: get().sessao, seeded: true });
      },
    }),
    {
      name: "ime-cnc-store",
      onRehydrateStorage: () => (state) => {
        if (state && !state.seeded) {
          const seed = seedData();
          state.solicitacoes = seed.solicitacoes;
          state.nextSolicId = seed.nextSolicId;
          state.nextPlanoNum = seed.nextPlanoNum;
          state.seeded = true;
        }
      },
    },
  ),
);

function a_(s: Solicitacao, agrupId: string): string {
  return s.agrupamentos.find((x) => x.id === agrupId)?.nome ?? agrupId;
}

export function useSession() {
  return useStore((s) => s.sessao);
}
