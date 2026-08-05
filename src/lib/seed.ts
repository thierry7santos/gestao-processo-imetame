import type { Solicitacao, Agrupamento, Desafio } from "./types";
import { nowISO, todayISO, addDays } from "./formatters";

function agrup(id: string, nome: string, overrides: Partial<Agrupamento> = {}): Agrupamento {
  return {
    id,
    nome,
    pdfNome: `${nome}.pdf`,
    rir: "RIR-2026-" + Math.floor(1000 + Math.random() * 9000),
    codigoMaterial: "CHA0100000000",
    material: "ASTM A36",
    espessura: 12.5,
    comprimento: 6000,
    largura: 2000,
    qtdItens: 18,
    peso: 980,
    tempoEstMin: 85,
    chapaRecebida: false,
    statusCorte: "Aguardando",
    ...overrides,
  };
}

export function seedData(): {
  solicitacoes: Solicitacao[];
  desafios: Desafio[];
  nextSolicId: number;
  nextPlanoNum: number;
  nextPlanoNumP: number;
  nextPlanoNumT: number;
  nextDesafioId: number;
  nextLiberacaoNum: number;
} {
  const hoje = todayISO();
  const ts = nowISO();
  const list: Solicitacao[] = [];

  // #0001 - Chapa · Movimentado + já parcialmente Alocado (Preparação já atuou)
  list.push({
    id: "#0001",
    os: "0751.03.001",
    titulo: "Costado do vaso separador",
    tipo: "Chapa",
    dataNecessidade: addDays(hoje, 2),
    descricao: "Chapas do costado conforme desenho DES-1201.",
    anexos: [{ nome: "DES-1201.pdf" }],
    emergencia: false,
    status: "Concluído",
    planejadorCriador: "Carlos Planejador",
    createdAt: ts,
    numeroPlano: "1250C",
    numeroLiberacao: "L100234",
    liberacaoEm: ts,
    liberacaoPor: "Carlos Planejador",
    programador: "Marcos Programador",
    inicioProg: ts,
    fimProg: ts,
    tempoOciosoMin: 12,
    agrupamentos: [
      agrup("s1-a1", "1250C01", {
        maquina: "CNC-3", turno: "Dia", diaAlocado: hoje,
        statusCorte: "Alocado", chapaRecebida: true,
        peso: 1180, tempoEstMin: 95,
        liberadoEm: ts, liberadoPor: "Carlos Planejador",
        movimentadoEm: ts, movimentadoPor: "Luís Materiais",
      }),
      agrup("s1-a2", "1250C02", {
        statusCorte: "Movimentado",
        peso: 1050, tempoEstMin: 78,
        liberadoEm: ts, liberadoPor: "Carlos Planejador",
        movimentadoEm: ts, movimentadoPor: "Luís Materiais",
      }),
    ],
    historico: [
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: ts, mudanca: "Iniciou plano 1250C" },
      { usuario: "Marcos Programador", dataHora: ts, mudanca: "Concluiu programação" },
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Liberou 2 agrupamento(s) para Materiais" },
      { usuario: "Luís Materiais", dataHora: ts, mudanca: "Materiais movimentou 1250C01" },
      { usuario: "Luís Materiais", dataHora: ts, mudanca: "Materiais movimentou 1250C02" },
      { usuario: "Roberto Prep. Chapa", dataHora: ts, mudanca: "Alocou 1250C01 em CNC-3 · Dia · " + hoje },
    ],
  });

  // #0002 - Chapa · Emergência hoje, em fila
  list.push({
    id: "#0002",
    os: "0751.03.002",
    titulo: "Bocais e reforços urgentes",
    tipo: "Chapa",
    dataNecessidade: hoje,
    descricao: "Corte urgente para montagem noturna.",
    anexos: [{ nome: "MEMO-URG.pdf" }],
    emergencia: true,
    status: "Em Fila",
    planejadorCriador: "Carlos Planejador",
    createdAt: ts,
    tempoOciosoMin: 0,
    agrupamentos: [],
    historico: [{ usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada (Emergência)" }],
  });

  // #0003 - Chapa · Concluído + Liberado (aguardando Materiais)
  list.push({
    id: "#0003",
    os: "0751.04.010",
    titulo: "Estrutura de skid",
    tipo: "Chapa",
    dataNecessidade: addDays(hoje, 3),
    descricao: "Chapas do skid — conjunto DES-3020.",
    anexos: [{ nome: "LISTA-SKID.pdf" }],
    emergencia: false,
    status: "Concluído",
    planejadorCriador: "Carlos Planejador",
    createdAt: ts,
    numeroPlano: "1251C",
    numeroLiberacao: "L100235",
    liberacaoEm: ts,
    liberacaoPor: "Carlos Planejador",
    programador: "Marcos Programador",
    inicioProg: ts,
    fimProg: ts,
    tempoOciosoMin: 20,
    agrupamentos: [
      agrup("s3-a1", "1251C01", { statusCorte: "Liberado", liberadoEm: ts, liberadoPor: "Carlos Planejador", peso: 1420, tempoEstMin: 110 }),
      agrup("s3-a2", "1251C02", { statusCorte: "Liberado", liberadoEm: ts, liberadoPor: "Carlos Planejador", peso: 980,  tempoEstMin: 85 }),
    ],
    historico: [
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: ts, mudanca: "Concluiu programação" },
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Liberou 2 agrupamento(s) para Materiais" },
    ],
  });

  // #0004 - Perfil · Concluído + Movimentado (pronto para Preparação Perfil)
  list.push({
    id: "#0004",
    os: "0752.02.005",
    titulo: "Perfis de sustentação",
    tipo: "Perfil",
    dataNecessidade: addDays(hoje, 4),
    descricao: "Perfis W e cantoneiras — lista LP-405.",
    rirsPerfis: "RIR-P-2026-0012, RIR-P-2026-0014",
    anexos: [{ nome: "LP-405.pdf" }],
    emergencia: false,
    status: "Concluído",
    planejadorCriador: "Carlos Planejador",
    createdAt: ts,
    numeroPlano: "150P",
    numeroLiberacao: "L100236",
    liberacaoEm: ts,
    liberacaoPor: "Carlos Planejador",
    programador: "Marcos Programador",
    inicioProg: ts,
    fimProg: ts,
    tempoOciosoMin: 8,
    agrupamentos: [
      agrup("s4-a1", "150P01", {
        statusCorte: "Movimentado", material: "ASTM A572 Gr50", espessura: 9.5, peso: 620, tempoEstMin: 65,
        liberadoEm: ts, liberadoPor: "Carlos Planejador",
        movimentadoEm: ts, movimentadoPor: "Luís Materiais",
      }),
    ],
    historico: [
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: ts, mudanca: "Concluiu programação" },
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Liberou 1 agrupamento(s) para Materiais" },
      { usuario: "Luís Materiais", dataHora: ts, mudanca: "Materiais movimentou 150P01" },
    ],
  });

  // #0005 - Tubo · Concluído + Movimentado (pronto para Preparação Tubo)
  list.push({
    id: "#0005",
    os: "0753.01.020",
    titulo: "Bocais tubulares",
    tipo: "Tubulação",
    dataNecessidade: addDays(hoje, 5),
    descricao: "Bocais e conexões — desenho DT-201.",
    rirsTubos: "RIR-T-2026-0033",
    anexos: [{ nome: "DT-201.pdf" }],
    emergencia: false,
    status: "Concluído",
    planejadorCriador: "Carlos Planejador",
    createdAt: ts,
    numeroPlano: "320T",
    numeroLiberacao: "L100237",
    liberacaoEm: ts,
    liberacaoPor: "Carlos Planejador",
    programador: "Marcos Programador",
    inicioProg: ts,
    fimProg: ts,
    tempoOciosoMin: 5,
    agrupamentos: [
      agrup("s5-a1", "320T01", {
        statusCorte: "Movimentado", material: "ASTM A106 Gr B", espessura: 8, peso: 410, tempoEstMin: 55,
        liberadoEm: ts, liberadoPor: "Carlos Planejador",
        movimentadoEm: ts, movimentadoPor: "Luís Materiais",
      }),
    ],
    historico: [
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: ts, mudanca: "Concluiu programação" },
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Liberou 1 agrupamento(s) para Materiais" },
      { usuario: "Luís Materiais", dataHora: ts, mudanca: "Materiais movimentou 320T01" },
    ],
  });

  // #0006 - Chapa · Em Processo (na mesa do programador)
  list.push({
    id: "#0006",
    os: "0751.06.030",
    titulo: "Tampos e flanges",
    tipo: "Chapa",
    dataNecessidade: addDays(hoje, 6),
    descricao: "Chapas grossas conforme lista LT-210.",
    anexos: [],
    emergencia: false,
    status: "Em Processo",
    planejadorCriador: "Carlos Planejador",
    createdAt: ts,
    numeroPlano: "1252C",
    programador: "Marcos Programador",
    inicioProg: ts,
    tempoOciosoMin: 0,
    agrupamentos: [],
    historico: [
      { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada" },
      { usuario: "Marcos Programador", dataHora: ts, mudanca: "Iniciou plano 1252C" },
    ],
  });


  // ---- Massa de testes adicional (#0007 em diante) ----
  const titulos = [
    "Chapas do tanque pulmão", "Reforços de base", "Costado seção B", "Anéis de reforço",
    "Tampos elípticos", "Suportes de tubulação", "Berços do vaso", "Escada e guarda-corpo",
    "Plataforma de acesso", "Flanges cegos", "Perfis de contraventamento", "Vigas principais",
    "Colunas de sustentação", "Cantoneiras de fixação", "Terças de cobertura", "Spools de processo",
    "Bocais de inspeção", "Curvas e reduções", "Ramais secundários", "Conexões de dreno",
  ];
  const materiais: Record<string, { mat: string; cod: string }> = {
    Chapa: { mat: "ASTM A36", cod: "CHA0100000000" },
    Perfil: { mat: "ASTM A572 Gr50", cod: "PER0200000000" },
    "Tubulação": { mat: "ASTM A106 Gr B", cod: "TUB0300000000" },
  };
  const estados: Array<"Liberado" | "Movimentado" | "Alocado" | "Cortado"> = [
    "Liberado", "Liberado", "Movimentado", "Liberado", "Alocado",
    "Movimentado", "Liberado", "Cortado", "Liberado", "Movimentado",
  ];

  let planoC = 1253, planoP = 151, planoT = 321, lib = 100238;

  for (let i = 0; i < 20; i++) {
    const n = 7 + i;
    const tipo: "Chapa" | "Perfil" | "Tubulação" = i % 3 === 0 ? "Chapa" : i % 3 === 1 ? "Perfil" : "Tubulação";
    const plano =
      tipo === "Chapa" ? `${planoC++}C` : tipo === "Perfil" ? `${planoP++}P` : `${planoT++}T`;
    const liberacao = "L" + (lib++);
    const id = "#" + String(n).padStart(4, "0");
    const est = estados[i % estados.length];
    const nAgr = (i % 3) + 1;
    const info = materiais[tipo];
    const agrs: Agrupamento[] = [];
    for (let k = 1; k <= nAgr; k++) {
      const stKa = k === nAgr ? est : (est === "Liberado" ? "Liberado" : "Movimentado");
      agrs.push(
        agrup(`s${n}-a${k}`, `${plano}${String(k).padStart(2, "0")}`, {
          statusCorte: stKa,
          material: info.mat,
          codigoMaterial: info.cod,
          rir: `RIR-2026-${2000 + n * 7 + k}`,
          espessura: [6.35, 9.5, 12.5, 19, 25.4][(i + k) % 5],
          comprimento: [3000, 6000, 12000][(i + k) % 3],
          largura: [1200, 1500, 2000, 2400][(i + k) % 4],
          qtdItens: 6 + ((i * 3 + k) % 24),
          peso: 380 + ((i * 137 + k * 53) % 1400),
          tempoEstMin: 40 + ((i * 17 + k * 11) % 120),
          chapaRecebida: stKa !== "Liberado",
          liberadoEm: ts,
          liberadoPor: "Carlos Planejador",
          ...(stKa !== "Liberado"
            ? { movimentadoEm: ts, movimentadoPor: "Luís Materiais" }
            : {}),
        }),
      );
    }
    list.push({
      id,
      os: `075${1 + (i % 3)}.0${1 + (i % 8)}.0${(i % 9) + 1}0`,
      titulo: titulos[i],
      tipo,
      dataNecessidade: addDays(hoje, (i % 12) - 1),
      descricao: `${titulos[i]} — conforme desenho DES-${3000 + i}.`,
      ...(tipo === "Perfil" ? { rirsPerfis: `RIR-P-2026-${100 + i}` } : {}),
      ...(tipo === "Tubulação" ? { rirsTubos: `RIR-T-2026-${200 + i}` } : {}),
      anexos: [{ nome: `DES-${3000 + i}.pdf` }],
      emergencia: i % 9 === 0,
      status: "Concluído",
      planejadorCriador: i % 2 === 0 ? "Carlos Planejador" : "Ana Planejadora",
      createdAt: ts,
      numeroPlano: plano,
      numeroLiberacao: liberacao,
      liberacaoEm: ts,
      liberacaoPor: "Carlos Planejador",
      programador: "Marcos Programador",
      inicioProg: ts,
      fimProg: ts,
      tempoOciosoMin: (i * 7) % 45,
      agrupamentos: agrs,
      historico: [
        { usuario: "Carlos Planejador", dataHora: ts, mudanca: "Solicitação criada" },
        { usuario: "Marcos Programador", dataHora: ts, mudanca: `Concluiu programação ${plano}` },
        { usuario: "Carlos Planejador", dataHora: ts, mudanca: `Liberou ${nAgr} agrupamento(s) — ${liberacao}` },
      ],
    });
  }

  const desafios: Desafio[] = [
    {
      id: "D-0001",
      solicId: "#0001",
      agrupId: "s1-a1",
      agrupNome: "1250C01",
      descricao: "Chapa recebida com recorte diferente do físico — corte anterior fora do padrão.",
      atribuidoA: "programador",
      responsavel: "encarregado",
      resolucao: "Trocar a chapa e revisar aproveitamento no plano.",
      status: "Aberto",
      criadoPor: "Luís Materiais",
      criadoPorPerfil: "materiais",
      criadoEm: ts,
    },
  ];

  return {
    solicitacoes: list,
    desafios,
    nextSolicId: 27,
    nextPlanoNum: planoC,
    nextPlanoNumP: planoP,
    nextPlanoNumT: planoT,
    nextDesafioId: 2,
    nextLiberacaoNum: lib,
  };
}
