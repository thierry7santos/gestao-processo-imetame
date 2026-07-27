import type { Maquina, TipoPlano, Usuario } from "./types";

/**
 * Máquinas por área de trabalho. Encarregado e operador só visualizam/operam
 * máquinas do próprio tipo (Chapa / Perfil / Tubo).
 * TODO: mover para tabela `maquinas` no SQL (id, nome, tipo).
 */
export const MAQUINAS_POR_TIPO: Record<TipoPlano, Maquina[]> = {
  "Chapa": ["CNC-3", "Messer"],
  "Perfil": ["Robô-01", "Robô-02"],
  "Tubulação": ["Bodor-D"],
};

export const USUARIOS: Usuario[] = [
  { username: "planejador1",       senha: "123", perfil: "planejador",  nome: "Carlos Planejador" },
  { username: "planejador2",       senha: "123", perfil: "planejador",  nome: "Ana Planejadora Auxiliar" },
  { username: "programador1",      senha: "123", perfil: "programador", nome: "Marcos Programador" },

  { username: "encarregado_chapa",  senha: "123", perfil: "encarregado", nome: "Roberto Enc. Chapa",  tipo: "Chapa" },
  { username: "encarregado_perfil", senha: "123", perfil: "encarregado", nome: "Silvio Enc. Perfil",   tipo: "Perfil" },
  { username: "encarregado_tubo",   senha: "123", perfil: "encarregado", nome: "Diego Enc. Tubo",      tipo: "Tubulação" },

  { username: "operador_chapa1",    senha: "123", perfil: "operador",    nome: "João Op. Chapa",       tipo: "Chapa" },
  { username: "operador_chapa2",    senha: "123", perfil: "operador",    nome: "Pedro Op. Chapa",      tipo: "Chapa" },
  { username: "operador_perfil1",   senha: "123", perfil: "operador",    nome: "Bruno Op. Perfil",     tipo: "Perfil" },
  { username: "operador_tubo1",     senha: "123", perfil: "operador",    nome: "Rafael Op. Tubo",      tipo: "Tubulação" },
];

export function findUser(username: string): Usuario | undefined {
  return USUARIOS.find((u) => u.username === username);
}

export function maquinasDoUsuario(u: Usuario): Maquina[] {
  if (u.tipo) return MAQUINAS_POR_TIPO[u.tipo];
  // Planejador/programador enxergam tudo (usado só em telas gerenciais).
  return Object.values(MAQUINAS_POR_TIPO).flat();
}

export function homeFor(perfil: string): string {
  switch (perfil) {
    case "planejador": return "/planejador";
    case "programador": return "/programador";
    case "encarregado": return "/encarregado";
    case "operador": return "/operador";
    default: return "/login";
  }
}
