import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { todayISO, fmtMin, minutesBetween } from "@/lib/formatters";
import type { Agrupamento, Maquina, Solicitacao } from "@/lib/types";
import { Factory, Sun, Moon, Activity, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/andon")({
  component: AndonPage,
});

const MAQUINAS: Maquina[] = ["CNC-3", "Messer", "Robô-01", "Robô-02", "Bodor-D"];

function AndonPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const hoje = todayISO();
  const [agora, setAgora] = useState(Date.now());

  // Auto-refresh do relógio e dos cronômetros a cada 1s
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const hora = new Date(agora);
  const turno: "Dia" | "Noite" = hora.getHours() >= 7 && hora.getHours() < 18 ? "Dia" : "Noite";

  // Estado por máquina derivado dos agrupamentos alocados hoje
  const estadoMaquinas = useMemo(() => {
    const map = new Map<Maquina, {
      atual?: { solic: Solicitacao; agrup: Agrupamento };
      fila: { solic: Solicitacao; agrup: Agrupamento }[];
    }>();
    for (const m of MAQUINAS) map.set(m, { fila: [] });
    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        if (!a.maquina || a.diaAlocado !== hoje) continue;
        const slot = map.get(a.maquina)!;
        if (a.statusCorte === "Em Corte" || a.statusCorte === "Corte Paralisado") {
          slot.atual = { solic: s, agrup: a };
        } else if (a.statusCorte === "Alocado") {
          slot.fila.push({ solic: s, agrup: a });
        }
      }
    }
    return map;
  }, [solicitacoes, hoje]);

  // Totais do dia
  const totais = useMemo(() => {
    let cortados = 0, emAndamento = 0, paralisados = 0, peso = 0;
    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        if (a.diaAlocado !== hoje) continue;
        if (a.statusCorte === "Cortado") { cortados++; peso += a.peso ?? 0; }
        else if (a.statusCorte === "Em Corte") { emAndamento++; peso += a.peso ?? 0; }
        else if (a.statusCorte === "Corte Paralisado") { paralisados++; }
      }
    }
    return { cortados, emAndamento, paralisados, peso };
  }, [solicitacoes, hoje]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 gap-4">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-primary pb-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-12 w-12 rounded-lg bg-primary text-primary-foreground">
            <Factory className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Andon · Chão de Fábrica
            </h1>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Gestão de Processos CNC · Imetame
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-mono font-bold tabular-nums">
              {hora.toLocaleTimeString("pt-BR")}
            </div>
            <div className="text-sm text-muted-foreground">
              {hora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-lg ${turno === "Dia" ? "bg-yellow-400/20 text-yellow-200" : "bg-indigo-500/20 text-indigo-200"}`}>
            {turno === "Dia" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            Turno {turno}
          </div>
        </div>
      </header>

      {/* Totais do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TotalCard label="Cortados hoje" value={String(totais.cortados)} tone="ok" />
        <TotalCard label="Em andamento" value={String(totais.emAndamento)} tone="run" />
        <TotalCard label="Paralisados" value={String(totais.paralisados)} tone={totais.paralisados > 0 ? "warn" : "idle"} />
        <TotalCard label="Peso acumulado" value={`${totais.peso.toLocaleString("pt-BR")} kg`} tone="ok" />
      </div>

      {/* Grade de máquinas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 flex-1">
        {MAQUINAS.map((m) => {
          const slot = estadoMaquinas.get(m)!;
          const atual = slot.atual;
          const cortando = atual?.agrup.statusCorte === "Em Corte";
          const parada = atual?.agrup.statusCorte === "Corte Paralisado";
          const ultimaParada = atual?.agrup.paradas?.[atual.agrup.paradas.length - 1];
          const decorrido = atual?.agrup.inicioCorte ? Math.floor((agora - new Date(atual.agrup.inicioCorte).getTime()) / 60000) : 0;

          const cls = cortando
            ? "bg-primary/15 border-primary border-pulse-green"
            : parada
            ? "bg-orange-500/15 border-orange-500 pulse-orange"
            : atual
            ? "bg-yellow-500/10 border-yellow-500/50"
            : "bg-secondary/40 border-border";

          return (
            <div key={m} className={`rounded-xl border-2 p-4 flex flex-col gap-3 ${cls}`}>
              <div className="flex items-center justify-between">
                <div className="text-xl font-extrabold font-mono">{m}</div>
                {cortando ? (
                  <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                    <Activity className="h-3 w-3" /> CORTANDO
                  </span>
                ) : parada ? (
                  <span className="px-2 py-0.5 rounded bg-orange-500 text-black text-xs font-extrabold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> PARALISADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-bold">OCIOSA</span>
                )}
              </div>

              {atual ? (
                <div className="space-y-1 flex-1">
                  <div className="text-lg font-mono font-bold truncate">{atual.agrup.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {atual.solic.id} · {atual.solic.os}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Operador: <b className="text-foreground">{atual.agrup.operador ?? "—"}</b>
                  </div>
                  {cortando && (
                    <div className="text-3xl font-mono font-extrabold text-primary tabular-nums">
                      {String(Math.floor(decorrido / 60)).padStart(2, "0")}:{String(decorrido % 60).padStart(2, "0")}
                    </div>
                  )}
                  {parada && ultimaParada && (
                    <div className="text-xs p-2 rounded bg-orange-500/10 border border-orange-500/40">
                      <div className="font-semibold text-orange-200">Parado · {ultimaParada.motivo}</div>
                      <div className="text-muted-foreground">desde {new Date(ultimaParada.inicio).toLocaleTimeString("pt-BR")}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
                  Sem alocação hoje
                </div>
              )}

              {/* Próximos da fila */}
              <div className="border-t border-border pt-2">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Próximos ({slot.fila.length})</div>
                {slot.fila.slice(0, 3).map((f) => (
                  <div key={f.agrup.id} className="text-xs font-mono truncate">
                    {f.agrup.nome} <span className="text-muted-foreground">· {fmtMin(f.agrup.tempoEstMin)}</span>
                  </div>
                ))}
                {slot.fila.length === 0 && <div className="text-[11px] text-muted-foreground">Fila vazia</div>}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="text-center text-[11px] text-muted-foreground pt-2 border-t border-border">
        Painel Andon · atualização automática · <a href="/login" className="text-primary hover:underline">Sair para login</a>
      </footer>
    </div>
  );
}

function TotalCard({ label, value, tone }: { label: string; value: string; tone: "ok" | "run" | "warn" | "idle" }) {
  const cls = tone === "ok" ? "text-primary"
    : tone === "run" ? "text-yellow-300"
    : tone === "warn" ? "text-orange-300 pulse-orange"
    : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className={`text-3xl font-extrabold font-mono ${cls}`}>{value}</div>
    </div>
  );
}
