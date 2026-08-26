import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { RequireAuth } from "@/components/app/RequireAuth";
import { StatusBadge } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fmtDate, fmtDateTime, fmtMin, minutesBetween } from "@/lib/formatters";
import type { Maquina, Solicitacao, StatusSolicitacao } from "@/lib/types";
import { findUser, perfilLabel } from "@/lib/auth";
import { AlertCircle, CheckCircle2, AlertTriangle, Ruler, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { toast } from "sonner";
import { exportarAuditoriaPDF, exportarAuditoriaExcel } from "@/lib/exporters";

export const Route = createFileRoute("/auditoria")({
  component: () => (
    <RequireAuth perfis={["planejador", "programador", "materiais", "encarregado"]}>
      <AuditoriaPage />
    </RequireAuth>
  ),
});

const TODAS_MAQUINAS: Maquina[] = ["CNC-3", "Messer", "Robô-01", "Robô-02", "Bodor-D"];

function AuditoriaPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const desafios = useStore((s) => s.desafios);
  const resolver = useStore((s) => s.resolverDesafio);
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;

  const [fId, setFId] = useState("");
  const [fPlano, setFPlano] = useState("");
  const [fOs, setFOs] = useState("");
  const [fSolicitante, setFSolicitante] = useState("");
  const [fTipo, setFTipo] = useState<string>("todos");
  const [fMaquina, setFMaquina] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [detalhe, setDetalhe] = useState<Solicitacao | null>(null);
  const [resolucaoTxt, setResolucaoTxt] = useState<Record<string, string>>({});

  const meusDesafios = desafios.filter((d) => d.status === "Aberto" && d.atribuidoA === user.perfil);
  const outrosDesafios = desafios.filter((d) => !(d.status === "Aberto" && d.atribuidoA === user.perfil));

  const linhas = useMemo(() => {
    return solicitacoes
      .filter((s) => {
        if (fId && !s.id.toLowerCase().includes(fId.toLowerCase())) return false;
        if (fPlano && !(s.numeroPlano ?? "").toLowerCase().includes(fPlano.toLowerCase())) return false;
        if (fOs && !s.os.toLowerCase().includes(fOs.toLowerCase())) return false;
        if (fSolicitante && !s.planejadorCriador.toLowerCase().includes(fSolicitante.toLowerCase())) return false;
        if (fTipo !== "todos" && s.tipo !== fTipo) return false;
        if (fStatus !== "todos" && s.status !== fStatus) return false;
        if (fMaquina !== "todas" && !s.agrupamentos.some((a) => a.maquina === fMaquina)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [solicitacoes, fId, fPlano, fOs, fSolicitante, fTipo, fMaquina, fStatus]);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Produção</h1>
          <p className="text-sm text-muted-foreground">Histórico geral das solicitações — da criação ao corte de todos os agrupamentos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { if (linhas.length === 0) { toast("Nada para exportar"); return; } exportarAuditoriaExcel(linhas); toast.success("Excel gerado"); }}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => { if (linhas.length === 0) { toast("Nada para exportar"); return; } exportarAuditoriaPDF(linhas); toast.success("PDF gerado"); }}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </header>

      <Card className="p-3 border-orange-500/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-orange-300">
            <AlertCircle className="h-4 w-4" /> Desafios atribuídos a mim ({perfilLabel(user.perfil)})
          </div>
          <div className="text-xs text-muted-foreground">{meusDesafios.length} aberto(s) · {outrosDesafios.length} outro(s)</div>
        </div>
        {meusDesafios.length === 0 && (
          <div className="text-xs text-muted-foreground py-2">Nenhum desafio aberto para você.</div>
        )}
        <div className="space-y-2">
          {meusDesafios.map((d) => (
            <div key={d.id} className="p-3 rounded border border-orange-500/40 bg-orange-500/5 space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <div>
                  <span className="font-mono font-bold text-orange-200">{d.id}</span> ·
                  <span className="font-mono ml-1">{d.solicId}</span>
                  {d.agrupNome && <> · agrup. <span className="font-mono">{d.agrupNome}</span></>}
                </div>
                <div className="text-muted-foreground">
                  Aberto por <b>{d.criadoPor}</b> ({perfilLabel(d.criadoPorPerfil)}) · {fmtDateTime(d.criadoEm)}
                </div>
              </div>
              <div className="text-sm">{d.descricao}</div>
              <div className="text-xs text-muted-foreground">
                Responsável (culpa): <b className="text-foreground">{perfilLabel(d.responsavel)}</b>
                {d.resolucao && <> · Sugestão: <span className="text-foreground">{d.resolucao}</span></>}
              </div>
              <div className="flex gap-2">
                <Textarea
                  rows={1}
                  placeholder="Descreva a resolução aplicada (opcional)"
                  value={resolucaoTxt[d.id] ?? ""}
                  onChange={(e) => setResolucaoTxt({ ...resolucaoTxt, [d.id]: e.target.value })}
                />
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => { resolver(d.id, resolucaoTxt[d.id] ?? "", user.nome); toast.success(`Desafio ${d.id} resolvido`); }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver
                </Button>
              </div>
            </div>
          ))}
        </div>
        {outrosDesafios.length > 0 && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver outros desafios ({outrosDesafios.length})</summary>
            <div className="mt-2 space-y-1">
              {outrosDesafios.map((d) => (
                <div key={d.id} className="flex justify-between gap-2 p-2 rounded bg-secondary/50">
                  <div>
                    <span className="font-mono font-bold">{d.id}</span> · {d.solicId}{d.agrupNome ? ` · ${d.agrupNome}` : ""} — {d.descricao}
                  </div>
                  <div className="whitespace-nowrap text-muted-foreground">
                    → {perfilLabel(d.atribuidoA)} · {d.status === "Aberto" ? <span className="text-orange-300 font-bold">Aberto</span> : <span className="text-primary font-bold">Resolvido</span>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>

      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <FiltroInput label="ID" value={fId} setValue={setFId} />
          <FiltroInput label="Plano" value={fPlano} setValue={setFPlano} />
          <FiltroInput label="OS" value={fOs} setValue={setFOs} />
          <FiltroInput label="Solicitante" value={fSolicitante} setValue={setFSolicitante} />
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={fTipo} onValueChange={setFTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Chapa">Chapa</SelectItem>
                <SelectItem value="Perfil">Perfil</SelectItem>
                <SelectItem value="Tubulação">Tubulação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Máquina</Label>
            <Select value={fMaquina} onValueChange={setFMaquina}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {TODAS_MAQUINAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["todos","Em Fila","Em Processo","Paralisado","Concluído","A Revisar","Em Revisão","Revisado","Cancelado"] as (string|StatusSolicitacao)[]).map(s => (
                  <SelectItem key={s} value={s as string}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Solicitante</th>
                <th className="px-2 py-2 text-left">OS</th>
                <th className="px-2 py-2 text-left">Título</th>
                <th className="px-2 py-2 text-left">Tipo</th>
                <th className="px-2 py-2 text-left">Plano</th>
                <th className="px-2 py-2 text-left">Necessidade</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Progresso corte</th>
                <th className="px-2 py-2 text-left">Máquinas</th>
                <th className="px-2 py-2 text-left">Divergência</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((s) => {
                const total = s.agrupamentos.length;
                const cortados = s.agrupamentos.filter((a) => a.statusCorte === "Cortado").length;
                const maquinas = Array.from(new Set(s.agrupamentos.map((a) => a.maquina).filter(Boolean))) as string[];
                const temDivergencia = s.agrupamentos.some((a) => {
                  const dc = a.validacao?.compDigitado != null && a.comprimento != null ? Math.abs(a.validacao.compDigitado - a.comprimento) : 0;
                  const dl = a.validacao?.largDigitado != null && a.largura != null ? Math.abs(a.validacao.largDigitado - a.largura) : 0;
                  return dc > 50 || dl > 50;
                });
                return (
                  <tr
                    key={s.id}
                    className={`border-t border-border ${temDivergencia ? "bg-yellow-500/10 border-l-4 border-l-yellow-500" : ""}`}
                  >
                    <td className="px-2 py-1.5 font-mono font-semibold">{s.id}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{s.planejadorCriador}</td>
                    <td className="px-2 py-1.5 font-mono">{s.os}</td>
                    <td className="px-2 py-1.5 max-w-[220px] truncate">{s.titulo}</td>
                    <td className="px-2 py-1.5">{s.tipo}</td>
                    <td className="px-2 py-1.5 font-mono">{s.numeroPlano ?? "—"}</td>
                    <td className="px-2 py-1.5">{fmtDate(s.dataNecessidade)}</td>
                    <td className="px-2 py-1.5"><StatusBadge status={s.status} /></td>
                    <td className="px-2 py-1.5 font-mono">
                      {total === 0 ? "—" : `${cortados}/${total}`}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{maquinas.join(", ") || "—"}</td>
                    <td className="px-2 py-1.5">
                      {temDivergencia ? (
                        <span className="inline-flex items-center gap-1 text-yellow-300 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" /> Ver medidas
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetalhe(s)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Detalhes
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {linhas.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DetalheDialog solic={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}

function DetalheDialog({ solic, onClose }: { solic: Solicitacao | null; onClose: () => void }) {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const atual = solic ? solicitacoes.find((x) => x.id === solic.id) : null;
  if (!atual) return null;

  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{atual.id}</span> · {atual.titulo}
            <StatusBadge status={atual.status} />
            <span className="text-xs text-muted-foreground font-normal ml-2">
              OS <b className="font-mono">{atual.os}</b> · Solicitante <b>{atual.planejadorCriador}</b>
            </span>
          </DialogTitle>
        </DialogHeader>

        <section className="space-y-2">
          <div className="text-xs uppercase font-semibold text-muted-foreground">Validação de medidas (Real × Digitado)</div>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-2 py-1.5 text-left">Agrup.</th>
                  <th className="px-2 py-1.5 text-left">Máquina</th>
                  <th className="px-2 py-1.5 text-right">Comp. Real</th>
                  <th className="px-2 py-1.5 text-right">Comp. Dig.</th>
                  <th className="px-2 py-1.5 text-right">Larg. Real</th>
                  <th className="px-2 py-1.5 text-right">Larg. Dig.</th>
                  <th className="px-2 py-1.5 text-left">Operador</th>
                  <th className="px-2 py-1.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {atual.agrupamentos.map((a) => {
                  const dc = a.validacao?.compDigitado != null && a.comprimento != null ? Math.abs(a.validacao.compDigitado - a.comprimento) : 0;
                  const dl = a.validacao?.largDigitado != null && a.largura != null ? Math.abs(a.validacao.largDigitado - a.largura) : 0;
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-2 py-1 font-mono font-semibold">{a.nome}</td>
                      <td className="px-2 py-1">{a.maquina ?? "—"}</td>
                      <td className="px-2 py-1 text-right font-mono">{a.comprimento ?? "—"}</td>
                      <td className={`px-2 py-1 text-right font-mono ${dc > 50 ? "pulse-red text-white font-bold" : ""}`}>{a.validacao?.compDigitado ?? "—"}</td>
                      <td className="px-2 py-1 text-right font-mono">{a.largura ?? "—"}</td>
                      <td className={`px-2 py-1 text-right font-mono ${dl > 50 ? "pulse-red text-white font-bold" : ""}`}>{a.validacao?.largDigitado ?? "—"}</td>
                      <td className="px-2 py-1">{a.operador ?? "—"}</td>
                      <td className="px-2 py-1"><StatusBadge status={a.statusCorte} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Ruler className="h-3 w-3" /> Desvios &gt; ±50 mm são destacados em vermelho.
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-xs uppercase font-semibold text-muted-foreground">Linha do tempo da solicitação</div>
          <ol className="space-y-1.5">
            {atual.historico.map((h, i) => (
              <li key={i} className="flex gap-3 text-xs">
                <span className="text-muted-foreground font-mono w-40 shrink-0">{fmtDateTime(h.dataHora)}</span>
                <span className="font-semibold w-40 shrink-0">{h.usuario}</span>
                <span>{h.mudanca}</span>
              </li>
            ))}
            {atual.agrupamentos.flatMap((a) => [
              ...(a.inicioCorte ? [{
                t: a.inicioCorte, who: a.operador ?? "—", msg: `Início do corte · agrup. ${a.nome}`, kind: "info" as const,
              }] : []),
              ...(a.paradas ?? []).map((p) => ({
                t: p.inicio, who: p.operador,
                msg: `Paralisou corte · agrup. ${a.nome} — motivo: ${p.motivo}${p.fim ? ` · retomado ${fmtDateTime(p.fim)} (${fmtMin(minutesBetween(p.inicio, p.fim))} parado)` : " · ainda parado"}`,
                kind: "warn" as const,
              })),
              ...(a.fimCorte ? [{
                t: a.fimCorte, who: a.operador ?? "—",
                msg: `Corte finalizado · agrup. ${a.nome}${a.inicioCorte ? ` (${fmtMin(minutesBetween(a.inicioCorte, a.fimCorte))})` : ""}`,
                kind: "ok" as const,
              }] : []),
            ]).sort((x, y) => x.t.localeCompare(y.t)).map((e, i) => (
              <li key={`e-${i}`} className={`flex gap-3 text-xs px-2 py-1 rounded ${
                e.kind === "warn" ? "bg-orange-500/10 border border-orange-500/30"
                : e.kind === "ok" ? "bg-primary/5 border border-primary/30"
                : ""
              }`}>
                <span className="text-muted-foreground font-mono w-40 shrink-0">{fmtDateTime(e.t)}</span>
                <span className="font-semibold w-40 shrink-0">{e.who}</span>
                <span>{e.msg}</span>
              </li>
            ))}
          </ol>
          {atual.observacoesProgramador && (
            <div className="mt-2 text-xs"><b>Obs. programador:</b> {atual.observacoesProgramador}</div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function FiltroInput({ label, value, setValue, type = "text" }: { label: string; value: string; setValue: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => setValue(e.target.value)} className="h-9" />
    </div>
  );
}
