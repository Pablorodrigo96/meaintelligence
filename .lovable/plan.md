

# PMI - Dashboard de Acompanhamento + Responsavel e Prazo

## Resumo
Adicionar campos de **Responsavel** e **Data Prazo** em cada atividade do PMI, e criar um **dashboard visual** com graficos e indicadores de acompanhamento no topo da pagina.

---

## 1. Alteracoes no Banco de Dados

Adicionar duas novas colunas na tabela `pmi_activities`:

- `responsible` (text, nullable) -- nome do responsavel pela atividade
- `due_date` (date, nullable) -- data limite para conclusao

Isso permite que o usuario atribua um responsavel e uma data especifica para cada atividade.

---

## 2. Dashboard de Acompanhamento

Serao adicionados cards e graficos visuais acima da lista de atividades, usando a biblioteca Recharts (ja instalada). O dashboard tera:

**Cards de resumo (4 cards):**
- Total de atividades / Concluidas
- % de progresso geral
- Atividades bloqueadas (alerta)
- Atividades vencidas (prazo ultrapassado)

**Graficos:**
- **Grafico de pizza/donut**: distribuicao por status (Pendente, Em Andamento, Concluido, Bloqueado)
- **Grafico de barras**: progresso por Grupo (Planejamento, Backoffice, Frontoffice, Rede e Operacoes)
- **Grafico de barras empilhadas**: distribuicao por prazo (D15, D30, D45, D60, D90, D180+) cruzado com status

---

## 3. Campos na Tabela de Atividades

Adicionar duas novas colunas na tabela de cada atividade:

- **Responsavel**: campo de texto editavel inline (input de texto)
- **Data Prazo**: campo de data editavel (date picker)

As colunas da tabela ficarao: Area/Tema | Milestone | Atividade | Responsavel | Data Prazo | Prazo (D15 etc.) | Status

---

## 4. Navegacao por Abas

A pagina PMI tera duas abas (Tabs):
- **Dashboard**: visao geral com graficos e indicadores
- **Playbook**: a lista de atividades atual com os novos campos

---

## Detalhes Tecnicos

### Migracao SQL
```sql
ALTER TABLE public.pmi_activities
ADD COLUMN responsible text,
ADD COLUMN due_date date;
```

### Arquivos modificados
- `src/pages/PMI.tsx` -- adicionar tabs, dashboard, novos campos na tabela
- `src/data/pmi-playbook.ts` -- nenhuma alteracao necessaria (dados estaticos nao mudam)

### Componentes novos
- Secao de dashboard inline no proprio PMI.tsx com cards + graficos Recharts

### Estado local
- `ActivityState` ganha campos `responsible?: string` e `dueDate?: string`
- Funcoes `updateResponsible` e `updateDueDate` para salvar no banco via Supabase

### Graficos (Recharts)
- `PieChart` para distribuicao por status
- `BarChart` para progresso por grupo
- `BarChart` empilhado para distribuicao prazo x status

