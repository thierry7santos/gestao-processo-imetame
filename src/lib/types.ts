export type Perfil =
  | "planejador"
  | "programador"
  | "materiais"
  | "encarregado"
  | "operador";

export type TipoPlano = "Chapa" | "Perfil" | "Tubulação";

export interface Usuario {
  username: string;
  senha: string;
  perfil: Perfil;
  nome: string;
  /** Obrigatório para preparação (encarregado) e operador — segmenta a área. */
  tipo?: TipoPlano;
}

export type StatusSolicitacao =
  | "Em Fila"
  | "Em Processo"
  | "Paralisado"
  | "Concluído"
  | "A Revisar"
  | "Em Revisão"
  | "Revisado"
  | "Cancelado";

export type StatusCorte =
  | "Aguardando"
  | "Liberado"
  | "Movimentado"
  | "Alocado"
  | "Em Corte"
  | "Corte Paralisado"
  | "Cortado";

export type Maquina = "CNC-3" | "Messer" | "Robô-01" | "Robô-02" | "Bodor-D";

export type Turno = "Dia" | "Noite";

export interface LogEntry {
  usuario: string;
  dataHora: string;
  mudanca: string;
}

export interface Validacao {
  matOk: boolean;
  rirOk: boolean;
  espOk: boolean;
  compDigitado: number;
  largDigitado: number;
  divergenciaAceita: boolean;
}

export interface ParadaCorte {
  inicio: string;
  fim?: string;
  motivo: string;
  operador: string;
}

export interface Agrupamento {
  id: string;
  nome: string;
  pdfNome?: string;
  pdfUrl?: string;
  rir?: string;
  codigoMaterial?: string;
  material?: string;
  espessura?: number;
  comprimento?: number;
  largura?: number;
  qtdItens?: number;
  peso?: number;
  tempoEstMin?: number;
  chapaRecebida: boolean;
  maquina?: Maquina;
  turno?: Turno;
  diaAlocado?: string;
  statusCorte: StatusCorte;
  validacao?: Validacao;
  inicioCorte?: string;
  fimCorte?: string;
  operador?: string;
  obsOperacao?: string;
  isPassivoAnterior?: boolean;
  paradas?: ParadaCorte[];
  /** Timestamps do fluxo Materiais. */
  liberadoEm?: string;
  liberadoPor?: string;
  movimentadoEm?: string;
  movimentadoPor?: string;
  /** Observações registradas pelo Materiais. */
  obsMateriais?: string;
  /** Localização física da chapa/material (ex.: Lucro, Cabide B2). */
  localizacao?: string;
}

export interface Solicitacao {
  id: string;
  os: string;
  titulo: string;
  tipo: TipoPlano;
  dataNecessidade: string;
  descricao: string;
  descricaoRevisao?: string;
  rirsPerfis?: string;
  rirsTubos?: string;
  anexos: { nome: string }[];
  emergencia: boolean;
  status: StatusSolicitacao;
  planejadorCriador: string;
  createdAt: string;
  numeroPlano?: string;
  /** Número de liberação (ERP) gerado ao liberar para Materiais — padrão Lxxxxxx. */
  numeroLiberacao?: string;
  liberacaoEm?: string;
  liberacaoPor?: string;
  programador?: string;
  inicioProg?: string;
  fimProg?: string;
  paralisadoDesde?: string;
  tempoOciosoMin: number;
  observacoesProgramador?: string;
  agrupamentos: Agrupamento[];
  historico: LogEntry[];
}

export type StatusDesafio = "Aberto" | "Resolvido";

export interface Desafio {
  id: string;
  solicId: string;
  agrupId?: string;
  agrupNome?: string;
  descricao: string;
  atribuidoA: Perfil;      // Para quem reporta / precisa atuar
  responsavel: Perfil;     // De quem foi a culpa
  resolucao?: string;      // Sugestão de resolução (opcional)
  status: StatusDesafio;
  criadoPor: string;
  criadoPorPerfil: Perfil;
  criadoEm: string;
  resolvidoPor?: string;
  resolvidoEm?: string;
}

export interface AppState {
  sessao: { username: string } | null;
  solicitacoes: Solicitacao[];
  desafios: Desafio[];
  nextSolicId: number;
  nextPlanoNum: number;
  nextPlanoNumP: number;
  nextPlanoNumT: number;
  nextDesafioId: number;
  nextLiberacaoNum: number;
  seeded: boolean;
}
