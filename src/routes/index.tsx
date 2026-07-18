import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { findUser, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const sessao = useStore((s) => s.sessao);
  const navigate = useNavigate();
  useEffect(() => {
    if (!sessao) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const u = findUser(sessao.username);
    navigate({ to: (u ? homeFor(u.perfil) : "/login") as "/login", replace: true });
  }, [sessao, navigate]);
  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
      Carregando…
    </div>
  );
}
