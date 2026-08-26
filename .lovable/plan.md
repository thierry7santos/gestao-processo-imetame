# Setup passa a ser função do Operador (com reabertura)

## O que muda

1. **Setup no tablet do Operador**
   - Os botões "Iniciar Setup" e "Finalizar Setup" saem da tela de Preparação e entram no card do plano no tablet do Operador.
   - Estados no card do operador:
     - `Alocado` sem setup → botão grande **INICIAR SETUP** (roxo), no lugar do atual "Aguardando setup da preparação".
     - Setup em andamento → card roxo com cronômetro do setup + botão **FINALIZAR SETUP**.
     - Setup concluído → mostra a duração ("Setup 12 min") e libera o botão **INÍCIO DO CORTE** (mesma validação poka-yoke de hoje).
   - `setupPor` passa a registrar o nome do operador.

2. **Reabrir setup**
   - Botão secundário **Reabrir Setup** disponível quando o setup já foi finalizado e o corte ainda **não** começou.
   - Ao reabrir: pede confirmação, limpa `fimSetup`/`setupMin`, mantém o `inicioSetup` original em um histórico de setups do agrupamento e volta o card ao estado "setup em andamento".
   - O tempo total de setup passa a ser a soma das sessões (usado no OEE/Disponibilidade), então reabrir não zera o tempo já gasto.

3. **Preparação**
   - Mantém tudo o que faz hoje (alocação, máquina/turno, cards enriquecidos), mas passa a **exibir** o estado do setup somente como leitura ("Aguardando setup", "Em setup", "Setup 12 min · pronto p/ corte"), sem botões de ação.

4. **Auditoria / Andon / KPIs**
   - Auditoria continua registrando os eventos de setup, agora com o operador como autor e um evento novo para reabertura.
   - Andon e KPIs continuam usando o tempo de setup somado — sem mudança de regra de OEE.

## Detalhes técnicos

- `src/lib/types.ts`: adicionar `setupSessoes?: { inicio: string; fim?: string; por: string }[]` em `Agrupamento`; `setupMin` passa a ser o acumulado.
- `src/store/*`: `iniciarSetup` empurra uma nova sessão; `finalizarSetup` fecha a última e soma em `setupMin`; nova ação `reabrirSetup` (limpa `fimSetup` e abre nova sessão, bloqueada se `inicioCorte` existir). Bump da versão do storage com migração leve para os registros existentes.
- `src/services/dataService.ts`: expor `reabrirSetup`.
- `src/routes/operador.tsx`: bloco de setup + diálogo de confirmação de reabertura.
- `src/routes/encarregado.tsx`: remover botões, manter badge de status somente leitura.
