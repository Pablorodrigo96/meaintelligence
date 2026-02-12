
# PMI - Pos M&A Integracao

## Objetivo
Criar uma nova pagina/modulo "PMI" (Pos-M&A Integracao) na plataforma, com um playbook completo de atividades de integracao pos-aquisicao. A interface sera hierarquica e expansivel, organizada por disciplinas (Grupos e Frentes), permitindo navegar em niveis de detalhe.

## Estrutura da Pagina

A pagina tera uma hierarquia expansivel em 3 niveis:

1. **Nivel 1 - Grupo** (4 grupos): Planejamento, Backoffice, Frontoffice, Rede e Operacoes
2. **Nivel 2 - Frente/Disciplina** (~17 frentes): PMO, Financeiro, Contabil Fiscal, DHO/DP/Comunicacao, Juridico, Suprimentos, Comercial, Cobranca, MKT Digital, MKT Offline, Operacoes, Projetos, Infra, TI, Satisfacao do Cliente, B2B, Ofertas/Pricing
3. **Nivel 3 - Atividades**: Listadas em tabela com colunas: Area/Tema, Milestone, Atividade, Prazo, Status

Cada nivel sera expansivel via accordion/collapsible, mostrando contadores de atividades e progresso.

## Funcionalidades

- **Accordion expansivel** em cada nivel (Grupo > Frente > lista de atividades)
- **Status por atividade**: Pendente, Em Andamento, Concluido, Bloqueado (editavel pelo usuario)
- **Barra de progresso** em cada Grupo e Frente mostrando % de conclusao
- **Filtros** por: Prazo (D15, D30, D45, D60, D90, D180+), Status, Grupo, Frente
- **Badge com contagem** de atividades por grupo/frente
- **Cores por prazo**: indicacao visual de urgencia (D15 = vermelho, D30 = laranja, D60 = amarelo, D90+ = verde)

## Detalhes Tecnicos

### 1. Banco de Dados
Criar tabela `pmi_activities` com:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `transaction_id` (uuid, nullable - para vincular a uma transacao/deal especifica)
- `group_name` (text) - Planejamento/Backoffice/Frontoffice/Rede e operacoes
- `discipline` (text) - PMO/Financeiro/Contabil Fiscal etc.
- `area` (text) - Area/Tema
- `milestone` (text) - Milestone
- `activity` (text) - Descricao da atividade
- `deadline` (text) - D15/D30/D45/D60/D90/D180+
- `status` (text, default 'pending') - pending/in_progress/completed/blocked
- `notes` (text, nullable)
- `created_at`, `updated_at`

RLS: usuarios gerenciam suas proprias atividades.

### 2. Seed de Dados
Ao acessar o modulo pela primeira vez (ou ao clicar "Iniciar Playbook para [Empresa]"), o sistema carregara todas as ~480 atividades do playbook como registros no banco vinculados ao usuario e opcionalmente a uma transacao.

### 3. Pagina PMI (`src/pages/PMI.tsx`)
- Header com titulo, filtros e barra de progresso geral
- Accordion de Grupos (nivel 1) com badge de contagem e progresso
- Dentro de cada Grupo, accordion de Frentes (nivel 2)
- Dentro de cada Frente, tabela com as atividades (nivel 3)
- Cada atividade tera um dropdown de status editavel
- Dados hardcoded como template inicial, salvos no banco ao iniciar

### 4. Componentes
- `src/pages/PMI.tsx` - Pagina principal
- `src/data/pmi-playbook.ts` - Dados do template com todas as ~480 atividades extraidas da planilha
- `src/components/pmi/PMIGroupAccordion.tsx` - Accordion de nivel 1 (Grupo)
- `src/components/pmi/PMIDisciplineAccordion.tsx` - Accordion de nivel 2 (Frente)
- `src/components/pmi/PMIActivityTable.tsx` - Tabela de atividades
- `src/components/pmi/PMIFilters.tsx` - Filtros
- `src/components/pmi/PMIProgressBar.tsx` - Barra de progresso

### 5. Navegacao
- Adicionar item "PMI" no sidebar entre "Contratos" e "Analise de Risco"
- Icone: `Layers` ou `GitMerge` do lucide-react
- Adicionar rota `/pmi` no App.tsx

### 6. Fluxo do Usuario
1. Usuario acessa /pmi
2. Ve os 4 grupos principais como accordions fechados
3. Expande "Backoffice" -> ve as frentes (Financeiro, Contabil Fiscal, etc.)
4. Expande "Financeiro" -> ve tabela com atividades, prazo, status
5. Altera status de "Pendente" para "Em Andamento" -> salva no banco
6. Barra de progresso atualiza em tempo real

## Sequencia de Implementacao

1. Criar arquivo de dados `pmi-playbook.ts` com todas as atividades da planilha
2. Criar migracao da tabela `pmi_activities` com RLS
3. Criar componentes PMI (filters, progress bar, activity table, accordions)
4. Criar pagina `PMI.tsx`
5. Adicionar rota e item no sidebar
