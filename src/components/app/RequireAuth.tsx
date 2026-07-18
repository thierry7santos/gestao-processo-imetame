import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { findUser, homeFor } from "@/lib/auth";
import type { Perfil } from "@/lib/types";
import { AppShell } from "./AppShell";

export function RequireAuth({
  perfis,
  children,
}: {
  perfis: Perfil[];
  children: ReactNode;
}) {
  const sessao = useStore((s) => s.sessao);
  const navigate = useNavigate();
  const user = sessao ? findUser(sessao.username) : undefined;

  useEffect(() => {
    if (!sessao) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (user && !perfis.includes(user.perfil)) {
      navigate({ to: homeFor(user.perfil) as "/planejador", replace: true });
    }
  }, [sessao, user, perfis, navigate]);

  if (!user || !perfis.includes(user.perfil)) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Verificando acesso…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
