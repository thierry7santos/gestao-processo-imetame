import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { findUser } from "@/lib/auth";
import { RequireAuth } from "@/components/app/RequireAuth";
import { StatusBadge } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select as FSelect, SelectContent as FSelectContent, SelectItem as FSelectItem,
  SelectTrigger as FSelectTrigger, SelectValue as FSelectValue,
} from "@/components/ui/select";
import { fmtDate, fmtDateTime, fmtMin, todayISO } from "@/lib/formatters";
import type { Solicitacao, StatusSolicitacao, TipoPlano } from "@/lib/types";
import { AlertTriangle, FileText, Pencil, Plus, RotateCcw, History, Filter, Send } from "lucide-react";
import { toast } from "sonner";
import { liberarSolicitacao } from "@/services/dataService";
import { DesafioButton } from "@/components/app/DesafioButton";

export const Route = createFileRoute("/planejador")({
  component: () => (
    <RequireAuth perfis={["planejador"]}>
      <PlanejadorPage />
    </RequireAuth>
  ),
});

function PlanejadorPage() {
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const solicitacoes = useStore((s) => s.solicitacoes);
  const addSolicitacao = useStore((s) => s.addSolicitacao);
  const editSolicitacao = useStore((s) => s.editSolicitacao);
  const revisarSolicitacao = useStore((s) => s.revisarSolicitacao);

  const [openNova, setOpenNova] = useState(false);
  const [openDetalhe, setOpenDetalhe] = useState<Solicitacao | null>(null);
  const [openEditar, setOpenEditar] = useState<Solicitacao | null>(null);
  const [openHistorico, setOpenHistorico] = useState<Solicitacao | null>(null);

  const [fId, setFId] = useState("");
  const [fOs, setFOs] = useState("");
  const [fTipo, setFTipo] = useState<string>("todos");
  const [fStatus, setFStatus] = useState<string>("todos");

  const ordenadas = useMemo(() => {
    const q = fId.trim().toLowerCase();
    const qOs = fOs.trim().toLowerCase();
    return [...solicitacoes]
      .filter((s) => {
        if (q && !s.id.toLowerCase().includes(q)) return false;
        if (qOs && !s.os.toLowerCase().includes(qOs)) return false;
        if (fTipo !== "todos" && s.tipo !== fTipo) return false;
        if (fStatus !== "todos" && s.status !== fStatus) return false;
        return true;
      })
      .sort((a, b) => a.dataNecessidade.localeCompare(b.dataNecessidade));
  }, [solicitacoes, fId, fOs, fTipo, fStatus]);

  const STATUS_OPS: (StatusSolicitacao | "todos")[] = ["todos","Em Fila","Em Processo","Paralisado","Concluído","A Revisar","Em Revisão","Revisado","Cancelado"];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Planejamento</h1>
          <p className="text-sm text-muted-foreground">
            Solicite planos de corte e acompanhe o status até a conclusão.
          </p>
        </div>
        <Button onClick={() => setOpenNova(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova solicitação
        </Button>
      </header>

      <Card className="p-3 border-primary/30">
        <div className="flex items-center gap-2 text-xs uppercase text-primary font-semibold mb-2">
          <Filter className="h-3 w-3" /> Filtros da fila
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">ID da Solicitação</Label>
            <Input placeholder="#0001" className="h-9 font-mono" value={fId} onChange={(e) => setFId(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Número da OS</Label>
            <Input placeholder="0751.03.001" className="h-9 font-mono" value={fOs} onChange={(e) => setFOs(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tipo do Plano</Label>
            <FSelect value={fTipo} onValueChange={setFTipo}>
              <FSelectTrigger className="h-9"><FSelectValue /></FSelectTrigger>
              <FSelectContent>
                <FSelectItem value="todos">Todos</FSelectItem>
                <FSelectItem value="Chapa">Chapa</FSelectItem>
                <FSelectItem value="Perfil">Perfil</FSelectItem>
                <FSelectItem value="Tubulação">Tubulação</FSelectItem>
              </FSelectContent>
            </FSelect>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <FSelect value={fStatus} onValueChange={setFStatus}>
              <FSelectTrigger className="h-9"><FSelectValue /></FSelectTrigger>
              <FSelectContent>
                {STATUS_OPS.map((s) => (
                  <FSelectItem key={s} value={s}>{s === "todos" ? "Todos" : s}</FSelectItem>
                ))}
              </FSelectContent>
            </FSelect>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Necessidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Máquinas / dias</TableHead>
                <TableHead>Tempo est.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((s) => {
                const tempo = s.agrupamentos.reduce((acc, a) => acc + (a.tempoEstMin ?? 0), 0);
                const maquinas = Array.from(new Set(s.agrupamentos.map((a) => a.maquina).filter(Boolean))) as string[];
                const dias = Array.from(new Set(s.agrupamentos.map((a) => a.diaAlocado).filter(Boolean))) as string[];
                const emerg = s.emergencia;
                const revisao = ["A Revisar", "Em Revisão", "Revisado"].includes(s.status);
                return (
                  <TableRow key={s.id} className={emerg ? "bg-destructive/5" : revisao ? "bg-orange-500/5" : ""}>
                    <TableCell className="font-mono font-semibold">{s.id}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{s.planejadorCriador}</TableCell>
                    <TableCell className="font-mono text-xs">{s.os}</TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{s.titulo}</span>
                        {emerg && (
                          <Badge className="bg-destructive/20 text-destructive border border-destructive/50">
                            <AlertTriangle className="h-3 w-3 mr-1" />URG
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{s.tipo}</TableCell>
                    <TableCell>{fmtDate(s.dataNecessidade)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="font-mono text-xs">{s.numeroPlano ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {maquinas.length ? maquinas.join(", ") : "—"}
                      {dias.length ? <div className="text-muted-foreground">{dias.map(fmtDate).join(", ")}</div> : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fmtMin(tempo)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setOpenDetalhe(s)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpenHistorico(s)}>
                        <History className="h-4 w-4" />
                      </Button>
                      {s.status === "Concluído" && s.agrupamentos.some((a) => a.statusCorte === "Aguardando") && (
                        <Button
                          size="sm"
                          className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40 mr-1"
                          onClick={() => { liberarSolicitacao(s.id, user.nome); toast.success("Liberado para Materiais"); }}
                          title="Liberar chapas para o setor de Materiais"
                        >
                          <Send className="h-3 w-3 mr-1" /> Liberar Materiais
                        </Button>
                      )}
                      {["Em Fila", "Paralisado"].includes(s.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setOpenEditar(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {s.status === "Concluído" && (
                        <Button size="sm" variant="ghost" onClick={() => setOpenEditar(s)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {ordenadas.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhuma solicitação.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <NovaSolicitacaoDialog
        open={openNova}
        onOpenChange={setOpenNova}
        onSubmit={(data) => {
          addSolicitacao({ ...data, planejadorCriador: user.nome });
          toast.success("Solicitação criada");
        }}
      />

      <DetalheDialog solic={openDetalhe} onClose={() => setOpenDetalhe(null)} />
      <HistoricoDialog solic={openHistorico} onClose={() => setOpenHistorico(null)} />
      <EditarDialog
        solic={openEditar}
        onClose={() => setOpenEditar(null)}
        onSave={(id, desc) => {
          const s = solicitacoes.find((x) => x.id === id)!;
          if (s.status === "Concluído") {
            revisarSolicitacao(id, desc, user.nome);
            toast.success("Solicitação enviada para revisão");
          } else {
            editSolicitacao(id, { descricao: desc }, user.nome, "Editou descrição");
            toast.success("Solicitação atualizada");
          }
        }}
      />
    </div>
  );
}

function NovaSolicitacaoDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSubmit: (data: {
    os: string; titulo: string; tipo: TipoPlano; dataNecessidade: string;
    descricao: string; anexos: { nome: string }[]; emergencia: boolean;
    rirsPerfis?: string; rirsTubos?: string;
  }) => void;
}) {
  const [os, setOs] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoPlano>("Chapa");
  const [data, setData] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [rirsPerfis, setRirsPerfis] = useState("");
  const [rirsTubos, setRirsTubos] = useState("");
  const [emerg, setEmerg] = useState(false);
  const [arquivos, setArquivos] = useState<{ nome: string }[]>([]);

  const emergAtivavel = data === todayISO();

  function reset() {
    setOs(""); setTitulo(""); setTipo("Chapa"); setData(todayISO());
    setDesc(""); setRirsPerfis(""); setRirsTubos(""); setEmerg(false); setArquivos([]);
  }

  function submit() {
    if (!os.trim() || !titulo.trim()) { toast.error("Preencha OS e título"); return; }
    if (tipo === "Perfil" && !rirsPerfis.trim()) { toast.error("Informe os RIR's dos Perfis"); return; }
    if (tipo === "Tubulação" && !rirsTubos.trim()) { toast.error("Informe os RIR's dos Tubos"); return; }
    onSubmit({
      os: os.trim(), titulo: titulo.trim(), tipo,
      dataNecessidade: data, descricao: desc,
      anexos: arquivos, emergencia: emerg && emergAtivavel,
      rirsPerfis: tipo === "Perfil" ? rirsPerfis.trim() : undefined,
      rirsTubos: tipo === "Tubulação" ? rirsTubos.trim() : undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (!b) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova solicitação de plano</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Título da solicitação</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ordem de Serviço (OS)</Label>
            <Input value={os} onChange={(e) => setOs(e.target.value)} placeholder="0751.03.001" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo do plano</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoPlano)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Chapa">Chapa</SelectItem>
                <SelectItem value="Perfil">Perfil</SelectItem>
                <SelectItem value="Tubulação">Tubulação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data de necessidade</Label>
            <Input type="date" value={data} onChange={(e) => { setData(e.target.value); if (e.target.value !== todayISO()) setEmerg(false); }} />
          </div>
          <div className="space-y-1.5 flex flex-col justify-end">
            <Button
              type="button"
              variant={emerg ? "destructive" : "outline"}
              disabled={!emergAtivavel}
              onClick={() => setEmerg((v) => !v)}
              title={emergAtivavel ? "" : "Só disponível para necessidade hoje"}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              {emerg ? "Emergência ATIVA" : "Marcar Emergência"}
            </Button>
            {!emergAtivavel && <div className="text-[10px] text-muted-foreground">Ativa apenas se necessidade = hoje.</div>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Anexos (arquivos)</Label>
            <input
              type="file" multiple
              className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground"
              onChange={(e) => setArquivos(Array.from(e.target.files ?? []).map((f) => ({ nome: f.name })))}
            />
            {arquivos.length > 0 && (
              <div className="text-xs text-muted-foreground">{arquivos.length} arquivo(s): {arquivos.map((a) => a.nome).join(", ")}</div>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {tipo === "Perfil" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>RIR's dos Perfis <span className="text-destructive">*</span></Label>
              <Textarea
                rows={3}
                value={rirsPerfis}
                onChange={(e) => setRirsPerfis(e.target.value)}
                placeholder="Liste os RIR's dos perfis (obrigatório)"
              />
            </div>
          )}
          {tipo === "Tubulação" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>RIR's dos Tubos <span className="text-destructive">*</span></Label>
              <Textarea
                rows={3}
                value={rirsTubos}
                onChange={(e) => setRirsTubos(e.target.value)}
                placeholder="Liste os RIR's dos tubos (obrigatório)"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Criar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalheDialog({ solic, onClose }: { solic: Solicitacao | null; onClose: () => void }) {
  if (!solic) return null;
  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{solic.id}</span> · {solic.titulo}
            <StatusBadge status={solic.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <Info label="OS" value={<span className="font-mono">{solic.os}</span>} />
          <Info label="Tipo" value={solic.tipo} />
          <Info label="Necessidade" value={fmtDate(solic.dataNecessidade)} />
          <Info label="Plano geral" value={<span className="font-mono">{solic.numeroPlano ?? "—"}</span>} />
          <Info label="Programador" value={solic.programador ?? "—"} />
          <Info label="Tempo ocioso" value={fmtMin(solic.tempoOciosoMin)} />
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground font-semibold">Descrição</div>
          <div className="text-sm whitespace-pre-wrap">{solic.descricao || "—"}</div>
          {solic.descricaoRevisao && (
            <div className="mt-2 p-3 rounded-md border border-orange-500/50 bg-orange-500/10">
              <div className="text-xs uppercase text-orange-300 font-semibold mb-1">Descrição da revisão</div>
              <div className="text-sm whitespace-pre-wrap">{solic.descricaoRevisao}</div>
            </div>
          )}
        </div>
        {solic.agrupamentos.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Agrupamentos</div>
            <div className="grid gap-2">
              {solic.agrupamentos.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-secondary text-sm">
                  <span className="font-mono">{a.nome}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.statusCorte} />
                    {a.pdfNome && (
                      <Button size="sm" variant="outline" onClick={() => a.pdfUrl ? window.open(a.pdfUrl) : toast.info(`PDF: ${a.pdfNome}`)}>
                        <FileText className="h-3 w-3 mr-1" />PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditarDialog({
  solic, onClose, onSave,
}: {
  solic: Solicitacao | null;
  onClose: () => void;
  onSave: (id: string, desc: string) => void;
}) {
  const [desc, setDesc] = useState("");
  if (!solic) return null;
  const isRevisao = solic.status === "Concluído";
  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isRevisao ? "Solicitar revisão" : "Editar solicitação"} · {solic.id}
          </DialogTitle>
        </DialogHeader>
        {isRevisao && (
          <div className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/40 p-2 rounded">
            A descrição original será preservada. Sua nova descrição será gravada como <b>Descrição da Revisão</b> e o status vai para <b>A Revisar</b>.
          </div>
        )}
        <Textarea
          rows={6}
          defaultValue={isRevisao ? "" : solic.descricao}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={isRevisao ? "Descreva a alteração necessária..." : ""}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave(solic.id, desc || (isRevisao ? "" : solic.descricao)); onClose(); }}>
            {isRevisao ? "Enviar para revisão" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoDialog({ solic, onClose }: { solic: Solicitacao | null; onClose: () => void }) {
  if (!solic) return null;
  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Histórico · {solic.id}</DialogTitle></DialogHeader>
        <ol className="space-y-2 max-h-[60vh] overflow-y-auto">
          {solic.historico.map((h, i) => (
            <li key={i} className="p-2 rounded bg-secondary text-sm">
              <div className="font-semibold">{h.usuario}</div>
              <div className="text-[11px] text-muted-foreground">{fmtDateTime(h.dataHora)}</div>
              <div>{h.mudanca}</div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
