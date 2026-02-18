
# Melhorias no Modulo PMI

Analisei o modulo PMI completo e identifiquei as seguintes melhorias organizadas por prioridade:

---

## 1. Busca por texto nas atividades
Atualmente so existe filtro por prazo e status. Adicionar um campo de busca textual para encontrar atividades rapidamente por nome, area, milestone ou responsavel -- essencial com ~480 atividades.

## 2. Filtro por Grupo e Disciplina
Alem de prazo e status, permitir filtrar por grupo (Planejamento, Backoffice, Frontoffice, etc.) e por disciplina (PMO, Financeiro, Juridico, etc.), facilitando a navegacao focada.

## 3. Expandir/Recolher Todos
Botoes "Expandir Todos" e "Recolher Todos" para os grupos e disciplinas. Com 17 disciplinas, abrir um por um e tedioso.

## 4. Exportar para CSV/Excel
Botao para exportar o playbook filtrado (com status, responsavel e data prazo) para CSV. Util para compartilhar progresso com stakeholders que nao usam o app.

## 5. Dashboard: card de "Proximas Vencidas"
No dashboard, adicionar um card/lista mostrando as 5-10 proximas atividades por data prazo que ainda nao estao concluidas -- funciona como alerta de prioridade.

## 6. Indicador visual de atraso na tabela
Na tabela do playbook, destacar visualmente (icone ou cor vermelha na data) as atividades com data prazo ultrapassada que nao estao concluidas.

## 7. Notas/Comentarios por atividade
Campo para adicionar notas ou comentarios em cada atividade, registrando decisoes, pendencias ou observacoes durante a integracao.

---

## Detalhes Tecnicos

### Arquivos a modificar
- `src/pages/PMI.tsx` -- adicionar campo de busca, filtros extras, botoes expandir/recolher, indicador de atraso, exportar CSV
- `src/components/pmi/PMIDashboard.tsx` -- adicionar card de proximas vencidas
- `src/components/pmi/PMIActivityDialog.tsx` -- adicionar campo de notas
- Migracao SQL -- adicionar coluna `notes` na tabela `pmi_activities`

### Implementacao
1. **Migracao**: `ALTER TABLE pmi_activities ADD COLUMN notes text;`
2. **Busca textual**: filtro local via `useMemo` no array `filteredPlaybook`, sem mudanca no banco
3. **Filtros extras**: dois `Select` adicionais para grupo e disciplina na barra de filtros
4. **Expandir/Recolher**: dois botoes que manipulam os sets `expandedGroups` e `expandedDisciplines`
5. **Exportar CSV**: funcao client-side que converte o playbook filtrado em CSV e dispara download
6. **Card de vencidas**: novo componente dentro do Dashboard que ordena por `dueDate` e mostra as proximas pendentes
7. **Indicador de atraso**: comparacao `dueDate < today && status !== "completed"` com estilizacao condicional
8. **Campo de notas**: textarea no dialog + update no banco via `updateNotes` similar ao `updateResponsible`
