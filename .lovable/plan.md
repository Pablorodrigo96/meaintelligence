

# PMI - Botoes de Excluir, Editar e Incluir Atividades

## Resumo
Adicionar funcionalidades de CRUD completo na tabela de atividades do PMI: botao para **incluir** nova atividade, botao para **editar** uma atividade existente, e botao para **excluir** uma atividade.

---

## 1. Botao de Incluir Nova Atividade

- Adicionar um botao "Nova Atividade" no topo da secao Playbook (ao lado dos filtros)
- Ao clicar, abre um Dialog/modal com formulario contendo os campos:
  - Grupo (select com PMI_GROUPS)
  - Disciplina (texto)
  - Area/Tema (texto)
  - Milestone (texto)
  - Atividade (texto)
  - Prazo/Deadline (select com DEADLINE_ORDER: D15, D30, D45, D60, D90, D180+)
  - Responsavel (texto, opcional)
  - Data Prazo (date picker, opcional)
- Ao salvar, insere no banco de dados via Supabase e atualiza a lista local

## 2. Botao de Editar Atividade

- Adicionar um icone de edicao (Pencil) em cada linha da tabela, numa coluna "Acoes"
- Ao clicar, abre o mesmo Dialog/modal preenchido com os dados atuais da atividade
- Permite alterar todos os campos (grupo, disciplina, area, milestone, atividade, deadline)
- Ao salvar, atualiza no banco e na lista local

## 3. Botao de Excluir Atividade

- Adicionar um icone de lixeira (Trash2) na mesma coluna "Acoes"
- Ao clicar, exibe um AlertDialog de confirmacao ("Tem certeza que deseja excluir esta atividade?")
- Ao confirmar, remove do banco e da lista local

---

## Detalhes Tecnicos

### Nova coluna na tabela
Adicionar uma coluna "Acoes" ao final da tabela com os icones de Editar e Excluir.

### Componente de Dialog
Criar um componente `PMIActivityDialog.tsx` em `src/components/pmi/` que sera reutilizado para incluir e editar. Ele recebera:
- `open` / `onOpenChange` para controlar visibilidade
- `activity?` (dados existentes para modo edicao, undefined para modo inclusao)
- `onSave` callback

### Funcoes no PMI.tsx
- `addActivity(data)`: insere no banco via Supabase, gera novo id local, atualiza state
- `editActivity(activityId, data)`: atualiza os campos no banco (group_name, discipline, area, milestone, activity, deadline), atualiza state
- `deleteActivity(activityId)`: remove do banco pelo dbId, remove do state

### Icones Lucide
- `Plus` para o botao de nova atividade
- `Pencil` para editar
- `Trash2` para excluir

### Arquivos modificados
- `src/pages/PMI.tsx` -- adicionar botao "Nova Atividade", coluna Acoes, funcoes de CRUD, states para o dialog
- `src/components/pmi/PMIActivityDialog.tsx` (novo) -- formulario modal reutilizavel para criar/editar atividades

### Observacao sobre dados hibridos
Atividades criadas pelo usuario serao salvas apenas no banco (nao no playbook estatico). O sistema precisa carregar atividades do banco como fonte primaria quando o playbook ja esta inicializado, combinando as atividades do playbook estatico com as adicionadas manualmente.

