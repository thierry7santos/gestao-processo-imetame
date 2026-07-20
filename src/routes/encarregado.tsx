import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { findUser } from "@/lib/auth";
import { RequireAuth } from "@/components/app/RequireAuth";
import { StatusBadge } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtMin, todayISO, startOfWeek, addDays, weekDays, fmtDate } from "@/lib/formatters";
import type { Agrupamento, Maquina, Solicitacao } from "@/lib/types";
import { CalendarDays, ChevronLeft, ChevronRight, X, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { aplicarPassivosAnteriores } from "@/services/dataService";

export const Route = createFileRoute("/encarregado")({
  component: () => (
    <RequireAuth perfis={["encarregado"]}>
      <EncarregadoPage />
    </RequireAuth>
  ),
});

const MAQUINAS: Maquina[] = ["CNC-3", "Messer"];

function EncarregadoPage() {
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const solicitacoes = useStore((s) => s.solicitacoes);
  const toggleChapa = useStore((s) => s.toggleChapaRecebida);
  const alocar = useStore((s) => s.alocarAgrupamento);
  const desalocar = useStore((s) => s.desalocarAgrupamento);

  const [maquina, setMaquina] = useState<Maquina>("CNC-3");
  const [semanaStart, setSemanaStart] = useState<string>(startOfWeek(todayISO()));

  // Ao carregar a tela do encarregado, devolve para "Disponíveis" os agrupamentos
  // de semanas fechadas cujo corte não foi finalizado (Passivo Anterior).
  useEffect(() => {
    const n = aplicarPassivosAnteriores();
    if (n > 0) toast(`${n} agrupamento(s) devolvido(s) como Passivo Anterior.`, { icon: "⚠️" });
  }, []);

  // Agrupamentos disponíveis (não alocados) de solicitações em status válidos
  const disponiveis = useMemo(() => {
    const validos = ["Concluído", "A Revisar", "Em Revisão", "Revisado"];
    const out: { solic: Solicitacao; agrup: Agrupamento; alerta: "orange" | "purple" | null; passivo: boolean }[] = [];
    for (const s of solicitacoes) {
      if (!validos.includes(s.status)) continue;
      for (const a of s.agrupamentos) {
        if (a.statusCorte === "Aguardando") {
          out.push({
            solic: s, agrup: a,
            alerta: s.status === "A Revisar" ? "orange" : ["Em Revisão", "Revisado"].includes(s.status) ? "purple" : null,
            passivo: !!a.isPassivoAnterior,
          });
        }
      }
    }
    // Passivo Anterior no topo, depois pelo ID.
    return out.sort((a, b) => {
      if (a.passivo !== b.passivo) return a.passivo ? -1 : 1;
      return a.solic.id.localeCompare(b.solic.id);
    });
  }, [solicitacoes]);

  const dias = weekDays(semanaStart);

  // Blocos alocados por dia
  const blocosPorDia = useMemo(() => {
    const map: Record<string, { solic: Solicitacao; agrup: Agrupamento }[]> = {};
    for (const d of dias) map[d.iso] = [];
    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        if (a.maquina !== maquina || !a.diaAlocado) continue;
        if (!(a.diaAlocado in map)) continue;
        map[a.diaAlocado].push({ solic: s, agrup: a });
      }
    }
    return map;
  }, [solicitacoes, maquina, dias]);

  function tryAlocar(item: { solic: Solicitacao; agrup: Agrupamento }, diaISO: string) {
    if (!item.agrup.chapaRecebida) {
      toast.error("Marque 'Chapa recebida pela preparação' antes de alocar");
      return;
    }
    const dia = dias.find((d) => d.iso === diaISO)!;
    const usado = blocosPorDia[diaISO].reduce((acc, b) => acc + (b.agrup.tempoEstMin ?? 0), 0);
    if (usado + (item.agrup.tempoEstMin ?? 0) > dia.limitMin) {
      toast.error(`Excede o limite diário (${fmtMin(dia.limitMin)}) de ${maquina}`);
      return;
    }
    alocar(item.solic.id, item.agrup.id, maquina, diaISO, user.nome);
    toast.success(`Alocado em ${fmtDate(diaISO)}`);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1800px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Preparação · Encarregado</h1>
          <p className="text-sm text-muted-foreground">Alocação semanal por máquina.</p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <Label className="text-xs">Máquina ativa</Label>
            <Select value={maquina} onValueChange={(v) => setMaquina(v as Maquina)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAQUINAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Semana</Label>
            <div className="flex gap-1 items-center">
              <Button size="icon" variant="outline" onClick={() => setSemanaStart(addDays(semanaStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="px-3 py-1.5 rounded bg-secondary text-sm font-mono min-w-[10rem] text-center">
                <CalendarDays className="h-3 w-3 inline mr-1" />
                {fmtDate(semanaStart)} → {fmtDate(addDays(semanaStart, 5))}
              </div>
              <Button size="icon" variant="outline" onClick={() => setSemanaStart(addDays(semanaStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setSemanaStart(startOfWeek(todayISO()))}>Hoje</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* Lista de disponíveis */}
        <Card className="p-3 space-y-2 max-h-[75vh] overflow-y-auto">
          <div className="text-sm font-bold flex items-center justify-between">
            Disponíveis
            <span className="text-xs font-normal text-muted-foreground">{disponiveis.length}</span>
          </div>
          {disponiveis.length === 0 && (
            <div className="text-xs text-muted-foreground p-4 text-center">Sem agrupamentos disponíveis.</div>
          )}
          {disponiveis.map((item) => {
            const pulse = item.alerta === "orange" ? "pulse-orange border-orange-500/60"
              : item.alerta === "purple" ? "pulse-purple border-purple-500/60" : "border-border";
            return (
              <div key={item.agrup.id} className={`p-2 rounded border ${item.passivo ? "border-orange-600 bg-orange-950/40" : pulse + " bg-secondary/60"} text-xs space-y-1.5`}>
                {item.passivo && (
                  <div className="flex items-center gap-1 -mt-1 -mx-1 mb-1 px-2 py-1 rounded-t bg-orange-700 text-white text-[10px] font-extrabold uppercase tracking-wide">
                    <AlertOctagon className="h-3 w-3" /> Passivo Anterior
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold">{item.agrup.nome}</div>
                  <StatusBadge status={item.solic.status} />
                </div>
                <div className="text-muted-foreground truncate">{item.solic.id} · {item.solic.titulo}</div>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span>Peso: <b className="text-foreground">{item.agrup.peso ?? "—"}kg</b></span>
                  <span>Tempo: <b className="text-foreground">{fmtMin(item.agrup.tempoEstMin)}</b></span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={item.agrup.chapaRecebida} onCheckedChange={() => toggleChapa(item.solic.id, item.agrup.id)} />
                  <span>Chapa recebida pela preparação</span>
                </label>
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {dias.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => tryAlocar(item, d.iso)}
                      className="text-[10px] px-1 py-1 rounded bg-primary/20 hover:bg-primary/40 text-primary font-bold"
                      title={`Alocar em ${d.label} ${fmtDate(d.iso)}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>

        {/* Calendário */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {dias.map((d) => {
            const blocos = blocosPorDia[d.iso];
            const usado = blocos.reduce((acc, b) => acc + (b.agrup.tempoEstMin ?? 0), 0);
            const peso = blocos.reduce((acc, b) => acc + (b.agrup.peso ?? 0), 0);
            const restante = d.limitMin - usado;
            const pct = Math.min(100, (usado / d.limitMin) * 100);
            return (
              <Card key={d.iso} className="p-2 space-y-2 min-h-[300px]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground font-semibold">{d.label}</div>
                    <div className="text-sm font-bold font-mono">{fmtDate(d.iso)}</div>
                  </div>
                  <div className="text-right text-[10px]">
                    <div className="text-muted-foreground">Limite</div>
                    <div className="font-mono">{fmtMin(d.limitMin)}</div>
                  </div>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div className={`h-full ${restante < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span>Usado <b>{fmtMin(usado)}</b></span>
                  <span className={restante < 0 ? "text-destructive" : "text-primary"}>Rest. <b>{fmtMin(Math.max(0, restante))}</b></span>
                </div>
                <div className="text-[10px] text-muted-foreground">Peso alocado: <b className="text-foreground font-mono">{peso.toLocaleString("pt-BR")} kg</b></div>
                <div className="space-y-1.5">
                  {blocos.map((b) => {
                    const cls = b.agrup.statusCorte === "Cortado" ? "bg-primary/25 border-primary/60"
                      : b.agrup.statusCorte === "Em Corte" ? "bg-yellow-500/25 border-yellow-500/60"
                      : b.agrup.statusCorte === "Corte Paralisado" ? "bg-orange-500/25 border-orange-500/60 pulse-orange"
                      : "bg-blue-500/15 border-blue-500/40";
                    return (
                      <div key={b.agrup.id} className={`p-1.5 rounded border ${cls} text-[11px]`}>
                        <div className="flex items-center justify-between">
                          <div className="font-mono font-bold">{b.agrup.nome}</div>
                          {b.agrup.statusCorte === "Alocado" && (
                            <button onClick={() => desalocar(b.solic.id, b.agrup.id)} className="text-muted-foreground hover:text-destructive" title="Desalocar">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{fmtMin(b.agrup.tempoEstMin)}</span>
                          <span>{b.agrup.peso}kg</span>
                        </div>
                        <StatusBadge status={b.agrup.statusCorte} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
