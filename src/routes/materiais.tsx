import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/app/AppShell";
import { DesafioButton } from "@/components/app/DesafioButton";
import { fmtDate } from "@/lib/formatters";

export const Route = createFileRoute("/materiais")({
  component: () => (
    <RequireAuth perfis={["materiais"]}>
      <MateriaisPage />
    </RequireAuth>
  ),
});

function MateriaisPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const pendentes = solicitacoes.filter((s) =>
    s.agrupamentos.some((a) => ["Liberado", "Movimentado"].includes(a.statusCorte))
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <Card className="p-10 text-center space-y-4 border-dashed">
        <div className="mx-auto grid place-items-center h-16 w-16 rounded-full bg-primary/15 text-primary">
          <Construction className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Página em desenvolvimento</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A interface do setor de Materiais será liberada em breve. Aqui você poderá visualizar os agrupamentos liberados pelo planejador e registrar a movimentação das chapas para a Preparação.
        </p>
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase font-semibold text-primary mb-3">
          Solicitações pendentes de movimentação — abra desafios quando necessário
        </div>
        {pendentes.length === 0 && (
          <div className="text-xs text-muted-foreground">Nenhuma solicitação pendente.</div>
        )}
        <div className="space-y-2">
          {pendentes.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 rounded border border-border bg-secondary/40">
              <span className="font-mono font-bold">{s.id}</span>
              <span className="font-mono text-xs text-muted-foreground">{s.os}</span>
              <span className="text-sm flex-1 min-w-[200px]">{s.titulo}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(s.dataNecessidade)}</span>
              <StatusBadge status={s.status} />
              <DesafioButton solic={s} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
