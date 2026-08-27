# Plano: Andon — "Disponíveis para corte" só com alocados do dia + listas com info completa

## Objetivo
Na lista "Disponíveis para corte" do painel Andon (`src/routes/andon.tsx`), exibir apenas os planos já alocados para uma máquina **no dia de hoje** que estão aguardando corte (status `Alocado`). Hoje a lista mostra planos não alocados no dia (Movimentados / Alocados de outros dias), o que não corresponde à meta.

## Mudança
Em `src/routes/andon.tsx`, dentro do `useMemo` de `dados` (linhas 51–86), alterar a construção da lista `disponiveis`:

- **Antes:** inclui itens onde `!a.maquina || a.diaAlocado !== hoje` e `statusCorte === "Movimentado"` ou (`Alocado` com `diaAlocado !== hoje`) — ou seja, passivos/não alocados hoje.
- **Depois:** incluir apenas itens com `a.maquina && a.diaAlocado === hoje && a.statusCorte === "Alocado"` — planos já alocados a uma máquina hoje, na fila de corte.

Implementação simples: na branch que hoje trata `if (!a.maquina || a.diaAlocado !== hoje)`, parar de empurrar para `disponiveis`. Em vez disso, na branch onde `diaAlocado === hoje` e `statusCorte === "Alocado"` (que já adiciona ao `slot.fila`), adicionar também a `disponiveis`. Assim a lista agrega a fila de todas as máquinas do dia.

A ordenação existente por `nome` permanece.

## Sem impacto
- Os cards de máquina (Anterior / Atual / Próximo) e a lista "Histórico · cortados hoje" não mudam.
- Passivos anteriores continuam aparecendo no fluxo normal (Materiais/Preparação), apenas saem desta lista do Andon.
- OEE/KPIs/Auditoria não são afetados (uso somente de leitura do Andon).

## Verificação
- `bun run build:dev` deve passar.
- Abrir `/andon`: a lista "Disponíveis para corte" deve mostrar somente planos alocados a máquinas hoje (status `Alocado`), sem Movimentados/passivos.
