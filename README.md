# IME Corte CNC — Guia de Implementação para a TI

Sistema MES (Manufacturing Execution System) da Imetame para gestão do fluxo de
**Planejamento → Programação → Preparação → Corte** nas máquinas CNC-3 e Messer.

Este documento é um guia técnico para os desenvolvedores da Imetame plugarem o
backend SQL definitivo no protótipo web já entregue.

---

## 1. Stack e identidade visual

- **Framework**: React 19 + TanStack Start (Vite 7, SSR opcional).
- **Estilo**: Tailwind CSS v4 com tokens semânticos em `src/styles.css`
  (paleta oficial Imetame: **Verde** `--imetame-green` sobre **Preto**
  `--background`; alertas em laranja, roxo, amarelo e vermelho).
- **Componentes**: shadcn/ui (Radix por baixo), ícones lucide-react,
  gráficos Recharts.
- **Estado**: Zustand com `persist` em `localStorage` — **temporário**
  enquanto o backend SQL não está plugado.
- **Rotas**: file-based em `src/routes/`. Cada perfil (planejador,
  programador, encarregado, operador) tem sua rota protegida por
  `RequireAuth`.

Regra visual inegociável: **nunca** usar cores hardcoded (`bg-black`,
`text-white`). Sempre consumir tokens (`bg-primary`, `text-foreground`,
`border-border`, `bg-secondary`, etc.) para manter o padrão Imetame e o modo
escuro correto no chão de fábrica.

---

## 2. Camada de serviço centralizada (ponto de plug do backend)

Todas as leituras e gravações de dados de negócio passam por **um único
arquivo**:

```
src/services/dataService.ts
```

As telas **não** leem nem escrevem em estados globais soltos — elas importam
funções limpas como:

```ts
import {
  getSolicitacoes,
  createSolicitacao,
  updateStatus,
  alocarAgrupamento,
  paralisarCorte,
  getPassivosAnteriores,
} from "@/services/dataService";
```

Dentro do arquivo, cada função tem um comentário `// TODO: Substituir por API
Backend SQL — <MÉTODO> <ROTA>` indicando exatamente qual endpoint REST o
programador da Imetame deve implementar. Para plugar o backend real basta
trocar o corpo de cada função por um `fetch(...)` — nenhuma tela precisa ser
modificada.

Rotas REST sugeridas (todas versionáveis sob `/api/v1`):

| Método | Rota | Função no serviço |
| --- | --- | --- |
| GET | `/api/solicitacoes` | `getSolicitacoes()` |
| GET | `/api/solicitacoes/:id` | `getSolicitacaoById()` |
| POST | `/api/solicitacoes` | `createSolicitacao()` |
| PATCH | `/api/solicitacoes/:id` | `updateSolicitacao()` |
| POST | `/api/solicitacoes/:id/revisao` | `revisarSolicitacao()` |
| PATCH | `/api/solicitacoes/:id/status` | `updateStatus()` |
| POST | `/api/solicitacoes/:id/iniciar` | `iniciarPlano()` |
| POST | `/api/solicitacoes/:id/concluir` | `concluirPlano()` |
| POST | `/api/solicitacoes/:id/agrupamentos` | `addAgrupamentosDePDFs()` |
| POST | `/api/solicitacoes/:id/agrupamentos/metadados` | `aplicarMetadadosExcel()` |
| PATCH | `/api/agrupamentos/:id/chapa-recebida` | `toggleChapaRecebida()` |
| POST | `/api/agrupamentos/:id/alocar` | `alocarAgrupamento()` |
| POST | `/api/agrupamentos/:id/desalocar` | `desalocarAgrupamento()` |
| POST | `/api/agrupamentos/:id/corte/iniciar` | `iniciarCorte()` |
| POST | `/api/agrupamentos/:id/corte/paralisar` | `paralisarCorte()` |
| POST | `/api/agrupamentos/:id/corte/retomar` | `retomarCorte()` |
| POST | `/api/agrupamentos/:id/corte/finalizar` | `finalizarCorte()` |
| POST | `/api/manutencao/passivos-anteriores` | `aplicarPassivosAnteriores()` |

Autenticação sugerida: JWT no header `Authorization: Bearer <token>`, emitido
pelo endpoint `POST /api/auth/login` a partir da tabela `usuarios`.

---

## 3. Modelagem sugerida do banco de dados SQL

Diagrama de relacionamento (1:N indicados por `─<`):

```
usuarios ─< solicitacoes ─< agrupamentos ─< apontamentos_operador
                       └─< historico_revisoes
```

### 3.1 `usuarios`

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `username` | VARCHAR(50) UNIQUE NOT NULL | login |
| `senha_hash` | VARCHAR(255) NOT NULL | bcrypt/argon2 |
| `nome` | VARCHAR(120) NOT NULL | exibição |
| `perfil` | ENUM('planejador','programador','encarregado','operador') | controla acesso |
| `ativo` | BOOLEAN DEFAULT TRUE | |
| `criado_em` | TIMESTAMP DEFAULT NOW() | |

### 3.2 `solicitacoes`

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | VARCHAR(8) PK | ID Único imutável (ex.: `#0001`) |
| `os` | VARCHAR(30) NOT NULL | Ordem de Serviço (ex.: `0751.03.001`) |
| `titulo` | VARCHAR(200) NOT NULL | |
| `tipo` | ENUM('Chapa','Perfil','Tubulação') | |
| `data_necessidade` | DATE NOT NULL | usada para ordenação da fila |
| `descricao` | TEXT | |
| `descricao_revisao` | TEXT NULL | preenchida quando planejador solicita revisão |
| `emergencia` | BOOLEAN DEFAULT FALSE | só pode ser TRUE se `data_necessidade = CURRENT_DATE` |
| `status` | ENUM(...) | ver `StatusSolicitacao` em `src/lib/types.ts` |
| `planejador_criador_id` | INT FK → usuarios.id | |
| `programador_id` | INT FK → usuarios.id NULL | |
| `numero_plano` | VARCHAR(10) NULL | sequencial `1250C`, `1251C`, ... |
| `inicio_prog` | TIMESTAMP NULL | |
| `fim_prog` | TIMESTAMP NULL | |
| `paralisado_desde` | TIMESTAMP NULL | usado pelo cronômetro de ociosidade |
| `tempo_ocioso_min` | INT DEFAULT 0 | acumulado |
| `observacoes_programador` | TEXT NULL | |
| `criado_em` | TIMESTAMP DEFAULT NOW() | |

Índices: `(status, data_necessidade)`, `(os)`, `(numero_plano)`.

### 3.3 `agrupamentos`

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `solicitacao_id` | VARCHAR(8) FK → solicitacoes.id ON DELETE CASCADE | **liga o agrupamento à solicitação-mãe** |
| `nome` | VARCHAR(30) NOT NULL | ex.: `1250C01` |
| `pdf_nome` | VARCHAR(255) NULL | |
| `pdf_url` | TEXT NULL | caminho no storage |
| `rir` | VARCHAR(30) NULL | |
| `material` | VARCHAR(60) NULL | |
| `espessura_mm` | NUMERIC(6,2) NULL | |
| `comprimento_mm` | NUMERIC(8,2) NULL | valor "real" |
| `largura_mm` | NUMERIC(8,2) NULL | valor "real" |
| `qtd_itens` | INT NULL | |
| `peso_kg` | NUMERIC(8,2) NULL | |
| `tempo_est_min` | INT NULL | |
| `chapa_recebida` | BOOLEAN DEFAULT FALSE | trava alocação |
| `maquina` | ENUM('CNC-3','Messer') NULL | |
| `dia_alocado` | DATE NULL | dia do calendário do encarregado |
| `status_corte` | ENUM('Aguardando','Alocado','Em Corte','Corte Paralisado','Cortado') | |
| `is_passivo_anterior` | BOOLEAN DEFAULT FALSE | ver seção 4 |
| `inicio_corte` | TIMESTAMP NULL | |
| `fim_corte` | TIMESTAMP NULL | |
| `operador_id` | INT FK → usuarios.id NULL | |
| `obs_operacao` | TEXT NULL | |

Índices: `(solicitacao_id)`, `(maquina, dia_alocado)`, `(status_corte)`.

### 3.4 `apontamentos_operador`

Registra a validação Poka-Yoke feita antes de iniciar o corte + qualquer
parada declarada pelo operador durante a operação.

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `agrupamento_id` | INT FK → agrupamentos.id ON DELETE CASCADE | |
| `operador_id` | INT FK → usuarios.id | |
| `tipo` | ENUM('validacao','parada','retomada','finalizacao') | |
| `momento` | TIMESTAMP DEFAULT NOW() | |
| `motivo` | VARCHAR(120) NULL | para `tipo = 'parada'` |
| `mat_ok` | BOOLEAN NULL | validação inicial |
| `rir_ok` | BOOLEAN NULL | |
| `esp_ok` | BOOLEAN NULL | |
| `comp_digitado_mm` | NUMERIC(8,2) NULL | |
| `larg_digitado_mm` | NUMERIC(8,2) NULL | |
| `divergencia_aceita` | BOOLEAN DEFAULT FALSE | true se operador confirmou desvio > 50 mm |

Motivos padrão de parada (constante em `src/services/dataService.ts →
MOTIVOS_PARADA`): Troca de Bico, Falta de Gás, Manutenção da Máquina,
Aguardando Ponte Rolante, Troca de Chapa, Outro.

### 3.5 `historico_revisoes`

Log de auditoria (linha do tempo por OS/solicitação exibida no dashboard).

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `solicitacao_id` | VARCHAR(8) FK → solicitacoes.id ON DELETE CASCADE | |
| `usuario` | VARCHAR(120) NOT NULL | nome do responsável pela ação |
| `data_hora` | TIMESTAMP DEFAULT NOW() | |
| `mudanca` | TEXT NOT NULL | descrição livre da alteração |

---

## 4. Regra de negócio "Passivo Anterior"

Implementada em `src/lib/store.ts → aplicarPassivosAnteriores()` e exposta via
`getPassivosAnteriores()` no `dataService`. Rodar ao carregar a tela do
Encarregado.

Algoritmo:

1. Calcular a **segunda-feira da semana atual** (a semana que contém o dia de
   hoje).
2. Varrer todos os agrupamentos. Se `dia_alocado < segunda_atual` **e**
   `status_corte != 'Cortado'`, então:
   - Zerar `dia_alocado` e `maquina`.
   - Voltar `status_corte` para `Aguardando`.
   - Marcar `is_passivo_anterior = TRUE`.
3. Agrupamentos com `status_corte = 'Cortado'` **permanecem** no dia/semana
   original (histórico verde real de ocupação da máquina).
4. Agrupamentos alocados **na semana vigente** (mesmo que o encarregado
   navegue o calendário para o futuro) **continuam visíveis** nos seus dias,
   porque `dia_alocado >= segunda_atual`.

Na UI do Encarregado, os itens `is_passivo_anterior = true` são renderizados
**no topo** da lista lateral com tag laranja escuro/vermelha
**"PASSIVO ANTERIOR"** em alto contraste.

Recomendação para produção: expor esta rotina como
`POST /api/manutencao/passivos-anteriores` e executá-la também via cron todo
domingo à noite / segunda de manhã.

---

## 5. Estrutura de pastas relevante

```
src/
├── routes/                # Páginas (file-based routing)
│   ├── login.tsx
│   ├── planejador.tsx
│   ├── programador.tsx
│   ├── encarregado.tsx
│   ├── operador.tsx       # layout tablet landscape
│   ├── auditoria.tsx      # apenas planejador/programador
│   └── kpis.tsx           # apenas planejador/programador
├── services/
│   └── dataService.ts     # ← camada única de acesso a dados (plugar SQL aqui)
├── lib/
│   ├── auth.ts            # usuários pré-cadastrados de teste
│   ├── store.ts           # implementação atual (Zustand + localStorage)
│   ├── types.ts           # tipos de domínio
│   ├── seed.ts            # dados de demonstração
│   └── formatters.ts      # helpers de data/hora/semana ISO
├── components/
│   ├── app/               # AppShell, RequireAuth, StatusBadge
│   └── ui/                # shadcn
└── styles.css             # tokens de cor Imetame + animações pulse
```

---

## 6. Credenciais de teste (protótipo)

| Usuário | Senha | Perfil |
| --- | --- | --- |
| `planejador1` | `123` | Planejador |
| `planejador2` | `123` | Planejador Auxiliar |
| `programador1` | `123` | Programador |
| `encarregado1` | `123` | Encarregado |
| `operador1` | `123` | Operador CNC |
| `operador2` | `123` | Operador Reserva |

Em produção estas contas devem ser removidas e a tabela `usuarios` populada
pelo RH/TI, com senhas armazenadas em hash (bcrypt/argon2) e login via
`POST /api/auth/login`.
