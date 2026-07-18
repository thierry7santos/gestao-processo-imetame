import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtMin, minutesBetween, startOfWeek, todayISO, addDays } from "@/lib/formatters";
import type { Maquina } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/kpis")({
  component: () => (
    <RequireAuth perfis={["planejador", "programador"]}>
      <KpisPage />
    </RequireAuth>
  ),
});

function KpisPage() {
  const solicitacoes = useStore((s) => s.solicitacoes);
  const [maquina, setMaquina] = useState<string>("todas");
  const [operador, setOperador] = useState<string>("todos");
  const [modo, setModo] = useState<"semana" | "mes">("semana");
  const [ref, setRef] = useState<string>(todayISO());

  const operadores = useMemo(() => {
    const set = new Set<string>();
    solicitacoes.forEach((s) => s.agrupamentos.forEach((a) => a.operador && set.add(a.operador)));
    return Array.from(set);
  }, [solicitacoes]);

  // Range
  const range = useMemo(() => {
    if (modo === "semana") {
      const start = startOfWeek(ref);
      return { start, end: addDays(start, 6), dias: 6 };
    }
    const d = new Date(ref + "T00:00:00");
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { start, end, dias: Number(end.slice(8, 10)) };
  }, [modo, ref]);

  const cortes = useMemo(() => {
    const out: {
      dia: string; agrup: string; maq: Maquina; operador?: string;
      estMin: number; realMin: number; peso: number;
    }[] = [];
    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        if (a.statusCorte !== "Cortado" || !a.inicioCorte || !a.fimCorte) continue;
        const dia = a.inicioCorte.slice(0, 10);
        if (dia < range.start || dia > range.end) continue;
        if (maquina !== "todas" && a.maquina !== maquina) continue;
        if (operador !== "todos" && a.operador !== operador) continue;
        out.push({
          dia, agrup: a.nome, maq: (a.maquina ?? "CNC-3") as Maquina, operador: a.operador,
          estMin: a.tempoEstMin ?? 0, realMin: minutesBetween(a.inicioCorte, a.fimCorte),
          peso: a.peso ?? 0,
        });
      }
    }
    return out;
  }, [solicitacoes, range, maquina, operador]);

  const porDia = useMemo(() => {
    const map = new Map<string, { dia: string; est: number; real: number; peso: number }>();
    for (let i = 0; i <= (range.dias); i++) {
      const iso = addDays(range.start, i);
      if (iso > range.end) break;
      map.set(iso, { dia: iso.slice(5), est: 0, real: 0, peso: 0 });
    }
    for (const c of cortes) {
      const key = c.dia;
      const row = map.get(key) ?? { dia: key.slice(5), est: 0, real: 0, peso: 0 };
      row.est += c.estMin; row.real += c.realMin; row.peso += c.peso;
      map.set(key, row);
    }
    return Array.from(map.values());
  }, [cortes, range]);

  const porOperador = useMemo(() => {
    const map = new Map<string, { operador: string; est: number; real: number; peso: number }>();
    for (const c of cortes) {
      const key = c.operador ?? "—";
      const row = map.get(key) ?? { operador: key, est: 0, real: 0, peso: 0 };
      row.est += c.estMin; row.real += c.realMin; row.peso += c.peso;
      map.set(key, row);
    }
    return Array.from(map.values()).map((r) => ({
      ...r, eficiencia: r.real > 0 ? Math.round((r.est / r.real) * 100) : 0,
    }));
  }, [cortes]);

  const porMaquina = useMemo(() => {
    const map = new Map<string, { maq: string; est: number; real: number; peso: number }>();
    for (const c of cortes) {
      const key = c.maq;
      const row = map.get(key) ?? { maq: key, est: 0, real: 0, peso: 0 };
      row.est += c.estMin; row.real += c.realMin; row.peso += c.peso;
      map.set(key, row);
    }
    return Array.from(map.values()).map((r) => ({
      ...r, eficiencia: r.real > 0 ? Math.round((r.est / r.real) * 100) : 0,
    }));
  }, [cortes]);

  // Métricas de programação
  const progStats = useMemo(() => {
    let planosPeriodo = 0, tempoTotalProg = 0, tempoOciosoTotal = 0, paralisados = 0;
    for (const s of solicitacoes) {
      if (s.inicioProg) {
        const dia = s.inicioProg.slice(0, 10);
        if (dia >= range.start && dia <= range.end) {
          planosPeriodo++;
          if (s.fimProg) tempoTotalProg += minutesBetween(s.inicioProg, s.fimProg);
        }
      }
      tempoOciosoTotal += s.tempoOciosoMin;
      if (s.status === "Paralisado") paralisados++;
    }
    return { planosPeriodo, tempoTotalProg, tempoOciosoTotal, paralisados };
  }, [solicitacoes, range]);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Central de KPIs</h1>
        <p className="text-sm text-muted-foreground">Programação e corte — período {range.start} até {range.end}.</p>
      </header>

      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Modo</Label>
            <Select value={modo} onValueChange={(v) => setModo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semanal (seg → sáb)</SelectItem>
                <SelectItem value="mes">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Referência</Label>
            <input type={modo === "semana" ? "week" : "month"}
              className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
              onChange={(e) => {
                if (modo === "semana") {
                  const [y, w] = e.target.value.split("-W");
                  if (!y || !w) return;
                  const jan4 = new Date(Number(y), 0, 4);
                  const ms = jan4.getTime() + (Number(w) - 1) * 7 * 86400000;
                  setRef(new Date(ms).toISOString().slice(0, 10));
                } else {
                  setRef(e.target.value + "-15");
                }
              }} />
          </div>
          <div>
            <Label className="text-xs">Máquina</Label>
            <Select value={maquina} onValueChange={setMaquina}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="CNC-3">CNC-3</SelectItem>
                <SelectItem value="Messer">Messer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Operador</Label>
            <Select value={operador} onValueChange={setOperador}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {operadores.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="corte">
        <TabsList>
          <TabsTrigger value="programacao">Programação</TabsTrigger>
          <TabsTrigger value="corte">Corte</TabsTrigger>
        </TabsList>

        <TabsContent value="programacao" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <KpiCard label="Planos no período" value={String(progStats.planosPeriodo)} />
            <KpiCard label="Tempo total de programação" value={fmtMin(progStats.tempoTotalProg)} />
            <KpiCard label="Tempo ocioso acumulado" value={fmtMin(progStats.tempoOciosoTotal)} />
            <KpiCard label="Planos paralisados" value={String(progStats.paralisados)} tone={progStats.paralisados > 0 ? "warn" : "ok"} />
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-2">Tempo estimado vs real por dia</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={porDia}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <Legend />
                  <Bar dataKey="est" name="Estimado (min)" fill="var(--chart-2)" />
                  <Bar dataKey="real" name="Real (min)" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="corte" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <KpiCard label="Agrupamentos cortados" value={String(cortes.length)} />
            <KpiCard label="Peso total de aço" value={`${cortes.reduce((a, c) => a + c.peso, 0).toLocaleString("pt-BR")} kg`} />
            <KpiCard label="Tempo real total" value={fmtMin(cortes.reduce((a, c) => a + c.realMin, 0))} />
            <KpiCard label="Estimado total" value={fmtMin(cortes.reduce((a, c) => a + c.estMin, 0))} />
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-bold mb-2">Estimado vs Real (min) — por dia</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={porDia}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <Legend />
                  <Bar dataKey="est" name="Estimado" fill="var(--chart-2)" />
                  <Bar dataKey="real" name="Real" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-2">Peso de aço cortado (kg) — por dia</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={porDia}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="peso" name="Peso" fill="var(--chart-3)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-2">Eficiência por operador (%)</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={porOperador} layout="vertical">
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="operador" stroke="var(--muted-foreground)" fontSize={12} width={140} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="eficiencia" name="Eficiência %">
                      {porOperador.map((r, i) => (
                        <Cell key={i} fill={r.eficiencia >= 100 ? "var(--primary)" : r.eficiencia >= 80 ? "var(--chart-3)" : "var(--destructive)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-bold mb-2">Eficiência por máquina</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {porMaquina.map((m) => (
                <div key={m.maq} className="p-3 rounded bg-secondary">
                  <div className="flex justify-between items-baseline">
                    <div className="font-bold">{m.maq}</div>
                    <div className={`font-mono text-2xl ${m.eficiencia >= 100 ? "text-primary" : m.eficiencia >= 80 ? "text-yellow-400" : "text-destructive"}`}>{m.eficiencia}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Estimado {fmtMin(m.est)} · Real {fmtMin(m.real)} · Peso {m.peso.toLocaleString("pt-BR")} kg
                  </div>
                  <div className="h-2 rounded bg-muted mt-2 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, m.eficiencia)}%` }} />
                  </div>
                </div>
              ))}
              {porMaquina.length === 0 && <div className="text-sm text-muted-foreground">Sem dados no período.</div>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className={`text-2xl font-bold font-mono ${tone === "warn" ? "text-yellow-400" : "text-primary"}`}>{value}</div>
    </Card>
  );
}
