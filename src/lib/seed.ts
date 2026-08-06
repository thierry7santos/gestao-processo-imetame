import type {
  Solicitacao,
  Agrupamento,
  Desafio,
  TipoPlano,
  StatusCorte,
  StatusSolicitacao,
  Maquina,
  Turno,
  LogEntry,
} from "./types";
import { nowISO, todayISO, addDays, startOfWeek } from "./formatters";

const MATERIAIS: Record<TipoPlano, { mat: string; cod: string }> = {
  Chapa: { mat: "ASTM A36", cod: "CHA0100000000" },
  Perfil: { mat: "ASTM A572 Gr50", cod: "PER0200000000" },
  "Tubulação": { mat: "ASTM A106 Gr B", cod: "TUB0300000000" },
};

const MAQUINAS: Record<TipoPlano, Maquina[]> = {
  Chapa: ["CNC-3", "Messer"],
  Perfil: ["Robô-01", "Robô-02"],
  "Tubulação": ["Bodor-D"],
};

const LOCAIS = ["Lucro", "Cabide B2", "Pátio A", "Galpão 3 · Rack 12", "Cabide A1", "Estoque Central"];

const TITULOS = [
  "Costado do vaso separador", "Bocais e reforços urgentes", "Estrutura de skid",
  "Perfis de sustentação", "Bocais tubulares", "Tampos e flanges",
  "Chapas do tanque pulmão", "Reforços de base", "Costado seção B",
  "Anéis de reforço", "Tampos elípticos", "Suportes de tubulação",
  "Berços do vaso", "Escada e guarda-corpo", "Plataforma de acesso",
  "Flanges cegos", "Perfis de contraventamento", "Vigas principais",
  "Colunas de sustentação", "Cantoneiras de fixação", "Terças de cobertura",
  "Spools de processo", "Bocais de inspeção", "Curvas e reduções",
  "Ramais secundários", "Conexões de dreno", "Chapas de piso xadrez",
  "Reforços de bocal 12\"", "Calhas e rufos", "Mãos-francesas",
  "Chapas de fundo do tanque", "Perfis U de amarração", "Tubos de descarga",
  "Sapatas de coluna", "Enrijecedores do costado", "Grelhas de piso",
  "Suportes de eletrocalha", "Luvas e niples", "Anéis de vedação",
  "Chapas de blindagem",
];

/** Etapas do fluxo demonstradas na massa de teste. */
type Etapa =
  | "fila"
  | "fila_emergencia"
  | "processo"
  | "paralisado"
  | "revisar"
  | "concluido"      // programado, ainda não liberado
  | "liberado"
  | "movimentado"
  | "alocado"
  | "em_corte"
  | "corte_paralisado"
  | "cortado"
  | "passivo";

const ROTEIRO: Etapa[] = [
  "fila", "fila_emergencia", "processo", "paralisado", "revisar",
  "concluido", "liberado", "liberado", "movimentado", "movimentado",
  "alocado", "alocado", "em_corte", "corte_paralisado", "cortado",
  "cortado", "passivo", "liberado", "movimentado", "alocado",
  "cortado", "fila", "processo", "liberado", "movimentado",
  "alocado", "em_corte", "cortado", "concluido", "liberado",
  "movimentado", "alocado", "cortado", "passivo", "liberado",
  "movimentado", "cortado", "fila_emergencia", "alocado", "cortado",
];

const RANK: Record<Etapa, StatusCorte> = {
  fila: "Aguardando",
  fila_emergencia: "Aguardando",
  processo: "Aguardando",
  paralisado: "Aguardando",
  revisar: "Aguardando",
  concluido: "Aguardando",
  liberado: "Liberado",
  movimentado: "Movimentado",
  alocado: "Alocado",
  em_corte: "Em Corte",
  corte_paralisado: "Corte Paralisado",
  cortado: "Cortado",
  passivo: "Movimentado",
};

const STATUS_SOLIC: Record<Etapa, StatusSolicitacao> = {
  fila: "Em Fila",
  fila_emergencia: "Em Fila",
  processo: "Em Processo",
  paralisado: "Paralisado",
  revisar: "A Revisar",
  concluido: "Concluído",
  liberado: "Concluído",
  movimentado: "Concluído",
  alocado: "Concluído",
  em_corte: "Concluído",
  corte_paralisado: "Concluído",
  cortado: "Concluído",
  passivo: "Concluído",
};

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
  const seg = startOfWeek(hoje);
  const ts = nowISO();
  const hAtras = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

  const list: Solicitacao[] = [];
  let planoC = 1250, planoP = 150, planoT = 320, lib = 100234;

  ROTEIRO.forEach((etapa, i) => {
    const n = i + 1;
    const id = "#" + String(n).padStart(4, "0");
    const tipo: TipoPlano = i % 3 === 0 ? "Chapa" : i % 3 === 1 ? "Perfil" : "Tubulação";
    const info = MATERIAIS[tipo];
    const maquinas = MAQUINAS[tipo];
    const solicitante = ["Carlos Planejador", "Ana Planejadora", "Paulo Planejador"][i % 3];
    const programado = etapa !== "fila" && etapa !== "fila_emergencia";
    const plano = programado
      ? tipo === "Chapa" ? `${planoC++}C` : tipo === "Perfil" ? `${planoP++}P` : `${planoT++}T`
      : undefined;
    const stCorte = RANK[etapa];
    const temLiberacao = stCorte !== "Aguardando";
    const numeroLiberacao = temLiberacao ? "L" + String(lib++).padStart(6, "0") : undefined;

    const nAgr = (i % 3) + 1;
    const agrupamentos: Agrupamento[] = [];
    for (let k = 1; k <= nAgr; k++) {
      // O último agrupamento fica na etapa alvo; os anteriores um passo atrás (fluxo realista).
      const alvo: StatusCorte = k === nAgr ? stCorte : recuar(stCorte);
      const maquina = maquinas[(i + k) % maquinas.length];
      const turno: Turno = (i + k) % 3 === 0 ? "Noite" : "Dia";
      const comprimento = [3000, 6000, 12000][(i + k) % 3];
      const largura = [1200, 1500, 2000, 2400][(i + k) % 4];
      const tempoEst = 40 + ((i * 17 + k * 11) % 120);
      const divergente = i % 7 === 3 && k === nAgr; // gera divergência de medidas p/ Auditoria

      const a: Agrupamento = {
        id: `s${n}-a${k}`,
        nome: `${plano ?? "PEND"}${String(k).padStart(2, "0")}`,
        pdfNome: `${plano ?? "PEND"}${String(k).padStart(2, "0")}.pdf`,
        rir: `RIR-2026-${2000 + n * 7 + k}`,
        codigoMaterial: info.cod,
        material: info.mat,
        espessura: [6.35, 9.5, 12.5, 19, 25.4][(i + k) % 5],
        comprimento,
        largura,
        qtdItens: 6 + ((i * 3 + k) % 24),
        peso: 380 + ((i * 137 + k * 53) % 1400),
        tempoEstMin: tempoEst,
        chapaRecebida: alvo !== "Aguardando" && alvo !== "Liberado",
        statusCorte: alvo,
      };

      if (alvo !== "Aguardando") {
        a.liberadoEm = hAtras(72 - i);
        a.liberadoPor = solicitante;
      }
      if (alvo !== "Aguardando" && alvo !== "Liberado") {
        a.movimentadoEm = hAtras(60 - i);
        a.movimentadoPor = "Luís Materiais";
        a.localizacao = LOCAIS[(i + k) % LOCAIS.length];
        if ((i + k) % 4 === 0) a.obsMateriais = "Material conferido na chegada — sem avarias.";
      }
      if (alvo === "Alocado" || alvo === "Em Corte" || alvo === "Corte Paralisado" || alvo === "Cortado") {
        a.maquina = maquina;
        a.turno = turno;
        a.diaAlocado = addDays(seg, (i + k) % 6);
      }
      if (alvo === "Em Corte" || alvo === "Corte Paralisado" || alvo === "Cortado") {
        a.operador = tipo === "Chapa" ? "João Op. Chapa" : tipo === "Perfil" ? "Bruno Op. Perfil" : "Rafael Op. Tubo";
        a.inicioCorte = hAtras(6);
        a.validacao = {
          matOk: true,
          rirOk: true,
          espOk: true,
          compDigitado: divergente ? comprimento - 85 : comprimento,
          largDigitado: divergente ? largura - 60 : largura,
          divergenciaAceita: divergente,
        };
      }
      if (alvo === "Corte Paralisado") {
        a.paradas = [{ inicio: hAtras(1), motivo: "Troca de Bico", operador: a.operador! }];
      }
      if (alvo === "Cortado") {
        a.fimCorte = hAtras(2);
        a.paradas = (i % 5 === 0)
          ? [{ inicio: hAtras(5), fim: hAtras(4.5), motivo: "Aguardando Ponte Rolante", operador: a.operador! }]
          : undefined;
        a.obsOperacao = i % 6 === 0 ? "Corte concluído sem intercorrências." : undefined;
      }
      if (etapa === "passivo" && alvo === "Movimentado") {
        a.isPassivoAnterior = true;
      }
      agrupamentos.push(a);
    }

    const historico: LogEntry[] = [
      { usuario: solicitante, dataHora: hAtras(96 - i), mudanca: "Solicitação criada" },
    ];
    if (programado) {
      historico.push({ usuario: "Marcos Programador", dataHora: hAtras(90 - i), mudanca: `Iniciou plano ${plano}` });
    }
    if (STATUS_SOLIC[etapa] === "Concluído") {
      historico.push({ usuario: "Marcos Programador", dataHora: hAtras(84 - i), mudanca: `Concluiu programação ${plano}` });
    }
    if (etapa === "paralisado") {
      historico.push({ usuario: "Marcos Programador", dataHora: hAtras(20), mudanca: "Status → Paralisado" });
    }
    if (etapa === "revisar") {
      historico.push({ usuario: solicitante, dataHora: hAtras(18), mudanca: "Solicitou revisão de plano concluído" });
    }
    if (temLiberacao) {
      historico.push({
        usuario: solicitante,
        dataHora: hAtras(72 - i),
        mudanca: `Liberou ${nAgr} agrupamento(s) para Materiais · Liberação ${numeroLiberacao}`,
      });
    }
    agrupamentos.forEach((a) => {
      if (a.movimentadoEm) historico.push({ usuario: "Luís Materiais", dataHora: a.movimentadoEm, mudanca: `Materiais movimentou ${a.nome}` });
      if (a.diaAlocado) historico.push({ usuario: prepDe(tipo), dataHora: hAtras(40), mudanca: `Alocou ${a.nome} em ${a.maquina} · ${a.turno} · ${a.diaAlocado}` });
      if (a.inicioCorte) historico.push({ usuario: a.operador!, dataHora: a.inicioCorte, mudanca: `Iniciou corte de ${a.nome}` });
      if (a.statusCorte === "Corte Paralisado") historico.push({ usuario: a.operador!, dataHora: hAtras(1), mudanca: `Paralisou corte de ${a.nome} — motivo: Troca de Bico` });
      if (a.fimCorte) historico.push({ usuario: a.operador!, dataHora: a.fimCorte, mudanca: `Finalizou corte de ${a.nome}` });
    });
    if (etapa === "passivo") {
      historico.push({ usuario: "Sistema", dataHora: hAtras(12), mudanca: "Agrupamento(s) devolvidos como Passivo Anterior (semana fechou sem corte)" });
    }

    list.push({
      id,
      os: `075${1 + (i % 3)}.0${1 + (i % 8)}.0${(i % 9) + 1}0`,
      titulo: TITULOS[i % TITULOS.length],
      tipo,
      dataNecessidade: addDays(hoje, (i % 14) - 2),
      descricao: `${TITULOS[i % TITULOS.length]} — conforme desenho DES-${3000 + i}.`,
      ...(etapa === "revisar" ? { descricaoRevisao: "Revisar espessura do item 4 — passou de 12,5 mm para 19 mm." } : {}),
      ...(tipo === "Perfil" ? { rirsPerfis: `RIR-P-2026-${100 + i}` } : {}),
      ...(tipo === "Tubulação" ? { rirsTubos: `RIR-T-2026-${200 + i}` } : {}),
      anexos: [{ nome: `DES-${3000 + i}.pdf` }],
      emergencia: etapa === "fila_emergencia" || i % 11 === 0,
      status: STATUS_SOLIC[etapa],
      planejadorCriador: solicitante,
      createdAt: hAtras(96 - i),
      ...(plano ? { numeroPlano: plano } : {}),
      ...(numeroLiberacao ? { numeroLiberacao, liberacaoEm: hAtras(72 - i), liberacaoPor: solicitante } : {}),
      ...(programado ? { programador: "Marcos Programador", inicioProg: hAtras(90 - i) } : {}),
      ...(STATUS_SOLIC[etapa] === "Concluído" ? { fimProg: hAtras(84 - i) } : {}),
      ...(etapa === "paralisado" ? { paralisadoDesde: hAtras(20) } : {}),
      tempoOciosoMin: (i * 7) % 45,
      ...(i % 4 === 0 ? { observacoesProgramador: "Aproveitamento otimizado — sobra útil identificada." } : {}),
      agrupamentos,
      historico,
    });
  });

  const desafios: Desafio[] = [
    {
      id: "D-0001",
      solicId: list[8].id,
      agrupId: list[8].agrupamentos[0]?.id,
      agrupNome: list[8].agrupamentos[0]?.nome,
      descricao: "Chapa recebida com recorte diferente do físico — corte anterior fora do padrão.",
      atribuidoA: "programador",
      responsavel: "encarregado",
      resolucao: "Trocar a chapa e revisar aproveitamento no plano.",
      status: "Aberto",
      criadoPor: "Luís Materiais",
      criadoPorPerfil: "materiais",
      criadoEm: hAtras(30),
    },
    {
      id: "D-0002",
      solicId: list[12].id,
      agrupId: list[12].agrupamentos[0]?.id,
      agrupNome: list[12].agrupamentos[0]?.nome,
      descricao: "RIR divergente do informado no plano.",
      atribuidoA: "materiais",
      responsavel: "programador",
      status: "Aberto",
      criadoPor: "João Op. Chapa",
      criadoPorPerfil: "operador",
      criadoEm: hAtras(8),
    },
    {
      id: "D-0003",
      solicId: list[14].id,
      agrupNome: list[14].numeroPlano,
      descricao: "Atraso na movimentação da chapa para a máquina.",
      atribuidoA: "encarregado",
      responsavel: "materiais",
      resolucao: "Ponte rolante liberada — material entregue na CNC-3.",
      status: "Resolvido",
      criadoPor: "Roberto Prep. Chapa",
      criadoPorPerfil: "encarregado",
      criadoEm: hAtras(48),
      resolvidoPor: "Luís Materiais",
      resolvidoEm: hAtras(44),
    },
  ];

  return {
    solicitacoes: list,
    desafios,
    nextSolicId: ROTEIRO.length + 1,
    nextPlanoNum: planoC,
    nextPlanoNumP: planoP,
    nextPlanoNumT: planoT,
    nextDesafioId: 4,
    nextLiberacaoNum: lib,
  };
}

function recuar(st: StatusCorte): StatusCorte {
  switch (st) {
    case "Cortado": return "Em Corte";
    case "Corte Paralisado": return "Alocado";
    case "Em Corte": return "Alocado";
    case "Alocado": return "Movimentado";
    case "Movimentado": return "Liberado";
    default: return st;
  }
}

function prepDe(tipo: TipoPlano): string {
  return tipo === "Chapa" ? "Roberto Prep. Chapa" : tipo === "Perfil" ? "Silvio Prep. Perfil" : "Diego Prep. Tubo";
}
