
# Melhorias no Modulo Due Diligence -- Busca, Filtros e Controles

Aplicar ao modulo de Due Diligence as mesmas melhorias ja implementadas no PMI: busca textual, filtros avancados, controles de expansao, exportacao CSV, indicadores de atraso e card de proximas vencidas.

---

## 1. Busca por texto no Checklist
Adicionar campo de busca textual no componente `DDChecklist` para filtrar itens por nome, descricao ou responsavel. Com ~70 itens, a navegacao fica mais agil.

## 2. Filtros por Status e Severidade
Adicionar dois filtros `Select` no topo do checklist:
- **Status**: Pendente, Em Analise, Aprovado, Alerta, N/A
- **Severidade**: Baixa, Media, Alta, Critica

Ambos com opcao "Todos" para limpar o filtro.

## 3. Expandir/Recolher Todos
Botoes "Expandir Todos" e "Recolher Todos" para as 8 categorias do Accordion no `DDChecklist`. Atualmente o Accordion abre todas por padrao -- os botoes permitem controle rapido.

## 4. Exportar Checklist para CSV
Botao para exportar o checklist filtrado (categoria, item, severidade, status, responsavel, data limite, notas) como arquivo CSV.

## 5. Card de "Proximos Vencimentos" no Dashboard
Adicionar ao `DDDashboard` um card listando os 10 proximos itens com `due_date` que ainda nao estao aprovados/N-A, ordenados por data.

## 6. Indicador visual de atraso no Checklist
Itens com `due_date` ultrapassada e status diferente de "approved"/"na" recebem destaque visual (fundo vermelho claro + icone de alerta).

## 7. Filtro por categoria no Data Room
Adicionar filtro por categoria na listagem de documentos do `DDDataRoom`, para encontrar rapidamente documentos de uma area especifica.

---

## Detalhes Tecnicos

### Arquivos a modificar

- **`src/components/dd/DDChecklist.tsx`**
  - Adicionar estados: `searchText`, `filterStatus`, `filterSeverity`, `expandedCategories`
  - Substituir Accordion `defaultValue` por valor controlado via `expandedCategories`
  - Adicionar barra de filtros: Input de busca + 2 Selects (status, severidade) + botoes expandir/recolher + botao exportar CSV
  - Filtrar `items` via `useMemo` antes de renderizar por categoria
  - Indicador de atraso: condicional `due_date < today && status !== "approved" && status !== "na"`
  - Funcao `exportCSV()` client-side

- **`src/components/dd/DDDashboard.tsx`**
  - Adicionar card "Proximos Vencimentos" ao lado da timeline
  - Filtrar `checklistItems` com `due_date` futuro ou passado, status pendente, ordenar por data, limitar a 10

- **`src/components/dd/DDDataRoom.tsx`**
  - Adicionar estado `filterCategory` com Select de categorias
  - Filtrar `documents` por categoria selecionada antes de renderizar

### Sem migracoes SQL necessarias
Todos os campos ja existem na tabela. As melhorias sao puramente frontend.
