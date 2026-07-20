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
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtDateTime, fmtMin, minutesBetween } from "@/lib/formatters";
import type { Solicitacao, StatusSolicitacao } from "@/lib/types";
import { AlertTriangle, FileUp, Play, PauseCircle, CheckCircle2, XCircle, FileText, Save, Settings2, Filter } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/programador")({
  component: () => (
    <RequireAuth perfis={["programador"]}>
      <ProgramadorPage />
    </RequireAuth>
  ),
});

const ORDEM_PRIORIDADE: Record<string, number> = {
  "A Revisar": 0, "Em Revisão": 1, "Em Processo": 2, "Paralisado": 3,
  "Em Fila": 4, "Revisado": 5, "Concluído": 6, "Cancelado": 7,
};

function ProgramadorPage() {
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const solicitacoes = useStore((s) => s.solicitacoes);
  const iniciarPlano = useStore((s) => s.iniciarPlano);
  const setStatus = useStore((s) => s.setStatus);

  const [filtroStatus, setFiltroStatus] = useState<string>("ativos");
  const [fId, setFId] = useState("");
  const [fOs, setFOs] = useState("");
  const [fTipo, setFTipo] = useState<string>("todos");
  const [open, setOpen] = useState<Solicitacao | null>(null);

  const filtradas = useMemo(() => {
    let arr = solicitacoes.filter((s) => {
      if (filtroStatus === "ativos") return !["Concluído", "Cancelado"].includes(s.status);
      if (filtroStatus === "todos") return true;
      return s.status === filtroStatus;
    });
    if (fTipo !== "todos") arr = arr.filter((s) => s.tipo === fTipo);
    if (fId) {
      const q = fId.toLowerCase();
      arr = arr.filter((s) => s.id.toLowerCase().includes(q) || (s.numeroPlano ?? "").toLowerCase().includes(q));
    }
    if (fOs) {
      const q = fOs.toLowerCase();
      arr = arr.filter((s) => s.os.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => {
      if (a.emergencia !== b.emergencia) return a.emergencia ? -1 : 1;
      const pa = ORDEM_PRIORIDADE[a.status] ?? 99;
      const pb = ORDEM_PRIORIDADE[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return a.dataNecessidade.localeCompare(b.dataNecessidade);
    });
  }, [solicitacoes, filtroStatus, fId, fOs, fTipo]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Programação</h1>
          <p className="text-sm text-muted-foreground">
            Assuma solicitações, importe PDFs e metadados, e conclua planos.
          </p>
        </div>
      </header>

      <Card className="p-3 border-primary/30">
        <div className="flex items-center gap-2 text-xs uppercase text-primary font-semibold mb-2">
          <Filter className="h-3 w-3" /> Filtros da fila
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">ID / Nº Plano</Label>
            <Input placeholder="#0001 · 1250C" className="h-9 font-mono" value={fId} onChange={(e) => setFId(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Número da OS</Label>
            <Input placeholder="0751.03.001" className="h-9 font-mono" value={fOs} onChange={(e) => setFOs(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tipo do Plano</Label>
            <Select value={fTipo} onValueChange={setFTipo}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Chapa">Chapa</SelectItem>
                <SelectItem value="Perfil">Perfil</SelectItem>
                <SelectItem value="Tubulação">Tubulação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos (padrão)</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Em Fila">Em Fila</SelectItem>
                <SelectItem value="Em Processo">Em Processo</SelectItem>
                <SelectItem value="Paralisado">Paralisado</SelectItem>
                <SelectItem value="A Revisar">A Revisar</SelectItem>
                <SelectItem value="Em Revisão">Em Revisão</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Necessidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Tempo prog.</TableHead>
                <TableHead>Ocioso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((s) => {
                const emerg = s.emergencia;
                const revisao = ["A Revisar", "Em Revisão"].includes(s.status);
                const tempoProg = s.inicioProg && s.fimProg ? minutesBetween(s.inicioProg, s.fimProg) : (s.inicioProg ? minutesBetween(s.inicioProg, new Date().toISOString()) : 0);
                return (
                  <TableRow key={s.id}
                    className={emerg ? "bg-destructive/5 pulse-red" : revisao ? "bg-orange-500/5" : ""}>
                    <TableCell className="font-mono">{s.id}</TableCell>
                    <TableCell className="font-mono text-xs">{s.os}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{s.titulo}</span>
                        {emerg && <Badge className="bg-destructive text-destructive-foreground"><AlertTriangle className="h-3 w-3 mr-1" />URG</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{fmtDate(s.dataNecessidade)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="font-mono text-xs">{s.numeroPlano ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtMin(tempoProg)}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtMin(s.tempoOciosoMin)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {s.status === "Em Fila" && (
                        <Button size="sm" onClick={() => { iniciarPlano(s.id, user.nome); toast.success("Plano iniciado"); }}>
                          <Play className="h-3 w-3 mr-1" /> Iniciar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setOpen(s)}>
                        <Settings2 className="h-3 w-3 mr-1" /> Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nada por aqui.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <DetalhesEngenharia solic={open} onClose={() => setOpen(null)} usuario={user.nome} />
    </div>
  );
}

function DetalhesEngenharia({
  solic, onClose, usuario,
}: { solic: Solicitacao | null; onClose: () => void; usuario: string }) {
  const addAgrupamentosDePDFs = useStore((s) => s.addAgrupamentosDePDFs);
  const aplicarMetadadosExcel = useStore((s) => s.aplicarMetadadosExcel);
  const salvarObs = useStore((s) => s.salvarObservacoesProg);
  const concluir = useStore((s) => s.concluirPlano);
  const setStatus = useStore((s) => s.setStatus);
  const solicAtual = useStore((s) => s.solicitacoes.find((x) => x.id === solic?.id));
  const [obs, setObs] = useState("");

  if (!solic || !solicAtual) return null;
  const s = solicAtual;
  const tempoProg = s.inicioProg && s.fimProg ? minutesBetween(s.inicioProg, s.fimProg) : (s.inicioProg ? minutesBetween(s.inicioProg, new Date().toISOString()) : 0);

  function handlePDFs(files: FileList | null) {
    if (!files || !files.length) return;
    const arquivos = Array.from(files).map((f) => ({ nome: f.name, url: URL.createObjectURL(f) }));
    addAgrupamentosDePDFs(s.id, arquivos, usuario);
    toast.success(`${arquivos.length} agrupamento(s) criado(s)`);
  }

  async function handleExcel(files: FileList | null) {
    if (!files || !files.length) return;
    const buf = await files[0].arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    aplicarMetadadosExcel(s.id, rows, usuario);
    toast.success(`Metadados aplicados (${rows.length} linhas)`);
  }

  return (
    <Dialog open={!!solic} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{s.id}</span> · {s.titulo}
            <StatusBadge status={s.status} />
            {s.emergencia && <Badge className="bg-destructive text-destructive-foreground">EMERGÊNCIA</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <Info label="OS" value={<span className="font-mono">{s.os}</span>} />
          <Info label="Nº Plano Geral" value={<span className="font-mono text-primary text-lg font-bold">{s.numeroPlano ?? "—"}</span>} />
          <Info label="Tempo programação" value={fmtMin(tempoProg)} />
          <Info label="Tempo ocioso" value={fmtMin(s.tempoOciosoMin)} />
        </div>

        <div>
          <div className="text-xs uppercase text-muted-foreground font-semibold mb-1">Descrição do planejador</div>
          <div className="text-sm p-3 rounded bg-secondary whitespace-pre-wrap">{s.descricao || "—"}</div>
          {s.descricaoRevisao && (
            <div className="text-sm mt-2 p-3 rounded border border-orange-500/50 bg-orange-500/10 whitespace-pre-wrap">
              <div className="text-xs uppercase text-orange-300 font-semibold mb-1">Descrição da revisão</div>
              {s.descricaoRevisao}
            </div>
          )}
          {s.anexos.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">Anexos: {s.anexos.map((a) => a.nome).join(", ")}</div>
          )}
        </div>

        {["Em Processo", "A Revisar", "Em Revisão", "Paralisado"].includes(s.status) && (
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="p-3 rounded border border-dashed border-primary/60 bg-primary/5 cursor-pointer text-sm hover:bg-primary/10">
              <div className="flex items-center gap-2 font-semibold"><FileUp className="h-4 w-4" />Importar PDFs dos Agrupamentos</div>
              <div className="text-xs text-muted-foreground mt-1">Os nomes dos arquivos viram nomes dos agrupamentos (Ex.: 1250C01.pdf).</div>
              <input type="file" multiple accept="application/pdf" className="hidden" onChange={(e) => handlePDFs(e.target.files)} />
            </label>
            <label className="p-3 rounded border border-dashed border-primary/60 bg-primary/5 cursor-pointer text-sm hover:bg-primary/10">
              <div className="flex items-center gap-2 font-semibold"><FileUp className="h-4 w-4" />Importar Planilha de Metadados (Excel)</div>
              <div className="text-xs text-muted-foreground mt-1">Colunas: Agrupamento, RIR, Material, Espessura, Comprimento, Largura, QtdItens, Peso, TempoEstMin.</div>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleExcel(e.target.files)} />
            </label>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs uppercase text-muted-foreground font-semibold">Agrupamentos ({s.agrupamentos.length})</div>
          {s.agrupamentos.length === 0 && (
            <div className="text-xs text-muted-foreground">Nenhum agrupamento ainda. Importe PDFs para criar.</div>
          )}
          {s.agrupamentos.length > 0 && (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    <th className="text-left px-2 py-1">Nome</th>
                    <th className="text-left px-2 py-1">RIR</th>
                    <th className="text-left px-2 py-1">Material</th>
                    <th className="text-right px-2 py-1">Esp.</th>
                    <th className="text-right px-2 py-1">Comp.</th>
                    <th className="text-right px-2 py-1">Larg.</th>
                    <th className="text-right px-2 py-1">Qtd</th>
                    <th className="text-right px-2 py-1">Peso</th>
                    <th className="text-right px-2 py-1">Tempo</th>
                    <th className="text-left px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {s.agrupamentos.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-2 py-1 font-mono">{a.nome}</td>
                      <td className="px-2 py-1">{a.rir ?? "—"}</td>
                      <td className="px-2 py-1">{a.material ?? "—"}</td>
                      <td className="px-2 py-1 text-right">{a.espessura ?? "—"}</td>
                      <td className="px-2 py-1 text-right">{a.comprimento ?? "—"}</td>
                      <td className="px-2 py-1 text-right">{a.largura ?? "—"}</td>
                      <td className="px-2 py-1 text-right">{a.qtdItens ?? "—"}</td>
                      <td className="px-2 py-1 text-right">{a.peso ?? "—"}</td>
                      <td className="px-2 py-1 text-right font-mono">{fmtMin(a.tempoEstMin)}</td>
                      <td className="px-2 py-1"><StatusBadge status={a.statusCorte} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <Label>Observações do programador</Label>
          <Textarea rows={3} defaultValue={s.observacoesProgramador} onChange={(e) => setObs(e.target.value)} />
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => { salvarObs(s.id, obs || s.observacoesProgramador || "", usuario); toast.success("Observações salvas"); }}>
            <Save className="h-4 w-4 mr-1" />Salvar observações
          </Button>
          {s.status !== "Paralisado" && s.status !== "Concluído" && s.status !== "Cancelado" && (
            <Button variant="outline" onClick={() => { setStatus(s.id, "Paralisado", usuario); toast("Plano paralisado"); }}>
              <PauseCircle className="h-4 w-4 mr-1" />Paralisar
            </Button>
          )}
          {s.status === "Paralisado" && (
            <Button variant="outline" onClick={() => { setStatus(s.id, "Em Processo", usuario); toast.success("Plano retomado"); }}>
              <Play className="h-4 w-4 mr-1" />Retomar
            </Button>
          )}
          {s.status === "A Revisar" && (
            <Button variant="outline" onClick={() => { setStatus(s.id, "Em Revisão", usuario); }}>Assumir revisão</Button>
          )}
          {s.status === "Em Revisão" && (
            <Button variant="outline" onClick={() => { setStatus(s.id, "Revisado", usuario); toast.success("Revisado"); }}>Marcar revisado</Button>
          )}
          {["Em Processo", "Revisado"].includes(s.status) && s.agrupamentos.length > 0 && (
            <Button onClick={() => { concluir(s.id, usuario); toast.success("Plano concluído — enviado ao encarregado"); onClose(); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Concluir plano
            </Button>
          )}
          {!["Cancelado", "Concluído"].includes(s.status) && (
            <Button variant="ghost" className="text-destructive" onClick={() => { setStatus(s.id, "Cancelado", usuario); onClose(); }}>
              <XCircle className="h-4 w-4 mr-1" />Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-2 rounded bg-secondary">
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
