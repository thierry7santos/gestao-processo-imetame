import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { findUser, homeFor } from "@/lib/auth";
import { LogOut, Factory } from "lucide-react";
import type { ReactNode } from "react";
import type { Perfil } from "@/lib/types";

const NAV: Record<Perfil, { to: string; label: string }[]> = {
  planejador: [
    { to: "/planejador", label: "Planejamento" },
    { to: "/auditoria", label: "Auditoria" },
    { to: "/kpis", label: "KPIs" },
  ],
  programador: [
    { to: "/programador", label: "Programação" },
    { to: "/auditoria", label: "Auditoria" },
    { to: "/kpis", label: "KPIs" },
  ],
  encarregado: [{ to: "/encarregado", label: "Preparação" }],
  operador: [{ to: "/operador", label: "Operação" }],
};

export function AppShell({ children }: { children: ReactNode }) {
  const sessao = useStore((s) => s.sessao);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const user = sessao ? findUser(sessao.username) : undefined;
  if (!user) return null;
  const nav = NAV[user.perfil];

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-sidebar sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
          <Link to={homeFor(user.perfil) as "/planejador"} className="flex items-center gap-2 shrink-0">
            <div className="grid place-items-center h-9 w-9 rounded-md bg-primary text-primary-foreground">
              <Factory className="h-5 w-5" />
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-sm font-bold tracking-tight">IME Corte CNC</div>
              <div className="text-[10px] text-muted-foreground uppercase">Planejamento · Programação · Preparação</div>
            </div>
          </Link>
          <nav className="flex-1 flex items-center gap-1 ml-4 overflow-x-auto">
            {nav.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to as "/planejador"}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-sm font-medium">{user.nome}</div>
              <div className="text-[10px] uppercase text-primary">{user.perfil}</div>
            </div>
            <button
              onClick={handleLogout}
              className="grid place-items-center h-9 w-9 rounded-md bg-secondary text-secondary-foreground hover:bg-accent"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Em Fila": "bg-secondary text-secondary-foreground",
    "Em Processo": "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    "Paralisado": "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
    "Concluído": "bg-primary/20 text-primary border border-primary/40",
    "A Revisar": "bg-orange-500/20 text-orange-300 border border-orange-500/50",
    "Em Revisão": "bg-purple-500/20 text-purple-300 border border-purple-500/50",
    "Revisado": "bg-purple-500/10 text-purple-200 border border-purple-500/30",
    "Cancelado": "bg-destructive/20 text-destructive border border-destructive/40",
    "Aguardando": "bg-muted text-muted-foreground",
    "Alocado": "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    "Em Corte": "bg-yellow-500/25 text-yellow-200 border border-yellow-500/50",
    "Cortado": "bg-primary/25 text-primary border border-primary/50",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${map[status] ?? "bg-secondary"}`}>
      {status}
    </span>
  );
}
