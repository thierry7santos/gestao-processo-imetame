export type Perfil =
  | "planejador"
  | "programador"
  | "encarregado"
  | "operador";

export interface Usuario {
  username: string;
  senha: string;
  perfil: Perfil;
  nome: string;
}

export type TipoPlano = "Chapa" | "Perfil" | "Tubulação";

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
  | "Alocado"
  | "Em Corte"
  | "Corte Paralisado"
  | "Cortado";

export type Maquina = "CNC-3" | "Messer";

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
  nome: string; // 1250C01
  pdfNome?: string;
  pdfUrl?: string;
  rir?: string;
  material?: string;
  espessura?: number;
  comprimento?: number;
  largura?: number;
  qtdItens?: number;
  peso?: number;
  tempoEstMin?: number;
  chapaRecebida: boolean;
  maquina?: Maquina;
  diaAlocado?: string; // ISO date yyyy-mm-dd
  statusCorte: StatusCorte;
  validacao?: Validacao;
  inicioCorte?: string;
  fimCorte?: string;
  operador?: string;
  obsOperacao?: string;
  /** Marca planos alocados em semanas passadas que não foram cortados. */
  isPassivoAnterior?: boolean;
  paradas?: ParadaCorte[];
}

export interface Solicitacao {
  id: string; // #0001
  os: string;
  titulo: string;
  tipo: TipoPlano;
  dataNecessidade: string; // yyyy-mm-dd
  descricao: string;
  descricaoRevisao?: string;
  rirsPerfis?: string;
  rirsTubos?: string;
  anexos: { nome: string }[];
  emergencia: boolean;
  status: StatusSolicitacao;
  planejadorCriador: string;
  createdAt: string;
  numeroPlano?: string; // 1250C
  programador?: string;
  inicioProg?: string;
  fimProg?: string;
  paralisadoDesde?: string;
  tempoOciosoMin: number;
  observacoesProgramador?: string;
  agrupamentos: Agrupamento[];
  historico: LogEntry[];
}

export interface AppState {
  sessao: { username: string } | null;
  solicitacoes: Solicitacao[];
  nextSolicId: number;
  nextPlanoNum: number;
  nextPlanoNumP: number;
  nextPlanoNumT: number;
  seeded: boolean;
}
