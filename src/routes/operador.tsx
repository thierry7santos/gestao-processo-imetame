import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { findUser, maquinasDoUsuario } from "@/lib/auth";
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
import type { Agrupamento, Maquina, Solicitacao, StatusCorte, Validacao } from "@/lib/types";
import { FileText, Play, StopCircle, ShieldAlert, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import {
  iniciarCorte as svcIniciarCorte,
  finalizarCorte as svcFinalizarCorte,
  paralisarCorte as svcParalisarCorte,
  retomarCorte as svcRetomarCorte,
  MOTIVOS_PARADA,
} from "@/services/dataService";

export const Route = createFileRoute("/operador")({
  component: () => (
    <RequireAuth perfis={["operador"]}>
      <OperadorPage />
    </RequireAuth>
  ),
});

// MAQUINAS agora vem do tipo do usuário (Chapa/Perfil/Tubo).

const ORDER_STATUS: Record<StatusCorte, number> = {
  "Alocado": 0,
  "Em Corte": 1,
  "Corte Paralisado": 2,
  "Cortado": 3,
  "Aguardando": 4,
};

function OperadorPage() {
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const solicitacoes = useStore((s) => s.solicitacoes);

  const maquinasArea = useMemo(() => maquinasDoUsuario(user), [user]);
  const tipoUsuario = user.tipo ?? "Chapa";
  const [maquina, setMaquina] = useState<Maquina>(maquinasArea[0]);
  const [openValid, setOpenValid] = useState<{ solic: Solicitacao; agrup: Agrupamento } | null>(null);
  const [openFinalizar, setOpenFinalizar] = useState<{ solic: Solicitacao; agrup: Agrupamento } | null>(null);
  const [openParar, setOpenParar] = useState<{ solic: Solicitacao; agrup: Agrupamento } | null>(null);
  const [motivoParar, setMotivoParar] = useState<string>(MOTIVOS_PARADA[0]);
  const [motivoOutro, setMotivoOutro] = useState("");
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
    return out.sort((a, b) => (ORDER_STATUS[a.agrup.statusCorte] ?? 9) - (ORDER_STATUS[b.agrup.statusCorte] ?? 9));
  }, [solicitacoes, maquina, hoje]);

  function confirmarParada() {
    if (!openParar) return;
    const motivo = motivoParar === "Outro" ? motivoOutro.trim() : motivoParar;
    if (!motivo) { toast.error("Informe o motivo da parada"); return; }
    svcParalisarCorte(openParar.solic.id, openParar.agrup.id, user.nome, motivo);
    toast("Corte paralisado — cronômetro de ociosidade rodando");
    setOpenParar(null); setMotivoOutro(""); setMotivoParar(MOTIVOS_PARADA[0]);
  }

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
          const paused = agrup.statusCorte === "Corte Paralisado";
          const ultParada = agrup.paradas?.[agrup.paradas.length - 1];
          const cardCls = cut
            ? "bg-primary/10 border-primary/50"
            : cutting
            ? "bg-yellow-500/10 border-yellow-500/50"
            : paused
            ? "bg-orange-500/10 border-orange-500/60 pulse-orange"
            : "";
          return (
            <Card key={agrup.id} className={`p-4 space-y-3 ${cardCls}`}>
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

              {paused && ultParada && (
                <div className="text-[11px] p-2 rounded border border-orange-500/50 bg-orange-500/10">
                  <div className="font-semibold text-orange-200">Parado desde {fmtDateTime(ultParada.inicio)}</div>
                  <div className="text-muted-foreground">Motivo: <b className="text-orange-200">{ultParada.motivo}</b></div>
                </div>
              )}

              {!cut && !cutting && !paused && (
                <Button size="lg" className="w-full h-16 text-xl font-bold" onClick={() => setOpenValid({ solic, agrup })}>
                  <Play className="h-6 w-6 mr-2" />INÍCIO DO CORTE
                </Button>
              )}

              {cutting && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="lg"
                    className="h-16 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-black"
                    onClick={() => { setMotivoParar(MOTIVOS_PARADA[0]); setMotivoOutro(""); setOpenParar({ solic, agrup }); }}
                  >
                    <PauseCircle className="h-6 w-6 mr-2" />PARALISAR
                  </Button>
                  <Button
                    size="lg"
                    className="h-16 text-lg font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => { setObsFim(""); setOpenFinalizar({ solic, agrup }); }}
                  >
                    <StopCircle className="h-6 w-6 mr-2" />FINALIZAR
                  </Button>
                </div>
              )}

              {paused && (
                <Button
                  size="lg"
                  className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => { svcRetomarCorte(solic.id, agrup.id, user.nome); toast.success("Corte retomado"); }}
                >
                  <PlayCircle className="h-6 w-6 mr-2" />RETOMAR CORTE
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
            svcIniciarCorte(openValid.solic.id, openValid.agrup.id, user.nome, v);
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
                svcFinalizarCorte(openFinalizar.solic.id, openFinalizar.agrup.id, user.nome, obsFim);
                toast.success("Corte finalizado");
                setOpenFinalizar(null);
              }
            }}>Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openParar} onOpenChange={(b) => !b && setOpenParar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-300 flex items-center gap-2">
              <PauseCircle /> Paralisar corte · {openParar?.agrup.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Motivo da parada *</Label>
              <Select value={motivoParar} onValueChange={setMotivoParar}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_PARADA.map((m) => (
                    <SelectItem key={m} value={m} className="text-base">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {motivoParar === "Outro" && (
              <div>
                <Label>Descrever motivo *</Label>
                <Input className="h-12 text-base" value={motivoOutro} onChange={(e) => setMotivoOutro(e.target.value)} />
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              O horário exato é registrado. O tempo ocioso será somado no dashboard e no calendário do encarregado até você clicar em Retomar.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenParar(null)}>Cancelar</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-black" onClick={confirmarParada}>
              Confirmar parada
            </Button>
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
