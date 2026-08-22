import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { USUARIOS, findUser, homeFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Factory, KeyRound, Tv } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const login = useStore((s) => s.login);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = findUser(username.trim());
    if (!u || u.senha !== senha) {
      toast.error("Usuário ou senha inválidos");
      return;
    }
    login(u.username);
    toast.success(`Bem-vindo, ${u.nome}`);
    navigate({ to: homeFor(u.perfil) as "/planejador" });
  }

  function quickLogin(uname: string) {
    setUsername(uname);
    setSenha("123");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar border-r border-border">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-12 w-12 rounded-lg bg-primary text-primary-foreground">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold">Gestão de Processos CNC</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Imetame
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight">
            Planejamento. <span className="text-primary">Programação.</span><br />
            Materiais. Preparação. <span className="text-primary">Operação.</span>
          </h1>
          <p className="text-muted-foreground max-w-md text-sm">
            Fluxo completo de gestão de processos de corte CNC — do pedido do planejador ao chão de fábrica.
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Imetame · Uso interno
        </div>
        <Link to="/andon" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Tv className="h-3.5 w-3.5" /> Abrir Painel Andon (TV do chão de fábrica)
        </Link>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3">
            <div className="grid place-items-center h-11 w-11 rounded-lg bg-primary text-primary-foreground">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Gestão de Processos CNC</div>
              <div className="text-[11px] text-muted-foreground uppercase">Imetame</div>
            </div>
          </div>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">Entrar</h2>
              <p className="text-sm text-muted-foreground">Acesse com suas credenciais internas.</p>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="username">Usuário</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </Card>

          <Card className="p-4 border-dashed">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-4 w-4 text-primary" />
              <div className="text-xs font-bold uppercase tracking-wider text-primary">Credenciais de teste</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {USUARIOS.map((u) => (
                <button
                  key={u.username}
                  onClick={() => quickLogin(u.username)}
                  className="text-left px-3 py-2 rounded-md bg-secondary hover:bg-accent transition-colors"
                >
                  <div className="font-mono font-semibold">{u.username}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {u.perfil === "encarregado" ? "preparação" : u.perfil}{u.tipo ? ` · ${u.tipo === "Tubulação" ? "Tubo" : u.tipo}` : ""}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Senha para todos: <span className="font-mono text-foreground">123</span> · clique num usuário para preencher.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
