import type { Solicitacao, Agrupamento } from "./types";
import { nowISO, todayISO, addDays } from "./formatters";

function agrup(
  id: string,
  nome: string,
  overrides: Partial<Agrupamento> = {},
): Agrupamento {
  return {
    id,
    nome,
    pdfNome: `${nome}.pdf`,
    rir: "RIR-2024-" + Math.floor(1000 + Math.random() * 9000),
    material: "ASTM A36",
    espessura: 12.5,
    comprimento: 6000,
    largura: 2000,
    qtdItens: 24,
    peso: 1180,
    tempoEstMin: 95,
    chapaRecebida: true,
    statusCorte: "Aguardando",
    ...overrides,
  };
}

export function seedData(): {
  solicitacoes: Solicitacao[];
  nextSolicId: number;
  nextPlanoNum: number;
} {
  const hoje = todayISO();
  const list: Solicitacao[] = [];

  // #0001 - Concluída com histórico de corte
  list.push({
    id: "#0001",
    os: "0751.03.001",
    titulo: "Costado do vaso separador",
    tipo: "Chapa",
    dataNecessidade: addDays(hoje, -2),
    descricao: "Chapas do costado conforme desenho DES-1201.",
    anexos: [{ nome: "DES-1201.pdf" }],
    emergencia: false,
    status: "Concluído",
    planejadorCriador: "Carlos Planejador",
    createdAt: nowISO(),
    numeroPlano: "1247C",
    programador: "Marcos Programador",
    inicioProg: nowISO(),
    fimProg: nowISO(),
    tempoOciosoMin: 12,
    observacoesProgramador: "Otimizado aproveitamento de sobra.",
    agrupamentos: [
      agrup("s1-a1", "1247C01", {
        maquina: "CNC-3",
        diaAlocado: addDays(hoje, -1),
        statusCorte: "Cortado",
        inicioCorte: nowISO(),
        fimCorte: nowISO(),
        operador: "João Operador CNC",
        validacao: { matOk: true, rirOk: true, espOk: true, compDigitado: 6000, largDigitado: 2000, divergenciaAceita: false },
      }),
      agrup("s1-a2", "1247C02", {
        maquina: "CNC-3",
        diaAlocado: addDays(hoje, -1),
        statusCorte: "Cortado",
        inicioCorte: nowISO(),
        fimCorte: nowISO(),
        operador: "João Operador CNC",
        comprimento: 6000, largura: 2000,
        validacao: { matOk: true, rirOk: true, espOk: true, compDigitado: 6080, largDigitado: 2005, divergenciaAceita: true },
      }),
    ],
    historico: [
      { usuario: "Carlos Planejador", dataHora: nowISO(), mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: nowISO(), mudanca: "Iniciou plano 1247C" },
      { usuario: "Marcos Programador", dataHora: nowISO(), mudanca: "Concluiu programação" },
      { usuario: "João Operador CNC", dataHora: nowISO(), mudanca: "Cortou 1247C01 e 1247C02" },
    ],
  });

  // #0002 - Em Fila, emergência hoje
  list.push({
    id: "#0002",
    os: "0751.03.002",
    titulo: "Bocais e reforços",
    tipo: "Chapa",
    dataNecessidade: hoje,
    descricao: "Corte urgente para montagem noturna.",
    anexos: [{ nome: "MEMO-URG.pdf" }],
    emergencia: true,
    status: "Em Fila",
    planejadorCriador: "Ana Planejadora Auxiliar",
    createdAt: nowISO(),
    tempoOciosoMin: 0,
    agrupamentos: [],
    historico: [{ usuario: "Ana Planejadora Auxiliar", dataHora: nowISO(), mudanca: "Solicitação criada (Emergência)" }],
  });

  // #0003 - Em Processo, com agrupamentos e alocados para hoje
  list.push({
    id: "#0003",
    os: "0751.04.010",
    titulo: "Estrutura de skid",
    tipo: "Perfil",
    dataNecessidade: addDays(hoje, 3),
    descricao: "Perfis W e cantoneiras conforme lista.",
    anexos: [{ nome: "LISTA-SKID.pdf" }],
    emergencia: false,
    status: "Concluído",
    planejadorCriador: "Carlos Planejador",
    createdAt: nowISO(),
    numeroPlano: "1248C",
    programador: "Marcos Programador",
    inicioProg: nowISO(),
    fimProg: nowISO(),
    tempoOciosoMin: 35,
    agrupamentos: [
      agrup("s3-a1", "1248C01", { maquina: "CNC-3", diaAlocado: hoje, statusCorte: "Alocado", tempoEstMin: 110, peso: 1420 }),
      agrup("s3-a2", "1248C02", { maquina: "Messer", diaAlocado: hoje, statusCorte: "Alocado", tempoEstMin: 85, peso: 980 }),
      agrup("s3-a3", "1248C03", { maquina: "CNC-3", diaAlocado: addDays(hoje, 1), statusCorte: "Alocado", tempoEstMin: 120, peso: 1600 }),
    ],
    historico: [
      { usuario: "Carlos Planejador", dataHora: nowISO(), mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: nowISO(), mudanca: "Iniciou plano 1248C" },
    ],
  });

  // #0004 - Em fila
  list.push({
    id: "#0004",
    os: "0751.05.007",
    titulo: "Flanges e anéis",
    tipo: "Chapa",
    dataNecessidade: addDays(hoje, 5),
    descricao: "Aguardando material chegar.",
    anexos: [],
    emergencia: false,
    status: "Em Fila",
    planejadorCriador: "Carlos Planejador",
    createdAt: nowISO(),
    tempoOciosoMin: 0,
    agrupamentos: [],
    historico: [{ usuario: "Carlos Planejador", dataHora: nowISO(), mudanca: "Solicitação criada" }],
  });

  // #0005 - A Revisar
  list.push({
    id: "#0005",
    os: "0751.03.001",
    titulo: "Costado do vaso separador (revisão)",
    tipo: "Chapa",
    dataNecessidade: addDays(hoje, 1),
    descricao: "Descrição original.",
    descricaoRevisao: "Novo material A516 Gr70 conforme nota de revisão.",
    anexos: [{ nome: "REV-01.pdf" }],
    emergencia: false,
    status: "A Revisar",
    planejadorCriador: "Ana Planejadora Auxiliar",
    createdAt: nowISO(),
    numeroPlano: "1249C",
    programador: "Marcos Programador",
    inicioProg: nowISO(),
    fimProg: nowISO(),
    tempoOciosoMin: 8,
    agrupamentos: [
      agrup("s5-a1", "1249C01", { maquina: "CNC-3", diaAlocado: addDays(hoje, 1), statusCorte: "Alocado" }),
    ],
    historico: [
      { usuario: "Ana Planejadora Auxiliar", dataHora: nowISO(), mudanca: "Solicitou revisão de plano concluído" },
    ],
  });

  return { solicitacoes: list, nextSolicId: 6, nextPlanoNum: 1250 };
}
