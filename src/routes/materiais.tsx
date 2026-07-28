import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/materiais")({
  component: () => (
    <RequireAuth perfis={["materiais"]}>
      <MateriaisPage />
    </RequireAuth>
  ),
});

function MateriaisPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Card className="p-10 text-center space-y-4 border-dashed">
        <div className="mx-auto grid place-items-center h-16 w-16 rounded-full bg-primary/15 text-primary">
          <Construction className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Página em desenvolvimento</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A interface do setor de Materiais será liberada em breve. Aqui você poderá visualizar os agrupamentos liberados pelo planejador e registrar a movimentação das chapas para a Preparação.
        </p>
      </Card>
    </div>
  );
}
