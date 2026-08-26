import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { findUser, maquinasDoUsuario, MAQUINAS_POR_TIPO } from "@/lib/auth";
import { RequireAuth } from "@/components/app/RequireAuth";
import { StatusBadge } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtMin, todayISO, startOfWeek, addDays, weekDays, fmtDate, minutesBetween, fmtDateTime } from "@/lib/formatters";
import type { Agrupamento, Maquina, Solicitacao, Turno } from "@/lib/types";
import { CalendarDays, ChevronLeft, ChevronRight, X, AlertOctagon, Sun, Moon, Wrench, PlayCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  aplicarPassivosAnteriores, alocarAgrupamento as svcAlocar,
  iniciarSetup as svcIniciarSetup, finalizarSetup as svcFinalizarSetup,
} from "@/services/dataService";
import { DesafioButton } from "@/components/app/DesafioButton";

export const Route = createFileRoute("/encarregado")({
  component: () => (
    <RequireAuth perfis={["encarregado"]}>
      <EncarregadoPage />
    </RequireAuth>
  ),
});

const TURNOS: Turno[] = ["Dia", "Noite"];

function EncarregadoPage() {
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const tipoUsuario = user.tipo ?? "Chapa";
  const maquinasArea = useMemo(() => maquinasDoUsuario(user), [user]);

  const solicitacoes = useStore((s) => s.solicitacoes);
  const toggleChapa = useStore((s) => s.toggleChapaRecebida);
  const desalocar = useStore((s) => s.desalocarAgrupamento);

  const [maquina, setMaquina] = useState<Maquina>(maquinasArea[0]);
  const [turno, setTurno] = useState<Turno>("Dia");
  const [semanaStart, setSemanaStart] = useState<string>(startOfWeek(todayISO()));

  useEffect(() => {
    const n = aplicarPassivosAnteriores();
    if (n > 0) toast(`${n} agrupamento(s) devolvido(s) como Passivo Anterior.`, { icon: "⚠️" });
  }, []);

  // Se o tipo mudar (troca de sessão), garantir máquina válida
  useEffect(() => {
    if (!maquinasArea.includes(maquina)) setMaquina(maquinasArea[0]);
  }, [maquinasArea, maquina]);

  // Disponíveis: apenas agrupamentos que o Materiais já movimentou.
  const disponiveis = useMemo(() => {
    const validos = ["Concluído", "A Revisar", "Em Revisão", "Revisado"];
    const out: { solic: Solicitacao; agrup: Agrupamento; alerta: "orange" | "purple" | null; passivo: boolean }[] = [];
    for (const s of solicitacoes) {
      if (s.tipo !== tipoUsuario) continue;
      if (!validos.includes(s.status)) continue;
      for (const a of s.agrupamentos) {
        if (a.statusCorte === "Movimentado") {
          out.push({
            solic: s, agrup: a,
            alerta: s.status === "A Revisar" ? "orange" : ["Em Revisão", "Revisado"].includes(s.status) ? "purple" : null,
            passivo: !!a.isPassivoAnterior,
          });
        }
      }
    }
    return out.sort((a, b) => {
      if (a.passivo !== b.passivo) return a.passivo ? -1 : 1;
      return a.solic.id.localeCompare(b.solic.id);
    });
  }, [solicitacoes, tipoUsuario]);

  const dias = weekDays(semanaStart);

  // Blocos por dia, filtrados por (máquina, turno) selecionados
  const blocosPorDia = useMemo(() => {
    const map: Record<string, { solic: Solicitacao; agrup: Agrupamento }[]> = {};
    for (const d of dias) map[d.iso] = [];
    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        if (a.maquina !== maquina) continue;
        if ((a.turno ?? "Dia") !== turno) continue;
        if (!a.diaAlocado || !(a.diaAlocado in map)) continue;
        map[a.diaAlocado].push({ solic: s, agrup: a });
      }
    }
    return map;
  }, [solicitacoes, maquina, turno, dias]);

  function tryAlocar(item: { solic: Solicitacao; agrup: Agrupamento }, diaISO: string) {
    if (!item.agrup.chapaRecebida) {
      toast.error("Marque 'Chapa recebida pela preparação' antes de alocar");
      return;
    }
    const dia = dias.find((d) => d.iso === diaISO)!;
    const usado = blocosPorDia[diaISO].reduce((acc, b) => acc + (b.agrup.tempoEstMin ?? 0), 0);
    if (usado + (item.agrup.tempoEstMin ?? 0) > dia.limitMin) {
      toast.error(`Excede o limite do turno ${turno} (${fmtMin(dia.limitMin)}) de ${maquina}`);
      return;
    }
    svcAlocar(item.solic.id, item.agrup.id, maquina, turno, diaISO, user.nome);
    toast.success(`Alocado em ${fmtDate(diaISO)} · ${maquina} · ${turno}`);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1800px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Preparação · <span className="text-primary">{tipoUsuario === "Tubulação" ? "Tubo" : tipoUsuario}</span></h1>
          <p className="text-sm text-muted-foreground">Alocação semanal por máquina e turno · exibe apenas agrupamentos movimentados pelo Materiais.</p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <Label className="text-xs">Máquina ativa</Label>
            <Select value={maquina} onValueChange={(v) => setMaquina(v as Maquina)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {maquinasArea.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Turno ativo</Label>
            <Select value={turno} onValueChange={(v) => setTurno(v as Turno)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TURNOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      {t === "Dia" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                      {t}
                    </span>
                  </SelectItem>
                ))}
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

      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
        <span className="px-2 py-1 rounded bg-primary/15 text-primary font-bold">{maquina}</span>
        <span className={`px-2 py-1 rounded font-bold inline-flex items-center gap-1 ${turno === "Dia" ? "bg-yellow-400/20 text-yellow-200" : "bg-indigo-500/20 text-indigo-200"}`}>
          {turno === "Dia" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
          Turno {turno}
        </span>
        <span className="text-muted-foreground normal-case">
          {turno === "Dia" ? "07:30 → 17:18" : "18:30 → 04:18"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        {/* Lista de disponíveis */}
        <Card className="p-3 space-y-2 max-h-[80vh] overflow-y-auto">
          <div className="text-sm font-bold flex items-center justify-between">
            Disponíveis · {tipoUsuario === "Tubulação" ? "Tubo" : tipoUsuario}
            <span className="text-xs font-normal text-muted-foreground">{disponiveis.length}</span>
          </div>
          {disponiveis.length === 0 && (
            <div className="text-xs text-muted-foreground p-4 text-center">Sem agrupamentos disponíveis.</div>
          )}
          {disponiveis.map((item) => {
            const pulse = item.alerta === "orange" ? "pulse-orange border-orange-500/60"
              : item.alerta === "purple" ? "pulse-purple border-purple-500/60" : "border-border";
            const a = item.agrup;
            return (
              <div key={a.id} className={`p-2 rounded border ${item.passivo ? "border-orange-600 bg-orange-950/40" : pulse + " bg-secondary/60"} text-xs space-y-1.5`}>
                {item.passivo && (
                  <div className="flex items-center gap-1 -mt-1 -mx-1 mb-1 px-2 py-1 rounded-t bg-orange-700 text-white text-[10px] font-extrabold uppercase tracking-wide">
                    <AlertOctagon className="h-3 w-3" /> Passivo Anterior
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold">{a.nome}</div>
                  <StatusBadge status={item.solic.status} />
                </div>
                <div className="text-muted-foreground truncate">{item.solic.id} · {item.solic.titulo}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                  <span className="text-muted-foreground">Peso: <b className="text-foreground">{a.peso ?? "—"} kg</b></span>
                  <span className="text-muted-foreground">Tempo: <b className="text-foreground">{fmtMin(a.tempoEstMin)}</b></span>
                  <span className="text-muted-foreground">RIR: <b className="text-foreground">{a.rir ?? "—"}</b></span>
                  <span className="text-muted-foreground">Mat.: <b className="text-foreground">{a.material ?? "—"}</b></span>
                  <span className="text-muted-foreground">Esp.: <b className="text-foreground">{a.espessura ? `${a.espessura} mm` : "—"}</b></span>
                  <span className="text-muted-foreground">Qtd: <b className="text-foreground">{a.qtdItens ?? "—"}</b></span>
                  <span className="col-span-2 text-muted-foreground">
                    Comp. × Larg.: <b className="text-foreground">{a.comprimento ?? "—"} × {a.largura ?? "—"} mm</b>
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <Checkbox checked={a.chapaRecebida} onCheckedChange={() => toggleChapa(item.solic.id, a.id)} />
                  <span>Chapa recebida pela preparação</span>
                </label>
                <div className="pt-0.5"><DesafioButton solic={item.solic} agrup={a} /></div>
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {dias.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => tryAlocar(item, d.iso)}
                      className="text-[10px] px-1 py-1 rounded bg-primary/20 hover:bg-primary/40 text-primary font-bold"
                      title={`Alocar em ${d.label} ${fmtDate(d.iso)} · ${maquina} · ${turno}`}
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
                    <div className="text-muted-foreground">Limite {turno}</div>
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
                      : b.agrup.inicioSetup && !b.agrup.fimSetup ? "bg-purple-500/15 border-purple-500/60"
                      : "bg-blue-500/15 border-blue-500/40";
                    const setupEmAndamento = !!b.agrup.inicioSetup && !b.agrup.fimSetup;
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
                        {b.agrup.statusCorte === "Alocado" && (
                          <div className="mt-1 space-y-1">
                            {b.agrup.inicioSetup && b.agrup.fimSetup && (
                              <div className="text-[10px] text-primary flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Setup {fmtMin(b.agrup.setupMin)} · pronto p/ corte
                              </div>
                            )}
                            {setupEmAndamento && (
                              <div className="text-[10px] text-purple-300 flex items-center gap-1">
                                <Wrench className="h-3 w-3 animate-spin" /> Em setup desde {fmtDateTime(b.agrup.inicioSetup).slice(11, 16)}
                              </div>
                            )}
                            {!b.agrup.inicioSetup && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Wrench className="h-3 w-3" /> Aguardando setup do operador
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Legenda das máquinas por tipo — reforço visual */}
      <div className="text-[10px] text-muted-foreground">
        Máquinas disponíveis para esta área: {MAQUINAS_POR_TIPO[tipoUsuario].join(" · ")}
      </div>
    </div>
  );
}
