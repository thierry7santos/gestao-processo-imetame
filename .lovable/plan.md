# IME Corte CNC — Planejamento, Programação, Preparação

Aplicação MES em Single Page com autenticação por perfil, tema escuro Imetame (verde/preto), responsivo para monitores e tablets horizontais.

## Escopo do MVP (v1 completa nesta entrega)

Toda a lógica funciona **client-side** com persistência em `localStorage` (sem backend). Isso permite entregar todas as 6 telas descritas com dados que persistem entre sessões e navegação entre perfis. Se depois quiser multi-usuário real (dados compartilhados entre dispositivos), habilitamos Lovable Cloud numa segunda etapa.

## Stack e Design System

- TanStack Start + Tailwind v4 já configurados.
- Tokens em `src/styles.css`: `--imetame-green` (verde vibrante), superfícies escuras (`--background`, `--card`), alto contraste para chão de fábrica, cores de alerta (laranja "A Revisar", roxo "Em Revisão", verde "Cortado", amarelo "Em Corte", vermelho "Emergência/Divergência").
- Fontes: Inter (UI) + JetBrains Mono (IDs, códigos de plano).
- Componentes shadcn: Button, Input, Table, Dialog, Tabs, Select, Checkbox, Badge, Card, Calendar.
- Charts: `recharts` (já compatível) para KPIs.
- Estado global: Zustand + persistência em localStorage.

## Estrutura de Rotas

```
/                       → redireciona para /login ou área do perfil logado
/login                  → tela única com painel de credenciais de teste
/_auth/planejador       → interface planejador (+ acesso a dashboard/kpis)
/_auth/programador      → interface programador (+ acesso a dashboard/kpis)
/_auth/encarregado      → interface encarregado
/_auth/operador         → interface operador (layout tablet)
/_auth/auditoria        → dashboard auditoria (só planejador/programador)
/_auth/kpis             → central de KPIs (só planejador/programador)
```

Guard de rota: `beforeLoad` lê sessão do zustand; se perfil não bate, redireciona para a área correta.

## Modelo de Dados (localStorage / zustand)

```ts
Solicitacao {
  id: "#0001" (sequencial imutável),
  os: "0751.03.001",
  titulo, tipo: "Chapa"|"Perfil"|"Tubulação",
  dataNecessidade, descricao, anexos[], emergencia: bool,
  status: "Em Fila"|"Em Processo"|"Paralisado"|"Concluído"
         |"A Revisar"|"Em Revisão"|"Revisado"|"Cancelado",
  planejadorCriador, revisoes[], descricaoRevisao?,
  numeroPlano?: "1250C", programador?, inicioProg?, fimProg?,
  tempoOcioso: number, agrupamentos: Agrupamento[],
  historico: Log[] // {usuario, dataHora, mudanca}
}

Agrupamento {
  nome: "1250C01", pdfUrl,
  rir, material, espessura, comprimento, largura, qtdItens, peso, tempoEstMin,
  chapaRecebida: bool, maquina?: "CNC-3"|"Messer",
  diaAlocado?: ISO, semana?,
  statusCorte: "Alocado"|"Em Corte"|"Cortado",
  validacao?: { matOk, rirOk, espOk, compDigitado, largDigitado, divergenciaAceita },
  inicioCorte?, fimCorte?, operador?, obsOperacao?
}

Usuario { username, perfil, nome }
Sessao { usuarioAtual }
```

Contadores globais: `nextSolicitacaoId` (0001+), `nextPlanoNumero` (1250C+).

## Detalhes por Interface

### 1. Login
- Card central com logo/nome, formulário, e abaixo painel "Credenciais de teste" listando os 6 usuários.
- Valida contra lista hardcoded, seta sessão, redireciona.

### 2. Planejador
- Formulário nova solicitação com validação: botão Emergência só ativa se `dataNecessidade === hoje`.
- Tabela "Fila de Planos" ordenada por dataNecessidade, com colunas ID, OS, Tipo, Data, Status, Máquina, Data Prevista, Tempo.
- Ao clicar em concluída → modal com nº plano geral + lista de PDFs por agrupamento.
- Botões Editar/Revisar respeitando as regras de status.
- Log de auditoria por solicitação.

### 3. Programador
- Tabela com filtros; emergências e "A Revisar/Em Revisão" fixadas no topo via sort.
- Botão "Iniciar Plano" gera `1250C` sequencial, registra programador/hora.
- Área upload PDFs: parseia nome do arquivo → cria agrupamentos automaticamente.
- Botão importar Excel (.xlsx via `xlsx` lib) → distribui metadados por nome do agrupamento.
- Modal detalhes: nº plano, tempos, obs. Botões separados Salvar Observações / Concluir.
- Cronômetro de tempo ocioso quando "Paralisado".
- Filtro de status oculta Concluídos/Cancelados por padrão.
- Fluxo revisão A Revisar → Em Revisão → Revisado.

### 4. Encarregado
- Seletor de semana (semana atual + próximas) no topo.
- Seletor de máquina ativa (CNC-3 / Messer) → calendário independente.
- Lista lateral de agrupamentos disponíveis (só de solicitações Concluídas/A Revisar/Em Revisão/Revisado).
- Agrupamentos "A Revisar/Em Revisão/Revisado" com animação pulse laranja/roxo.
- Drag para alocar (ou clique em dia) — só permite se "Chapa Recebida" = Sim.
- Cálculo: limite 8h48 seg-sex, 8h sáb; mostra tempo restante e peso acumulado por dia.
- Histórico: blocos permanecem no dia após corte, mudando cor: verde=Cortado, amarelo=Em Corte.

### 5. Operador (Tablet)
- Layout landscape, controles gigantes.
- Seletor de máquina no topo → filtra agrupamentos alocados para hoje nessa máquina.
- Cards grandes por agrupamento, verde para já cortados, botão "Abrir PDF".
- Modal validação: 3 checkboxes + 2 inputs numéricos (Comp, Larg).
- Compara com valor real; se divergência > 50mm abre dialog de confirmação, grava `divergenciaAceita`.
- Botões gigantes Início / Fim de corte gravam timestamps + operador.

### 6. Auditoria (Planejador/Programador)
- Filtros: ID, plano, período, máquina, OS, status.
- Tabela comparativa Real x Digitado; célula pisca vermelho se |desvio|>50mm.
- Ao expandir linha → timeline: criador, editores, revisores, programador, tempos ociosos, operador, observações.

### 7. KPIs (Planejador/Programador)
- Tabs "Programação" e "Corte".
- Filtros globais: semanal (seg-sáb), mensal, operador, máquina.
- Gráficos recharts:
  - Estimado vs Real (barras agrupadas dia/semana/mês).
  - Peso de aço cortado (linhas/barras).
  - Eficiência por operador e máquina (barras horizontais + %).
- Cards de resumo: planos paralisados, tempo ocioso total, produtividade.

## Detalhes técnicos

- `src/lib/store.ts` — zustand store com persist middleware.
- `src/lib/auth.ts` — usuários hardcoded + hook `useSession`.
- `src/lib/seed.ts` — dados de demonstração para popular estados/dashboard na primeira carga.
- `src/lib/formatters.ts` — datas, minutos→hh:mm, semanas ISO.
- `src/components/ui/*` — shadcn existente.
- `src/components/app/*` — Layout com header (nome+perfil+logout), Sidebar por perfil.
- `src/routes/_auth/*` — layout protegido que valida sessão e monta chrome.
- Ícones: lucide-react.
- Excel parsing: adiciona `xlsx` via bun. PDFs: guardamos `File → object URL` em memória (não persistem entre reloads — aceitável para demo; alertar isso na UI).

## O que NÃO entra nesta v1
- Backend real / sincronização multi-dispositivo.
- Upload persistente de PDFs/Excel (arquivos ficam por sessão).
- Notificações push.

Posso habilitar Lovable Cloud depois se quiser persistência real, logins de verdade e compartilhamento entre usuários.

## Entregáveis desta iteração
Aplicação navegável com os 6 perfis, dados semente, todos os fluxos descritos funcionando localmente, KPIs com gráficos populados a partir dos dados de demonstração.