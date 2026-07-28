import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { findUser, perfilLabel, PERFIS_DESAFIO } from "@/lib/auth";
import type { Perfil, Solicitacao, Agrupamento } from "@/lib/types";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  solic: Solicitacao;
  agrup?: Agrupamento;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function DesafioButton({ solic, agrup, size = "sm", variant = "outline", label = "Desafio" }: Props) {
  const [open, setOpen] = useState(false);
  const sessao = useStore((s) => s.sessao)!;
  const user = findUser(sessao.username)!;
  const addDesafio = useStore((s) => s.addDesafio);

  const [desc, setDesc] = useState("");
  const [atribuidoA, setAtribuidoA] = useState<Perfil>("programador");
  const [responsavel, setResponsavel] = useState<Perfil>("encarregado");
  const [resolucao, setResolucao] = useState("");

  function submit() {
    if (!desc.trim()) { toast.error("Descreva o desafio"); return; }
    addDesafio({
      solicId: solic.id,
      agrupId: agrup?.id,
      agrupNome: agrup?.nome,
      descricao: desc.trim(),
      atribuidoA,
      responsavel,
      resolucao: resolucao.trim() || undefined,
      criadoPor: user.nome,
      criadoPorPerfil: user.perfil,
    });
    toast.success(`Desafio aberto → ${perfilLabel(atribuidoA)}`);
    setDesc(""); setResolucao("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className="border-orange-500/50 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200"
          title="Informar desafio / irregularidade"
        >
          <AlertCircle className="h-3.5 w-3.5 mr-1" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-300">
            <AlertCircle className="h-5 w-5" /> Informar desafio
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground">
          <b className="font-mono">{solic.id}</b>
          {agrup && <> · agrupamento <b className="font-mono">{agrup.nome}</b></>}
        </div>
        <div className="space-y-3">
          <div>
            <Label>Desafio *</Label>
            <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Chapa recebida com recorte diferente do físico." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Atribuir a *</Label>
              <Select value={atribuidoA} onValueChange={(v) => setAtribuidoA(v as Perfil)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERFIS_DESAFIO.map((p) => <SelectItem key={p} value={p}>{perfilLabel(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável (culpa) *</Label>
              <Select value={responsavel} onValueChange={(v) => setResponsavel(v as Perfil)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERFIS_DESAFIO.map((p) => <SelectItem key={p} value={p}>{perfilLabel(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Resolução sugerida (opcional)</Label>
            <Textarea rows={2} value={resolucao} onChange={(e) => setResolucao(e.target.value)} placeholder="Ex.: Trocar a chapa e revisar aproveitamento." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-black" onClick={submit}>Registrar desafio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
