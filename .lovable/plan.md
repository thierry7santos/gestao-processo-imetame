# Plano: Andon + Setup/OEE real + Exportação de relatórios

Manter `localStorage` (demo de apresentação para a T.I.). Adicionar três funcionalidades sobre a base existente.

## 1. Painel Andon (TV do chão de fábrica)

Nova rota pública `/andon` (sem AppShell, sem login) projetada para um monitor na parede — full-screen, alto contraste, auto-refresh a cada 30s.

- **Grade de máquinas**: um card grande por máquina (CNC-3, Messer, Robô-01, Robô-02, Bodor-D). Cada card mostra:
  - Estado ao vivo: `Cortando` (verde pulsante) / `Ociosa` (cinza) / `Paralisada` (laranja piscante) / `Sem alocação hoje` (escuro).
  - Agrupamento em corte atual (nome, OS, operador).
  - Cronômetro decorrido do corte em andamento (calculado de `inicioCorte` em tempo real).
  - Motivo da parada ativa, se houver.
- **Cabeçalho**: data/hora ao vivo, turno atual (Dia/Noite por horário), total do dia — cortados / em andamento / paralisados, peso acumulado.
- **Rodapé**: lista dos próximos 5 agrupamentos alocados para hoje ainda não iniciados (fila do dia por máquina).
- **Lógica de estado**: deriva 100% de `useStore.getState().solicitacoes` cruzando `agrupamentos` por `maquina` + `diaAlocado === todayISO()`. Sem nova escrita no store.
- Acesso: link direto `/andon`; o card de login exibe a URL do Andon como dica. Não entra no menu de perfis (é tela de parede).

Arquivos: `src/routes/andon.tsx` (novo), referência em `src/routes/login.tsx`.

## 2. Setup separado do corte + OEE real

Hoje a Preparação aloca mas não aponta tempo de setup. Adicionar apontamento de setup e cálculo de OEE real.

- **Tipos** (`src/lib/types.ts`): adicionar em `Agrupamento`:
  - `inicioSetup?`, `fimSetup?`, `setupMin?`, `setupPor?`.
  - `qualidadeOk?` boolean (peça dentro da tolerância, derivado da validação do operador — sem divergência >50mm ou divergência aceita).
- **Store** (`src/lib/store.ts`): nova action `iniciarSetup(solicId, agrupId, usuario)` (só se `statusCorte === "Alocado"`, registra `inicioSetup`) e `finalizarSetup(solicId, agrupId, usuario)` (registra `fimSetup`, `setupMin`, permite iniciar corte). `finalizarCorte` já define `qualidadeOk` a partir da `validacao.divergenciaAceita`.
- **dataService** (`src/services/dataService.ts`): expor `iniciarSetup`/`finalizarSetup`.
- **UI Preparação** (`src/routes/encarregado.tsx`): nos cards de planos Alocados, botões **Iniciar Setup** / **Finalizar Setup** com cronômetro decorrido. Setup concluído habilita o fluxo para o Operador (o card do operador só mostra "Início do Corte" se `fimSetup` existir; senão exibe "Aguardando setup").
- **OEE nos KPIs** (`src/routes/kpis.tsx`): nova aba **OEE** com:
  - Disponibilidade = tempo corte / (tempo corte + setup + paradas).
  - Performance = tempo estimado / tempo real de corte.
  - Qualidade = peças sem divergência / total cortado.
  - OEE = D × P × Q (%). Gráfico por máquina e por dia.

## 3. Exportação de relatórios (PDF/Excel)

Exportar Auditoria e KPIs sem servidor (geração no cliente).

- **Biblioteca**: `xlsx` (SheetJS) para Excel e `jspdf` + `jspdf-autotable` para PDF — ambos puros JS, compatíveis com build.
- **Helper** `src/lib/exporters.ts` (novo):
  - `exportarAuditoriaPDF(filtro)` — tabela de solicitações filtradas (ID, OS, Solicitante, Tipo, Plano, Máquina, Status, divergências) + rodapé de geração.
  - `exportarAuditoriaExcel(filtro)` — mesma planilha com aba extra de timeline por OS.
  - `exportarKpisPDF(resumo, porMaquina, porOperador)` — KPI cards + tabelas.
- **UI**: botão **Exportar** (dropdown PDF/Excel) no topo de `src/routes/auditoria.tsx` e `src/routes/kpis.tsx`.

## 4. Detalhes e reforço visual

- Manter paleta verde/preto e alto contraste; Andon usa o tema escuro já configurado.
- Botões de Setup/Exportar seguem `StatusBadge` e variantes shadcn existentes.

## Ordem de implementação

1. Tipos + store + dataService (setup + qualidade) — base para 2 e 3.
2. Painel Andon (rota isolada, só leitura).
3. UI de Setup na Preparação + trava no Operador.
4. Aba OEE nos KPIs.
5. Exporters + botões de exportação.
6. Build de verificação + checagem no preview.

Nenhuma regra de negócio existente é alterada; tudo é aditivo.
