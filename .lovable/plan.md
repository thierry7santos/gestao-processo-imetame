## Objetivo

Adicionar exibição do solicitante nas filas, enriquecer os cards do Encarregado, e dividir os logins de Encarregado/Operador por tipo (Chapa/Perfil/Tubo) com máquinas específicas e turnos Dia/Noite selecionáveis no topo da tela.

---

## 1. Solicitante nas filas (Planejador e Programador)

- Inserir a coluna **"Solicitante"** entre **ID** e **OS** nas tabelas de fila do Planejador e do Programador (nas 3 filas: Chapa/Perfil/Tubo).
- Valor exibido: `solic.planejadorCriador`.

## 2. Cards de "Disponíveis" do Encarregado

Enriquecer cada card de agrupamento disponível para alocação, exibindo (além do que já mostra):
- **Já existem:** ID, Título, Peso, Tempo de máquina.
- **Novos:** RIR, Material, Espessura, Comprimento × Largura, Qtd de Itens.
- Layout em grade compacta de 2 colunas para caber na coluna lateral.

## 3. Logins por tipo (Chapa / Perfil / Tubo) — **substituir** os atuais

Em `src/lib/auth.ts` (senha `123`), `Usuario` ganha `tipo?: TipoPlano` (obrigatório p/ encarregado/operador):

```
encarregado_chapa  · Chapa
encarregado_perfil · Perfil
encarregado_tubo   · Tubo
operador_chapa1    · Chapa
operador_chapa2    · Chapa
operador_perfil1   · Perfil
operador_tubo1     · Tubo
```

Planejadores e programador permanecem. Painel de credenciais no Login reflete a nova lista.

## 4. Máquinas por tipo + Turnos

Em `src/lib/types.ts`:
- `Maquina`: `"CNC-3" | "Messer" | "Robô-01" | "Robô-02" | "Bodor-D"`.
- Novo `Turno = "Dia" | "Noite"`.
- `Agrupamento` ganha `turno?: Turno`.

Mapa de máquinas por tipo:
```
Chapa  → CNC-3, Messer
Perfil → Robô-01, Robô-02
Tubo   → Bodor-D
```

Turnos (janelas informativas; limite diário atual mantido, aplicado por turno):
- Dia: 07:30 → 17:18.
- Noite: 18:30 → 04:18 do dia seguinte, contabilizado no `diaAlocado` de início.
- Limite por turno = limite atual do dia (08:48 seg-sex, 08:00 sáb) — cada turno é um "balde" independente.

## 5. Encarregado — seletores de Máquina **e** Turno no topo

- No cabeçalho da tela, ao lado do seletor **Máquina ativa**, adicionar o seletor **Turno ativo** (`Dia` / `Noite`). Exatamente o mesmo padrão do seletor de máquina.
- Toda a visualização do calendário e toda alocação passam a considerar o par `(máquina, turno)` selecionado:
  - Cards do calendário mostram apenas blocos cuja `maquina === maquina` **e** `turno === turno` selecionados.
  - Barra de uso/limite/peso calculada apenas sobre esses blocos.
  - Ao clicar em um dia para alocar, o agrupamento é gravado com o `turno` atualmente selecionado.
- `EncarregadoPage` também usa `user.tipo` para:
  - Filtrar a lista "Disponíveis" a agrupamentos cuja `Solicitacao.tipo === user.tipo`.
  - Restringir o `Select` de máquina às máquinas do tipo (default = primeira).
- Nenhuma UI de "Dia/Noite empilhados" nos cards — a segmentação é feita pelos seletores globais, exatamente como já é feito com máquina.

## 6. Operador — filtragem por tipo

- `OperadorPage` lista apenas agrupamentos cuja `Solicitacao.tipo === user.tipo` e cuja `maquina` esteja em `MAQUINAS_POR_TIPO[user.tipo]`. Demais fluxos (Poka-Yoke, paradas) inalterados.

## 7. Persistência e migração

- `store.ts` (persist): bump de versão + migração:
  - Descarta sessão cujo `username` não existe mais.
  - Marca agrupamentos sem `turno` como `"Dia"`.

---

## Detalhes técnicos

**Arquivos a alterar:**
- `src/lib/types.ts` — `Maquina` estendida, `Turno`, `Usuario.tipo`, `Agrupamento.turno`.
- `src/lib/auth.ts` — nova lista `USUARIOS`, `MAQUINAS_POR_TIPO`, helper `maquinasDoUsuario`.
- `src/lib/store.ts` — `alocarAgrupamento(..., turno)`, versão + migração.
- `src/services/dataService.ts` — assinatura com `turno` + `// TODO` p/ coluna SQL.
- `src/lib/seed.ts` — `turno: "Dia"` nos agrupamentos alocados do seed.
- `src/routes/planejador.tsx` — coluna "Solicitante".
- `src/routes/programador.tsx` — coluna "Solicitante" nas 3 filas.
- `src/routes/encarregado.tsx` — filtro por tipo, máquinas dinâmicas, seletor de **Turno** no header, cards enriquecidos, filtragem de blocos e alocação por `(máquina, turno)`.
- `src/routes/operador.tsx` — filtro por tipo/máquinas do usuário.
- `src/routes/login.tsx` — painel de credenciais atualizado.
- `README.md` — usuários, máquinas por tipo e turnos.

**Fora de escopo:** particularidades adicionais de tela por tipo além de máquinas/turnos; KPIs segmentados por turno.