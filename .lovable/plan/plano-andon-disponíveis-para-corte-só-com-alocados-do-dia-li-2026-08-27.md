# Plano: Andon — "Disponíveis para corte" só com alocados do dia + listas com info completa

## 1. "Disponíveis para corte" = só planos alocados no dia
Em `src/routes/andon.tsx` (no `useMemo` de `dados`, ~linhas 51–86), alterar a lista `disponiveis`:

- **Hoje:** inclui itens não alocados no dia (`Movimentado` ou `Alocado` com `diaAlocado !== hoje`) — passivos/não alocados hoje.
- **Depois:** incluir apenas itens com `a.maquina && a.diaAlocado === hoje && a.statusCorte === "Alocado"` — planos já alocados a uma máquina hoje, na fila de corte.

Implementação: parar de empurrar para `disponiveis` na branch `if (!a.maquina || a.diaAlocado !== hoje)`; na branch `statusCorte === "Alocado"` (que já adiciona ao `slot.fila`), adicionar também a `disponiveis`. A lista agrega a fila de todas as máquinas do dia. Ordenação por `nome` permanece.

## 2. Listas com informações completas dos planos
Enriquecer as linhas das duas listas (`ListaCard` — "Histórico · cortados hoje" e "Disponíveis para corte") e o conteúdo dos cards de máquina com dados técnicos completos do plano.

Para cada item, mostrar (quando aplicável):
- **Nome do plano** (mono, negrito) — `agrup.nome`
- **O.S.** — `solic.os`
- **Tipo** — `solic.tipo` (Chapa/Perfil/Tubo)
- **Material / Código** — `agrup.material` / `agrup.codigoMaterial`
- **Espessura** — `agrup.espessura` (mm)
- **Comprimento × Largura** — `agrup.comprimento` × `agrup.largura` (mm)
- **Qtd. itens** — `agrup.qtdItens`
- **Peso** — `agrup.peso` (kg)
- **Máquina** — `agrup.maquina`
- **Turno** — `agrup.turno`
- **Operador** — `agrup.operador`
- **RIR** — `agrup.rir`
- **Tempo de plano** — `fmtMin(agrup.tempoEstMin)`
- **Fim do corte** (no histórico) — horário de `agrup.fimCorte`

Layout: trocar o render de linha única (`text-xs` flex) por um bloco de duas linhas por item:
- Linha 1: Nome (mono, negrito) + O.S. + Tipo + Máquina (badge)
- Linha 2: Esp · Comp×Larg · Qtd · Peso · RIR · Turno · Operador · Tempo

Manter a altura rolável (`max-h-56 overflow-y-auto`), talvez aumentando um pouco e usando `gap`/`flex-wrap` para não cortar. Itens com poucos dados mostram "—" para campos ausentes.

Nos cards de máquina (faixas Anterior/Atual/Próximo), já há Nome + O.S. + operador/tempo; adicionar Espessura e Peso quando houver espaço, sem quebrar o layout compacto.

## Sem impacto
- Cards de máquina (Anterior/Atual/Próximo) mantêm a estrutura "caça-níqueis"; só ganham campos extras.
- Passivos anteriores continuam no fluxo Materiais/Preparação; apenas saem da lista do Andon.
- OEE/KPIs/Auditoria não mudam (Andon é só leitura).

## Verificação
- `bun run build:dev` passa.
- `/andon`: "Disponíveis para corte" mostra só planos alocados a máquinas hoje (`Alocado`), com O.S., nome, espessura, material, dimensões, peso, etc.
- "Histórico · cortados hoje" mostra os mesmos campos + horário do fim do corte.
