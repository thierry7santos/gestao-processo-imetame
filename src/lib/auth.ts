import type { Usuario } from "./types";

export const USUARIOS: Usuario[] = [
  { username: "planejador1", senha: "123", perfil: "planejador", nome: "Carlos Planejador" },
  { username: "planejador2", senha: "123", perfil: "planejador", nome: "Ana Planejadora Auxiliar" },
  { username: "programador1", senha: "123", perfil: "programador", nome: "Marcos Programador" },
  { username: "encarregado1", senha: "123", perfil: "encarregado", nome: "Roberto Encarregado" },
  { username: "operador1", senha: "123", perfil: "operador", nome: "João Operador CNC" },
  { username: "operador2", senha: "123", perfil: "operador", nome: "Pedro Operador Reserva" },
];

export function findUser(username: string): Usuario | undefined {
  return USUARIOS.find((u) => u.username === username);
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
