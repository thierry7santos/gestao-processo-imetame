import type { Maquina, Perfil, TipoPlano, Usuario } from "./types";

export const MAQUINAS_POR_TIPO: Record<TipoPlano, Maquina[]> = {
  "Chapa": ["CNC-3", "Messer"],
  "Perfil": ["Robô-01", "Robô-02"],
  "Tubulação": ["Bodor-D"],
};

/** Um login por setor. Preparação e Operador segmentam por tipo. */
export const USUARIOS: Usuario[] = [
  { username: "planejador",  senha: "123", perfil: "planejador",  nome: "Carlos Planejador" },
  { username: "programador", senha: "123", perfil: "programador", nome: "Marcos Programador" },
  { username: "materiais",   senha: "123", perfil: "materiais",   nome: "Luís Materiais" },

  { username: "preparacao_chapa",  senha: "123", perfil: "encarregado", nome: "Roberto Prep. Chapa",  tipo: "Chapa" },
  { username: "preparacao_perfil", senha: "123", perfil: "encarregado", nome: "Silvio Prep. Perfil",   tipo: "Perfil" },
  { username: "preparacao_tubo",   senha: "123", perfil: "encarregado", nome: "Diego Prep. Tubo",      tipo: "Tubulação" },

  { username: "operador_chapa",  senha: "123", perfil: "operador", nome: "João Op. Chapa",   tipo: "Chapa" },
  { username: "operador_perfil", senha: "123", perfil: "operador", nome: "Bruno Op. Perfil", tipo: "Perfil" },
  { username: "operador_tubo",   senha: "123", perfil: "operador", nome: "Rafael Op. Tubo",  tipo: "Tubulação" },
];

export function findUser(username: string): Usuario | undefined {
  return USUARIOS.find((u) => u.username === username);
}

export function maquinasDoUsuario(u: Usuario): Maquina[] {
  if (u.tipo) return MAQUINAS_POR_TIPO[u.tipo];
  return Object.values(MAQUINAS_POR_TIPO).flat();
}

export function homeFor(perfil: Perfil | string): string {
  switch (perfil) {
    case "planejador": return "/planejador";
    case "programador": return "/programador";
    case "materiais": return "/materiais";
    case "encarregado": return "/encarregado";
    case "operador": return "/operador";
    default: return "/login";
  }
}

/** Rótulo humano da equipe/perfil. */
export function perfilLabel(p: Perfil): string {
  switch (p) {
    case "planejador": return "Planejamento";
    case "programador": return "Programação";
    case "materiais": return "Materiais";
    case "encarregado": return "Preparação";
    case "operador": return "Operação";
  }
}

export const PERFIS_DESAFIO: Perfil[] = ["planejador", "programador", "materiais", "encarregado", "operador"];
