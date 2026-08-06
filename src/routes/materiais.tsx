import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Agrupamento, Solicitacao, StatusCorte, TipoPlano } from "@/lib/types";
import { History, PackageCheck, Truck, FileText, Search, Copy, FileDown } from "lucide-react";
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

const RANK: Record<StatusCorte, number> = {
  Aguardando: 0,
  Liberado: 1,
  Movimentado: 2,
  Alocado: 3,
  "Em Corte": 4,
  "Corte Paralisado": 4,
  Cortado: 5,
};

/** Status real da liberação = agrupamento menos avançado. */
function statusReal(s: Solicitacao): StatusCorte {
  if (s.agrupamentos.length === 0) return "Aguardando";
  return s.agrupamentos.reduce<StatusCorte>(
    (min, a) => (RANK[a.statusCorte] < RANK[min] ? a.statusCorte : min),
    "Cortado",
  );
}

function pesoTotal(s: Solicitacao): number {
  return s.agrupamentos.reduce((acc, a) => acc + (a.peso ?? 0), 0);
}

function areaM2(a: Agrupamento): string {
  if (!a.comprimento || !a.largura) return "—";
  return ((a.comprimento * a.largura) / 1_000_000).toFixed(2) + " m²";
}

async function copiar(valor: string, rotulo: string) {
  try {
    await navigator.clipboard.writeText(valor);
    toast.success(`${rotulo} copiado`);
  } catch {
    toast.error("Não foi possível copiar");
  }
}

function MateriaisPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const [tipoAtivo, setTipoAtivo] = useState<TipoPlano>("Chapa");
  const [busca, setBusca] = useState("");
  const [fOs, setFOs] = useState("");
  const [fStatus, setFStatus] = useState<string>("Liberado");
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [liberacao, setLiberacao] = useState<string | null>(null);
  const [historico, setHistorico] = useState<string | null>(null);

  const base = useMemo(() => solicitacoes.filter((s) => !!s.numeroLiberacao), [solicitacoes]);

  const liberadas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return base
      .filter((s) => s.tipo === tipoAtivo)
      .filter((s) =>
        q
          ? [s.id, s.numeroLiberacao ?? "", s.numeroPlano ?? ""].some((v) => v.toLowerCase().includes(q))
          : true,
      )
      .filter((s) => (fOs ? s.os.toLowerCase().includes(fOs.toLowerCase()) : true))
      .filter((s) => (fStatus === "todos" ? true : statusReal(s) === fStatus))
      .sort((a, b) => a.dataNecessidade.localeCompare(b.dataNecessidade));
  }, [base, tipoAtivo, busca, fOs, fStatus]);

  const alvo = solicitacoes.find((s) => s.id === (detalhe ?? liberacao ?? historico));

  return (
    <div className="p-3 sm:p-5 max-w-[1600px] mx-auto space-y-3">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-bold">Materiais</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Liberações do Planejamento — movimente os agrupamentos para a Preparação.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-sm">{liberadas.length} liberações</Badge>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["Chapa", "Perfil", "Tubulação"] as const).map((t) => {
          const label = t === "Tubulação" ? "Tubo" : t;
          const ativo = tipoAtivo === t;
          const count = base.filter((s) => s.tipo === t && statusReal(s) === "Liberado").length;
          return (
            <Button
              key={t}
              type="button"
              size="lg"
              variant={ativo ? "default" : "outline"}
              className={ativo ? "bg-primary text-primary-foreground h-12 px-6" : "border-primary/40 h-12 px-6"}
              onClick={() => setTipoAtivo(t)}
            >
              {label}
              <Badge variant="secondary" className="ml-2">{count}</Badge>
            </Button>
          );
        })}
      </div>

      <Card className="p-3 border-primary/30">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Label className="text-xs">ID · Liberação · Plano</Label>
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-11 font-mono"
                placeholder="#0001 · L100234 · 1250C"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Número da OS</Label>
            <Input className="h-11 font-mono" placeholder="0751.03.001" value={fOs} onChange={(e) => setFOs(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Liberado">Liberado</SelectItem>
                <SelectItem value="Movimentado">Movimentado</SelectItem>
                <SelectItem value="Alocado">Alocado</SelectItem>
                <SelectItem value="Cortado">Cortado</SelectItem>
                <SelectItem value="todos">Todos os status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Solicitante</th>
              <th className="text-left p-3">OS</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Plano</th>
              <th className="text-left p-3">Liberação</th>
              <th className="text-right p-3">Peso total</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {liberadas.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">Nenhuma liberação encontrada.</td></tr>
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
                  <td className="p-3 font-mono text-xs">
                    {s.os}
                    <div className="text-[11px] text-muted-foreground font-sans">Necessidade {fmtDate(s.dataNecessidade)}</div>
                  </td>
                  <td className="p-3"><StatusBadge status={statusReal(s)} /></td>
                  <td className="p-3 font-mono text-xs">{s.numeroPlano ?? "—"}</td>
                  <td className="p-3 font-mono text-xs text-primary">{s.numeroLiberacao}</td>
                  <td className="p-3 text-right font-mono">{pesoTotal(s).toLocaleString("pt-BR")} kg</td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-10" onClick={() => setDetalhe(s.id)}>
                        <PackageCheck className="h-4 w-4 mr-1" />
                        Agrupamentos{pend > 0 && <span className="ml-1 text-[10px] text-primary">({pend})</span>}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-10 w-10 p-0" onClick={() => setLiberacao(s.id)} title="Detalhes da liberação">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-10 w-10 p-0" onClick={() => setHistorico(s.id)} title="Histórico">
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
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    if (a.pdfUrl) window.open(a.pdfUrl, "_blank", "noopener");
                    else toast.info(`PDF ${a.pdfNome ?? a.nome + ".pdf"} — disponível no ERP`);
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1" /> Abrir PDF
                </Button>
                <DesafioButton solic={solic} agrup={a} size="sm" variant="ghost" label="Desafio" />
                {a.statusCorte === "Liberado" ? (
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground h-10"
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
                <Campo label="RIR" v={a.rir} copiavel />
                <Campo label="Código do material" v={a.codigoMaterial} copiavel />
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

function Campo({ label, v, copiavel }: { label: string; v?: string; copiavel?: boolean }) {
  const valor = v && v !== "—" ? v : "—";
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1">
        <span className="font-mono truncate">{valor}</span>
        {copiavel && valor !== "—" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 p-0"
            title={`Copiar ${label}`}
            onClick={() => copiar(valor, label)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
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
          <Campo label="Nº Liberação" v={solic.numeroLiberacao} copiavel />
          <Campo label="Plano" v={solic.numeroPlano} copiavel />
          <Campo label="Solicitação" v={solic.id} />
          <Campo label="OS" v={solic.os} />
          <Campo label="Solicitante" v={solic.planejadorCriador} />
          <Campo label="Tipo" v={solic.tipo} />
          <Campo label="Liberado em" v={fmtDateTime(solic.liberacaoEm)} />
          <Campo label="Liberado por" v={solic.liberacaoPor} />
          <Campo label="Necessidade" v={fmtDate(solic.dataNecessidade)} />
          <Campo label="Peso total" v={`${pesoTotal(solic).toLocaleString("pt-BR")} kg`} />
          <Campo label="Status" v={statusReal(solic)} />
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
