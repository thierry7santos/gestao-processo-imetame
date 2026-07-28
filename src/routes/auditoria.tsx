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
import { fmtDate, fmtDateTime, fmtMin, minutesBetween } from "@/lib/formatters";
import type { Maquina, StatusSolicitacao } from "@/lib/types";
import { findUser, perfilLabel } from "@/lib/auth";
import { ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DesafioButton } from "@/components/app/DesafioButton";

export const Route = createFileRoute("/auditoria")({
  component: () => (
    <RequireAuth perfis={["planejador", "programador", "materiais", "encarregado"]}>
      <AuditoriaPage />
    </RequireAuth>
  ),
});

function AuditoriaPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const [fId, setFId] = useState("");
  const [fPlano, setFPlano] = useState("");
  const [fOs, setFOs] = useState("");
  const [fInicio, setFInicio] = useState("");
  const [fFim, setFFim] = useState("");
  const [fMaquina, setFMaquina] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<string>("todos");

  const linhas = useMemo(() => {
    const out: {
      solicId: string; os: string; plano?: string; agrupNome: string;
      maquina?: Maquina; real: { comp?: number; larg?: number };
      dig: { comp?: number; larg?: number };
      status: string; operador?: string; inicio?: string; fim?: string;
      solic: (typeof solicitacoes)[number]; agrupId: string;
    }[] = [];
    for (const s of solicitacoes) {
      if (fId && !s.id.includes(fId)) continue;
      if (fOs && !s.os.includes(fOs)) continue;
      if (fPlano && !(s.numeroPlano ?? "").includes(fPlano)) continue;
      if (fStatus !== "todos" && s.status !== fStatus) continue;
      for (const a of s.agrupamentos) {
        if (fMaquina !== "todas" && a.maquina !== fMaquina) continue;
        if (fInicio && (!a.inicioCorte || a.inicioCorte < fInicio)) continue;
        if (fFim && (!a.inicioCorte || a.inicioCorte > fFim + "T23:59")) continue;
        out.push({
          solicId: s.id, os: s.os, plano: s.numeroPlano, agrupNome: a.nome,
          maquina: a.maquina, real: { comp: a.comprimento, larg: a.largura },
          dig: { comp: a.validacao?.compDigitado, larg: a.validacao?.largDigitado },
          status: a.statusCorte, operador: a.operador,
          inicio: a.inicioCorte, fim: a.fimCorte, solic: s, agrupId: a.id,
        });
      }
    }
    return out;
  }, [solicitacoes, fId, fOs, fPlano, fInicio, fFim, fMaquina, fStatus]);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Auditoria de Produção</h1>
        <p className="text-sm text-muted-foreground">Comparativo real vs digitado — desvios &gt; ±50 mm em vermelho.</p>
      </header>

      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <FiltroInput label="ID" value={fId} setValue={setFId} />
          <FiltroInput label="Plano" value={fPlano} setValue={setFPlano} />
          <FiltroInput label="OS" value={fOs} setValue={setFOs} />
          <FiltroInput label="De" type="date" value={fInicio} setValue={setFInicio} />
          <FiltroInput label="Até" type="date" value={fFim} setValue={setFFim} />
          <div>
            <Label className="text-xs">Máquina</Label>
            <Select value={fMaquina} onValueChange={setFMaquina}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="CNC-3">CNC-3</SelectItem>
                <SelectItem value="Messer">Messer</SelectItem>
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
                <th className="px-2 py-2 text-left">Solic.</th>
                <th className="px-2 py-2 text-left">OS</th>
                <th className="px-2 py-2 text-left">Plano</th>
                <th className="px-2 py-2 text-left">Agrup.</th>
                <th className="px-2 py-2 text-left">Máquina</th>
                <th className="px-2 py-2 text-right">Comp. Real</th>
                <th className="px-2 py-2 text-right">Comp. Digitado</th>
                <th className="px-2 py-2 text-right">Larg. Real</th>
                <th className="px-2 py-2 text-right">Larg. Digitado</th>
                <th className="px-2 py-2 text-left">Operador</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => {
                const desvC = r.dig.comp != null && r.real.comp != null ? Math.abs(r.dig.comp - r.real.comp) : 0;
                const desvL = r.dig.larg != null && r.real.larg != null ? Math.abs(r.dig.larg - r.real.larg) : 0;
                return (
                  <AudLinha key={`${r.solicId}-${r.agrupId}`} r={r} desvC={desvC} desvL={desvL} />
                );
              })}
              {linhas.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum registro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AudLinha({ r, desvC, desvL }: { r: any; desvC: number; desvL: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t border-border">
        <td className="px-2 py-1 font-mono">{r.solicId}</td>
        <td className="px-2 py-1 font-mono">{r.os}</td>
        <td className="px-2 py-1 font-mono">{r.plano ?? "—"}</td>
        <td className="px-2 py-1 font-mono font-bold">{r.agrupNome}</td>
        <td className="px-2 py-1">{r.maquina ?? "—"}</td>
        <td className="px-2 py-1 text-right font-mono">{r.real.comp ?? "—"}</td>
        <td className={`px-2 py-1 text-right font-mono ${desvC > 50 ? "pulse-red text-white font-bold" : ""}`}>{r.dig.comp ?? "—"}</td>
        <td className="px-2 py-1 text-right font-mono">{r.real.larg ?? "—"}</td>
        <td className={`px-2 py-1 text-right font-mono ${desvL > 50 ? "pulse-red text-white font-bold" : ""}`}>{r.dig.larg ?? "—"}</td>
        <td className="px-2 py-1">{r.operador ?? "—"}</td>
        <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
        <td className="px-2 py-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </td>
      </tr>
      {open && (
        <tr className="bg-background/40">
          <td colSpan={12} className="px-4 py-3">
            <div className="text-xs uppercase text-muted-foreground font-semibold mb-2">Linha do tempo · {r.solicId} · {r.agrupNome}</div>
            <ol className="space-y-1.5">
              {r.solic.historico.map((h: any, i: number) => (
                <li key={i} className="flex gap-3 text-xs">
                  <span className="text-muted-foreground font-mono w-40 shrink-0">{fmtDateTime(h.dataHora)}</span>
                  <span className="font-semibold w-40 shrink-0">{h.usuario}</span>
                  <span>{h.mudanca}</span>
                </li>
              ))}
              {r.inicio && (
                <li className="flex gap-3 text-xs">
                  <span className="text-muted-foreground font-mono w-40 shrink-0">{fmtDateTime(r.inicio)}</span>
                  <span className="font-semibold w-40 shrink-0">{r.operador}</span>
                  <span>Início do corte</span>
                </li>
              )}
              {(r.solic.agrupamentos.find((a: any) => a.id === r.agrupId)?.paradas ?? []).map((p: any, i: number) => (
                <li key={`p-${i}`} className="flex gap-3 text-xs bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1">
                  <span className="text-muted-foreground font-mono w-40 shrink-0">{fmtDateTime(p.inicio)}</span>
                  <span className="font-semibold w-40 shrink-0 text-orange-300">{p.operador}</span>
                  <span>
                    <b className="text-orange-300">Paralisou corte</b> — motivo: <b>{p.motivo}</b>
                    {p.fim && <> · retomado {fmtDateTime(p.fim)} ({fmtMin(minutesBetween(p.inicio, p.fim))} parado)</>}
                    {!p.fim && <> · <span className="text-orange-300 font-bold">ainda parado</span></>}
                  </span>
                </li>
              ))}
              {r.fim && (
                <li className="flex gap-3 text-xs">
                  <span className="text-muted-foreground font-mono w-40 shrink-0">{fmtDateTime(r.fim)}</span>
                  <span className="font-semibold w-40 shrink-0">{r.operador}</span>
                  <span>Corte finalizado ({fmtMin(minutesBetween(r.inicio, r.fim))})</span>
                </li>
              )}
            </ol>
            {r.solic.observacoesProgramador && (
              <div className="mt-2 text-xs"><b>Obs. programador:</b> {r.solic.observacoesProgramador}</div>
            )}
          </td>
        </tr>
      )}
    </>
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
