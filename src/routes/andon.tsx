import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { todayISO, fmtMin } from "@/lib/formatters";
import type { Agrupamento, Maquina, Solicitacao } from "@/lib/types";
import { Factory, Sun, Moon, Activity, AlertTriangle, CheckCircle2, Clock, ArrowDown, History, ListChecks } from "lucide-react";

export const Route = createFileRoute("/andon")({
  component: AndonPage,
  head: () => ({
    meta: [
      { title: "Painel Andon · IME Corte CNC" },
      { name: "description", content: "Painel Andon em tempo real do chão de fábrica: estado das máquinas, progresso do corte e fila do dia." },
      { property: "og:title", content: "Painel Andon · IME Corte CNC" },
      { property: "og:description", content: "Estado das máquinas, progresso do corte e fila do dia em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const MAQUINAS: Maquina[] = ["CNC-3", "Messer", "Robô-01", "Robô-02", "Bodor-D"];

type Item = { solic: Solicitacao; agrup: Agrupamento };

function AndonPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const hoje = todayISO();
  const [agora, setAgora] = useState(Date.now());

  // Relógio / cronômetros (1s)
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Atualização automática dos dados (re-hidrata o store a cada 15s)
  const [syncAt, setSyncAt] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const p = (useStore as unknown as { persist?: { rehydrate: () => void } }).persist;
      p?.rehydrate();
      setSyncAt(Date.now());
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const hora = new Date(agora);
  const turno: "Dia" | "Noite" = hora.getHours() >= 7 && hora.getHours() < 18 ? "Dia" : "Noite";

  const dados = useMemo(() => {
    const map = new Map<Maquina, { anterior?: Item; atual?: Item; proximo?: Item; fila: Item[]; cortados: Item[] }>();
    for (const m of MAQUINAS) map.set(m, { fila: [], cortados: [] });
    const cortadosHoje: Item[] = [];
    const disponiveis: Item[] = [];

    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        // No Andon, só importam planos alocados a uma máquina no dia de hoje.
        if (!a.maquina || a.diaAlocado !== hoje) continue;
        const slot = map.get(a.maquina);
        if (!slot) continue;
        if (a.statusCorte === "Em Corte" || a.statusCorte === "Corte Paralisado") slot.atual = { solic: s, agrup: a };
        else if (a.statusCorte === "Alocado") {
          slot.fila.push({ solic: s, agrup: a });
          disponiveis.push({ solic: s, agrup: a });
        }
        else if (a.statusCorte === "Cortado") {
          slot.cortados.push({ solic: s, agrup: a });
          cortadosHoje.push({ solic: s, agrup: a });
        }
      }
    }

    for (const [, slot] of map) {
      slot.cortados.sort((x, y) => (y.agrup.fimCorte ?? "").localeCompare(x.agrup.fimCorte ?? ""));
      slot.anterior = slot.cortados[0];
      slot.fila.sort((x, y) => (x.agrup.nome ?? "").localeCompare(y.agrup.nome ?? ""));
      slot.proximo = slot.fila[0];
    }
    cortadosHoje.sort((x, y) => (y.agrup.fimCorte ?? "").localeCompare(x.agrup.fimCorte ?? ""));
    disponiveis.sort((x, y) => (x.agrup.nome ?? "").localeCompare(y.agrup.nome ?? ""));

    return { map, cortadosHoje, disponiveis };
  }, [solicitacoes, hoje]);

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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b-2 border-primary pb-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-3xl">Andon · Chão de Fábrica</h1>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Gestão de Processos CNC · Imetame</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <div className="text-right">
            <div className="font-mono text-2xl font-bold tabular-nums sm:text-4xl">{hora.toLocaleTimeString("pt-BR")}</div>
            <div className="text-[11px] text-muted-foreground">
              {hora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-lg font-bold ${turno === "Dia" ? "bg-yellow-400/20 text-yellow-200" : "bg-indigo-500/20 text-indigo-200"}`}>
            {turno === "Dia" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {turno}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TotalCard label="Cortados hoje" value={String(totais.cortados)} tone="ok" />
        <TotalCard label="Em andamento" value={String(totais.emAndamento)} tone="run" />
        <TotalCard label="Paralisados" value={String(totais.paralisados)} tone={totais.paralisados > 0 ? "warn" : "idle"} />
        <TotalCard label="Peso acumulado" value={`${totais.peso.toLocaleString("pt-BR")} kg`} tone="ok" />
      </div>

      {/* Grade tipo "caça-níquel": anterior / atual / próximo */}
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {MAQUINAS.map((m) => {
          const slot = dados.map.get(m)!;
          return <MaquinaCard key={m} maquina={m} slot={slot} agora={agora} />;
        })}
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ListaCard
          titulo="Histórico · cortados hoje"
          icon={<History className="h-4 w-4" />}
          itens={dados.cortadosHoje}
          vazio="Nenhum plano cortado hoje"
          render={(i) => (
            <PlanoLinha i={i} extra={i.agrup.fimCorte ? new Date(i.agrup.fimCorte).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"} />
          )}
        />
        <ListaCard
          titulo="Disponíveis para corte"
          icon={<ListChecks className="h-4 w-4" />}
          itens={dados.disponiveis}
          vazio="Nenhum plano alocado ao dia no momento"
          render={(i) => (
            <PlanoLinha i={i} extra={fmtMin(i.agrup.tempoEstMin)} />
          )}
        />
      </div>

      <footer className="border-t border-border pt-2 text-center text-[11px] text-muted-foreground">
        Atualização automática a cada 15s · última sincronização {new Date(syncAt).toLocaleTimeString("pt-BR")} ·{" "}
        <a href="/login" className="text-primary hover:underline">Sair para login</a>
      </footer>
    </div>
  );
}

function MaquinaCard({ maquina, slot, agora }: {
  maquina: Maquina;
  slot: { anterior?: Item; atual?: Item; proximo?: Item; fila: Item[]; cortados: Item[] };
  agora: number;
}) {
  const atual = slot.atual;
  const cortando = atual?.agrup.statusCorte === "Em Corte";
  const parada = atual?.agrup.statusCorte === "Corte Paralisado";
  const ultimaParada = atual?.agrup.paradas?.[atual.agrup.paradas.length - 1];

  const decorridoMin = atual?.agrup.inicioCorte
    ? Math.max(0, Math.floor((agora - new Date(atual.agrup.inicioCorte).getTime()) / 60000))
    : 0;
  const est = atual?.agrup.tempoEstMin ?? 0;
  const pct = est > 0 ? (decorridoMin / est) * 100 : 0;
  const excedeu = pct > 100;

  const cls = cortando
    ? "bg-primary/10 border-primary border-pulse-green"
    : parada
    ? "bg-orange-500/10 border-orange-500 pulse-orange"
    : "bg-secondary/30 border-border";

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border-2 ${cls}`}>
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div className="font-mono text-lg font-extrabold">{maquina}</div>
        {cortando ? (
          <span className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            <Activity className="h-3 w-3" /> CORTANDO
          </span>
        ) : parada ? (
          <span className="flex items-center gap-1 rounded bg-orange-500 px-2 py-0.5 text-xs font-extrabold text-black">
            <AlertTriangle className="h-3 w-3" /> PARADA
          </span>
        ) : (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">OCIOSA</span>
        )}
      </div>

      {/* 1 · Anterior */}
      <Slot label="Anterior" icon={<CheckCircle2 className="h-3 w-3" />} tone="past">
        {slot.anterior ? (
          <>
            <div className="truncate font-mono text-sm font-bold">{slot.anterior.agrup.nome}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {slot.anterior.solic.os} · concluído{" "}
              {slot.anterior.agrup.fimCorte ? new Date(slot.anterior.agrup.fimCorte).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">Sem corte anterior hoje</div>
        )}
      </Slot>

      {/* 2 · Atual */}
      <Slot label="Atual" icon={<Activity className="h-3 w-3" />} tone={cortando ? "live" : parada ? "stop" : "idle"} grow>
        {atual ? (
          <>
            <div className="truncate font-mono text-base font-extrabold">{atual.agrup.nome}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {atual.solic.os} · {atual.agrup.operador ?? "—"}
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              {atual.agrup.material ?? "—"} · {atual.agrup.espessura != null ? `${atual.agrup.espessura}mm` : "—"}
              {atual.agrup.peso != null ? ` · ${atual.agrup.peso}kg` : ""}
            </div>
            <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
              <span className={`text-2xl font-extrabold ${excedeu ? "text-red-400" : "text-primary"}`}>
                {String(Math.floor(decorridoMin / 60)).padStart(2, "0")}:{String(decorridoMin % 60).padStart(2, "0")}
              </span>
              <span className="text-[11px] text-muted-foreground">plano {fmtMin(est)}</span>
            </div>
            <Progresso pct={pct} excedeu={excedeu} desconhecido={est <= 0} />
            {parada && ultimaParada && (
              <div className="mt-1 rounded border border-orange-500/40 bg-orange-500/10 p-1.5 text-[11px]">
                <div className="font-semibold text-orange-200">Parado · {ultimaParada.motivo}</div>
                <div className="text-muted-foreground">desde {new Date(ultimaParada.inicio).toLocaleTimeString("pt-BR")}</div>
              </div>
            )}
          </>
        ) : (
          <div className="grid flex-1 place-items-center py-3 text-sm text-muted-foreground">Ociosa</div>
        )}
      </Slot>

      {/* 3 · Próximo */}
      <Slot label={`Próximo (fila ${slot.fila.length})`} icon={<ArrowDown className="h-3 w-3" />} tone="next">
        {slot.proximo ? (
          <>
            <div className="truncate font-mono text-sm font-bold">{slot.proximo.agrup.nome}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {slot.proximo.solic.os} · <Clock className="inline h-3 w-3" /> {fmtMin(slot.proximo.agrup.tempoEstMin)}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">Fila vazia</div>
        )}
      </Slot>
    </div>
  );
}

function Progresso({ pct, excedeu, desconhecido }: { pct: number; excedeu: boolean; desconhecido: boolean }) {
  if (desconhecido) {
    return <div className="mt-1 text-[11px] text-muted-foreground">Sem tempo de plano</div>;
  }
  const largura = Math.min(100, Math.max(2, pct));
  return (
    <div className="mt-1">
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${excedeu ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${largura}%` }}
        />
      </div>
      <div className={`mt-0.5 text-right font-mono text-xs font-bold ${excedeu ? "text-red-400" : "text-primary"}`}>
        {Math.round(pct)}%{excedeu && " · acima do plano"}
      </div>
    </div>
  );
}

function Slot({ label, icon, tone, grow, children }: {
  label: string;
  icon: React.ReactNode;
  tone: "past" | "live" | "stop" | "idle" | "next";
  grow?: boolean;
  children: React.ReactNode;
}) {
  const bg = tone === "live" ? "bg-primary/10"
    : tone === "stop" ? "bg-orange-500/10"
    : tone === "past" ? "bg-background/40"
    : tone === "next" ? "bg-background/20"
    : "bg-background/30";
  return (
    <div className={`flex flex-col gap-0.5 border-b border-dashed border-border/60 px-3 py-2 last:border-b-0 ${bg} ${grow ? "flex-1" : ""}`}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function ListaCard({ titulo, icon, itens, vazio, render }: {
  titulo: string;
  icon: React.ReactNode;
  itens: Item[];
  vazio: string;
  render: (i: Item) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {titulo} <span className="ml-auto font-mono text-foreground">{itens.length}</span>
      </div>
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {itens.length === 0 && <div className="text-xs text-muted-foreground">{vazio}</div>}
        {itens.map((i) => (
          <div key={`${i.solic.id}-${i.agrup.id}`} className="rounded bg-background/40 px-2 py-1.5 text-xs">
            {render(i)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Linha de plano com informações técnicas completas (usada nas listas do Andon). */
function PlanoLinha({ i, extra }: { i: Item; extra?: React.ReactNode }) {
  const a = i.agrup;
  const dim = a.comprimento || a.largura ? `${a.comprimento ?? "—"}×${a.largura ?? "—"}` : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-mono font-bold text-primary">{a.nome ?? "—"}</span>
        <span className="font-mono text-muted-foreground">{i.solic.os}</span>
        <TipoBadge tipo={i.solic.tipo} />
        {a.maquina && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{a.maquina}</span>}
        {a.turno && <span className="text-[10px] uppercase text-muted-foreground">{a.turno}</span>}
        {extra != null && <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">{extra}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>Mat: {a.material ?? "—"}</span>
        <span>· Esp: {a.espessura != null ? `${a.espessura}mm` : "—"}</span>
        {dim && <span>· {dim}mm</span>}
        <span>· Qtd: {a.qtdItens ?? "—"}</span>
        <span>· Peso: {a.peso != null ? `${a.peso}kg` : "—"}</span>
        <span>· RIR: {a.rir ?? "—"}</span>
        <span>· Op: {a.operador ?? "—"}</span>
        {a.tempoEstMin != null && <span>· Plano: {fmtMin(a.tempoEstMin)}</span>}
      </div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const cls = tipo === "Chapa" ? "bg-primary/20 text-primary"
    : tipo === "Perfil" ? "bg-indigo-500/20 text-indigo-300"
    : "bg-amber-500/20 text-amber-300";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{tipo}</span>;
}

function TotalCard({ label, value, tone }: { label: string; value: string; tone: "ok" | "run" | "warn" | "idle" }) {
  const cls = tone === "ok" ? "text-primary"
    : tone === "run" ? "text-yellow-300"
    : tone === "warn" ? "text-orange-300 pulse-orange"
    : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`font-mono text-2xl font-extrabold sm:text-3xl ${cls}`}>{value}</div>
    </div>
  );
}
