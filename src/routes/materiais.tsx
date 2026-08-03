import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { findUser } from "@/lib/auth";
import { StatusBadge } from "@/components/app/AppShell";
import { DesafioButton } from "@/components/app/DesafioButton";
import { fmtDate, fmtDateTime, fmtMin } from "@/lib/formatters";
import type { Agrupamento, Solicitacao } from "@/lib/types";
import { History, PackageCheck, Truck, FileText, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais · Gestão de Processos CNC" },
      { name: "description", content: "Liberações do ERP, agrupamentos e movimentação de material para a Preparação." },
      { property: "og:title", content: "Materiais · Gestão de Processos CNC" },
      { property: "og:description", content: "Liberações do ERP, agrupamentos e movimentação de material para a Preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth perfis={["materiais"]}>
      <MateriaisPage />
    </RequireAuth>
  ),
});

function pesoTotal(s: Solicitacao): number {
  return s.agrupamentos.reduce((acc, a) => acc + (a.peso ?? 0), 0);
}

function areaM2(a: Agrupamento): string {
  if (!a.comprimento || !a.largura) return "—";
  return ((a.comprimento * a.largura) / 1_000_000).toFixed(2) + " m²";
}

function MateriaisPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const [fId, setFId] = useState("");
  const [fOs, setFOs] = useState("");
  const [fSolic, setFSolic] = useState("");
  const [fTipo, setFTipo] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [liberacao, setLiberacao] = useState<string | null>(null);
  const [historico, setHistorico] = useState<string | null>(null);

  const liberadas = useMemo(
    () =>
      solicitacoes
        .filter((s) => !!s.numeroLiberacao)
        .filter((s) => (fId ? s.id.toLowerCase().includes(fId.toLowerCase()) : true))
        .filter((s) => (fOs ? s.os.toLowerCase().includes(fOs.toLowerCase()) : true))
        .filter((s) => (fSolic ? s.planejadorCriador.toLowerCase().includes(fSolic.toLowerCase()) : true))
        .filter((s) => (fTipo === "todos" ? true : s.tipo === fTipo))
        .filter((s) => (fStatus === "todos" ? true : s.status === fStatus))
        .sort((a, b) => a.dataNecessidade.localeCompare(b.dataNecessidade)),
    [solicitacoes, fId, fOs, fSolic, fTipo, fStatus],
  );

  const alvo = solicitacoes.find((s) => s.id === (detalhe ?? liberacao ?? historico));

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Materiais</h1>
        <p className="text-sm text-muted-foreground">
          Liberações recebidas do Planejamento — movimente os agrupamentos para a Preparação.
        </p>
      </div>

      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="ID" value={fId} onChange={(e) => setFId(e.target.value)} />
          </div>
          <Input placeholder="OS" value={fOs} onChange={(e) => setFOs(e.target.value)} />
          <Input placeholder="Solicitante" value={fSolic} onChange={(e) => setFSolic(e.target.value)} />
          <Select value={fTipo} onValueChange={setFTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="Chapa">Chapa</SelectItem>
              <SelectItem value="Perfil">Perfil</SelectItem>
              <SelectItem value="Tubulação">Tubulação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {["Em Fila", "Em Processo", "Paralisado", "Concluído", "A Revisar", "Em Revisão", "Revisado", "Cancelado"].map((st) => (
                <SelectItem key={st} value={st}>{st}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Solicitante</th>
              <th className="text-left p-3">OS</th>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Plano</th>
              <th className="text-left p-3">Liberação</th>
              <th className="text-right p-3">Peso total</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {liberadas.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-muted-foreground text-xs">Nenhuma liberação encontrada.</td></tr>
            )}
            {liberadas.map((s) => {
              const pend = s.agrupamentos.filter((a) => a.statusCorte === "Liberado").length;
              return (
                <tr
                  key={s.id}
                  onClick={() => setDetalhe(s.id)}
                  className="border-t border-border cursor-pointer hover:bg-secondary/40"
                >
                  <td className="p-3 font-mono font-bold">{s.id}</td>
                  <td className="p-3 text-xs">{s.planejadorCriador}</td>
                  <td className="p-3 font-mono text-xs">{s.os}</td>
                  <td className="p-3">
                    {s.titulo}
                    <div className="text-[11px] text-muted-foreground">Necessidade {fmtDate(s.dataNecessidade)}</div>
                  </td>
                  <td className="p-3 text-xs">{s.tipo}</td>
                  <td className="p-3"><StatusBadge status={s.status} /></td>
                  <td className="p-3 font-mono text-xs">{s.numeroPlano ?? "—"}</td>
                  <td className="p-3 font-mono text-xs text-primary">{s.numeroLiberacao}</td>
                  <td className="p-3 text-right font-mono">{pesoTotal(s).toLocaleString("pt-BR")} kg</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setDetalhe(s.id)}>
                        <PackageCheck className="h-3.5 w-3.5 mr-1" />
                        Agrupamentos{pend > 0 && <span className="ml-1 text-[10px] text-primary">({pend})</span>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setLiberacao(s.id)} title="Detalhes da liberação">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHistorico(s.id)} title="Histórico">
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AgrupamentosDialog solic={detalhe ? alvo ?? null : null} onClose={() => setDetalhe(null)} />
      <LiberacaoDialog solic={liberacao ? alvo ?? null : null} onClose={() => setLiberacao(null)} />
      <HistoricoDialog solic={historico ? alvo ?? null : null} onClose={() => setHistorico(null)} />
    </div>
  );
}

function AgrupamentosDialog({ solic, onClose }: { solic: Solicitacao | null; onClose: () => void }) {
  const sessao = useStore((s) => s.sessao);
  const movimentar = useStore((s) => s.movimentarAgrupamento);
  const user = sessao ? findUser(sessao.username) : undefined;
  if (!solic) return null;

  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{solic.id}</span>
            <span className="text-muted-foreground font-normal text-sm">{solic.titulo}</span>
            <span className="font-mono text-xs text-primary">{solic.numeroLiberacao}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {solic.agrupamentos.length === 0 && (
            <div className="text-xs text-muted-foreground">Nenhum agrupamento nesta solicitação.</div>
          )}
          {solic.agrupamentos.map((a) => (
            <div key={a.id} className="rounded border border-border bg-secondary/30 p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold">{a.nome}</span>
                <StatusBadge status={a.statusCorte} />
                <div className="flex-1" />
                <DesafioButton solic={solic} agrup={a} size="sm" variant="ghost" label="Desafio" />
                {a.statusCorte === "Liberado" ? (
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground"
                    onClick={() => {
                      movimentar(solic.id, a.id, user?.nome ?? "Materiais");
                      toast.success(`${a.nome} movimentado para a Preparação`);
                    }}
                  >
                    <Truck className="h-4 w-4 mr-1" /> Movimentar
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {a.movimentadoEm ? `Movimentado em ${fmtDateTime(a.movimentadoEm)}` : "Aguardando liberação"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Campo label="RIR" v={a.rir} />
                <Campo label="Material" v={a.material} />
                <Campo label="Espessura" v={a.espessura ? `${a.espessura} mm` : undefined} />
                <Campo label="Comprimento" v={a.comprimento ? `${a.comprimento} mm` : undefined} />
                <Campo label="Largura" v={a.largura ? `${a.largura} mm` : undefined} />
                <Campo label="Qtd. itens" v={a.qtdItens?.toString()} />
                <Campo label="Peso" v={a.peso ? `${a.peso.toLocaleString("pt-BR")} kg` : undefined} />
                <Campo label="Área" v={areaM2(a)} />
                <Campo label="Tempo estimado" v={fmtMin(a.tempoEstMin)} />
                <Campo label="Status" v={a.statusCorte} />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, v }: { label: string; v?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono">{v && v !== "—" ? v : "—"}</div>
    </div>
  );
}

function LiberacaoDialog({ solic, onClose }: { solic: Solicitacao | null; onClose: () => void }) {
  if (!solic) return null;
  const total = solic.agrupamentos.length;
  const movimentados = solic.agrupamentos.filter((a) => a.statusCorte !== "Liberado" && a.statusCorte !== "Aguardando").length;
  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Detalhes da liberação</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Campo label="Nº Liberação" v={solic.numeroLiberacao} />
          <Campo label="Plano" v={solic.numeroPlano} />
          <Campo label="Solicitação" v={solic.id} />
          <Campo label="OS" v={solic.os} />
          <Campo label="Solicitante" v={solic.planejadorCriador} />
          <Campo label="Tipo" v={solic.tipo} />
          <Campo label="Liberado em" v={fmtDateTime(solic.liberacaoEm)} />
          <Campo label="Liberado por" v={solic.liberacaoPor} />
          <Campo label="Necessidade" v={fmtDate(solic.dataNecessidade)} />
          <Campo label="Peso total" v={`${pesoTotal(solic).toLocaleString("pt-BR")} kg`} />
          <Campo label="Agrupamentos" v={`${movimentados}/${total} movimentados`} />
        </div>
        <div>
          <Label className="text-xs">Descrição</Label>
          <p className="text-xs text-muted-foreground">{solic.descricao}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoDialog({ solic, onClose }: { solic: Solicitacao | null; onClose: () => void }) {
  if (!solic) return null;
  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico · {solic.id}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {solic.historico.map((h, i) => (
            <div key={i} className="text-xs border-l-2 border-primary/60 pl-3 py-1">
              <div className="font-medium">{h.mudanca}</div>
              <div className="text-muted-foreground">{h.usuario} · {fmtDateTime(h.dataHora)}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
