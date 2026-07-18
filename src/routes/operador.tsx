import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { findUser } from "@/lib/auth";
import { RequireAuth } from "@/components/app/RequireAuth";
import { StatusBadge } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtDateTime, todayISO } from "@/lib/formatters";
import type { Agrupamento, Maquina, Solicitacao, Validacao } from "@/lib/types";
import { FileText, Play, StopCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/operador")({
  component: () => (
    <RequireAuth perfis={["operador"]}>
      <OperadorPage />
    </RequireAuth>
  ),
});

const MAQUINAS: Maquina[] = ["CNC-3", "Messer"];

function OperadorPage() {
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const solicitacoes = useStore((s) => s.solicitacoes);
  const iniciarCorte = useStore((s) => s.iniciarCorte);
  const finalizarCorte = useStore((s) => s.finalizarCorte);

  const [maquina, setMaquina] = useState<Maquina>("CNC-3");
  const [openValid, setOpenValid] = useState<{ solic: Solicitacao; agrup: Agrupamento } | null>(null);
  const [openFinalizar, setOpenFinalizar] = useState<{ solic: Solicitacao; agrup: Agrupamento } | null>(null);
  const [obsFim, setObsFim] = useState("");

  const hoje = todayISO();

  const cards = useMemo(() => {
    const out: { solic: Solicitacao; agrup: Agrupamento }[] = [];
    for (const s of solicitacoes) {
      for (const a of s.agrupamentos) {
        if (a.maquina === maquina && a.diaAlocado === hoje) {
          out.push({ solic: s, agrup: a });
        }
      }
    }
    return out.sort((a, b) => {
      const order = { "Alocado": 0, "Em Corte": 1, "Cortado": 2, "Aguardando": 3 } as const;
      return (order[a.agrup.statusCorte] ?? 9) - (order[b.agrup.statusCorte] ?? 9);
    });
  }, [solicitacoes, maquina, hoje]);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1800px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Operação · Chão de fábrica</h1>
          <p className="text-sm text-muted-foreground">Turno de hoje — {new Date().toLocaleDateString("pt-BR")} · Operador: <b>{user.nome}</b></p>
        </div>
        <div>
          <Label className="text-xs">Máquina ativa</Label>
          <Select value={maquina} onValueChange={(v) => setMaquina(v as Maquina)}>
            <SelectTrigger className="w-52 h-12 text-lg font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MAQUINAS.map((m) => <SelectItem key={m} value={m} className="text-lg">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.length === 0 && (
          <Card className="p-10 text-center col-span-full text-muted-foreground">
            Nenhum agrupamento alocado hoje para {maquina}.
          </Card>
        )}
        {cards.map(({ solic, agrup }) => {
          const cut = agrup.statusCorte === "Cortado";
          const cutting = agrup.statusCorte === "Em Corte";
          return (
            <Card key={agrup.id} className={`p-4 space-y-3 ${cut ? "bg-primary/10 border-primary/50" : cutting ? "bg-yellow-500/10 border-yellow-500/50" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-extrabold font-mono">{agrup.nome}</div>
                  <div className="text-xs text-muted-foreground">{solic.id} · {solic.titulo}</div>
                </div>
                <StatusBadge status={agrup.statusCorte} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Info label="Material" value={agrup.material ?? "—"} />
                <Info label="RIR" value={agrup.rir ?? "—"} />
                <Info label="Esp." value={agrup.espessura ? `${agrup.espessura} mm` : "—"} />
                <Info label="Comp." value={agrup.comprimento ? `${agrup.comprimento} mm` : "—"} />
                <Info label="Larg." value={agrup.largura ? `${agrup.largura} mm` : "—"} />
                <Info label="Peso" value={agrup.peso ? `${agrup.peso} kg` : "—"} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => agrup.pdfUrl ? window.open(agrup.pdfUrl) : toast.info(`PDF: ${agrup.pdfNome ?? agrup.nome + '.pdf'}`)}>
                  <FileText className="h-4 w-4 mr-1" />Abrir PDF
                </Button>
              </div>
              {!cut && !cutting && (
                <Button size="lg" className="w-full h-16 text-xl font-bold" onClick={() => setOpenValid({ solic, agrup })}>
                  <Play className="h-6 w-6 mr-2" />INÍCIO DO CORTE
                </Button>
              )}
              {cutting && (
                <Button size="lg" className="w-full h-16 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => { setObsFim(""); setOpenFinalizar({ solic, agrup }); }}>
                  <StopCircle className="h-6 w-6 mr-2" />CORTE FINALIZADO
                </Button>
              )}
              {cut && (
                <div className="text-xs text-muted-foreground text-center">
                  Iniciado {fmtDateTime(agrup.inicioCorte)}<br />
                  Finalizado {fmtDateTime(agrup.fimCorte)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <ValidacaoDialog
        item={openValid}
        onClose={() => setOpenValid(null)}
        operador={user.nome}
        onConfirm={(v) => {
          if (openValid) {
            iniciarCorte(openValid.solic.id, openValid.agrup.id, user.nome, v);
            toast.success("Corte iniciado");
            setOpenValid(null);
          }
        }}
      />

      <Dialog open={!!openFinalizar} onOpenChange={(b) => !b && setOpenFinalizar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalizar corte · {openFinalizar?.agrup.nome}</DialogTitle></DialogHeader>
          <Label>Observações da operação</Label>
          <Textarea rows={4} value={obsFim} onChange={(e) => setObsFim(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenFinalizar(null)}>Voltar</Button>
            <Button onClick={() => {
              if (openFinalizar) {
                finalizarCorte(openFinalizar.solic.id, openFinalizar.agrup.id, user.nome, obsFim);
                toast.success("Corte finalizado");
                setOpenFinalizar(null);
              }
            }}>Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ValidacaoDialog({
  item, onClose, operador, onConfirm,
}: {
  item: { solic: Solicitacao; agrup: Agrupamento } | null;
  onClose: () => void;
  operador: string;
  onConfirm: (v: Validacao) => void;
}) {
  const [mat, setMat] = useState(false);
  const [rir, setRir] = useState(false);
  const [esp, setEsp] = useState(false);
  const [comp, setComp] = useState("");
  const [larg, setLarg] = useState("");
  const [alerta, setAlerta] = useState(false);

  if (!item) return null;
  const compN = Number(comp);
  const largN = Number(larg);
  const okCheck = mat && rir && esp && comp !== "" && larg !== "";
  const divergComp = item.agrup.comprimento ? Math.abs(compN - item.agrup.comprimento) : 0;
  const divergLarg = item.agrup.largura ? Math.abs(largN - item.agrup.largura) : 0;
  const grandeDiverg = divergComp > 50 || divergLarg > 50;

  function tentarIniciar() {
    if (!okCheck) { toast.error("Preencha todas as validações"); return; }
    if (grandeDiverg) { setAlerta(true); return; }
    onConfirm({ matOk: mat, rirOk: rir, espOk: esp, compDigitado: compN, largDigitado: largN, divergenciaAceita: false });
    reset();
  }
  function confirmarComRisco() {
    onConfirm({ matOk: mat, rirOk: rir, espOk: esp, compDigitado: compN, largDigitado: largN, divergenciaAceita: true });
    setAlerta(false); reset();
  }
  function reset() {
    setMat(false); setRir(false); setEsp(false); setComp(""); setLarg("");
  }

  return (
    <>
      <Dialog open={!!item} onOpenChange={(b) => { if (!b) { onClose(); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-mono">{item.agrup.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Operador: <b>{operador}</b></div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded bg-secondary text-lg cursor-pointer">
                <Checkbox className="h-6 w-6" checked={mat} onCheckedChange={(v) => setMat(!!v)} /> Material correto ({item.agrup.material ?? "—"})
              </label>
              <label className="flex items-center gap-3 p-3 rounded bg-secondary text-lg cursor-pointer">
                <Checkbox className="h-6 w-6" checked={rir} onCheckedChange={(v) => setRir(!!v)} /> RIR correto ({item.agrup.rir ?? "—"})
              </label>
              <label className="flex items-center gap-3 p-3 rounded bg-secondary text-lg cursor-pointer">
                <Checkbox className="h-6 w-6" checked={esp} onCheckedChange={(v) => setEsp(!!v)} /> Espessura correta ({item.agrup.espessura ?? "—"} mm)
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Comprimento (mm) <span className="text-muted-foreground">· real {item.agrup.comprimento ?? "—"}</span></Label>
                <Input type="number" className="h-12 text-lg font-mono" value={comp} onChange={(e) => setComp(e.target.value)} />
              </div>
              <div>
                <Label>Largura (mm) <span className="text-muted-foreground">· real {item.agrup.largura ?? "—"}</span></Label>
                <Input type="number" className="h-12 text-lg font-mono" value={larg} onChange={(e) => setLarg(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancelar</Button>
            <Button className="h-12 text-lg" onClick={tentarIniciar}>Iniciar corte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alerta} onOpenChange={setAlerta}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert /> Divergência grande detectada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Divergência acima de 50 mm nas medidas digitadas:
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-mono">
                <div>Comp.: real {item.agrup.comprimento ?? "—"} vs digitado {compN} ({divergComp.toFixed(0)} mm)</div>
                <div>Larg.: real {item.agrup.largura ?? "—"} vs digitado {largN} ({divergLarg.toFixed(0)} mm)</div>
              </div>
              <div className="mt-3 font-bold text-foreground">Deseja prosseguir com o início do corte mesmo assim?</div>
              <div className="text-xs mt-1">O desvio ficará registrado para auditoria.</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, revisar medidas</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarComRisco} className="bg-destructive text-destructive-foreground">
              Sim, prosseguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-1.5 rounded bg-background/60">
      <div className="text-[9px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}
