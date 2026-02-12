

# Correcao: Status e Prazos nao editaveis no PMI

## Problema Identificado

Existem **duas causas raiz**:

### Causa 1 - Textos incompativeis entre banco e codigo
Quando o playbook foi inicializado no banco de dados, as atividades continham o texto "Desktop". Depois, substituimos todas as ocorrencias por "Compradora" no codigo. O sistema faz o match entre banco e codigo comparando o texto exato da atividade (`d.activity === item.activity`), entao **36 atividades** com "Desktop" no banco nao sao encontradas, ficam sem `dbId`, e qualquer tentativa de alterar status ou prazo e silenciosamente ignorada.

### Causa 2 - Closure desatualizada nos callbacks
As funcoes `updateStatus`, `updateDueDate` e `updateResponsible` usam `useCallback` com dependencia em `[activities]`. Ao alterar rapidamente multiplos itens, a referencia ao array `activities` pode estar desatualizada, fazendo o `find()` falhar.

---

## Solucao

### 1. Migracao no banco de dados
Atualizar os textos no banco para substituir "Desktop" por "Compradora" nas atividades ja salvas:

```sql
UPDATE public.pmi_activities
SET activity = REPLACE(activity, 'Desktop', 'Compradora'),
    milestone = REPLACE(milestone, 'Desktop', 'Compradora');
```

### 2. Melhorar a logica de matching
Em vez de depender do texto exato da atividade, usar um Map indexado por `dbId` para acesso direto. Tambem adicionar fallback no matching para lidar com pequenas variacoes.

### 3. Corrigir closures com ref
Usar `useRef` para manter uma referencia sempre atualizada do array `activities`, evitando problemas de closure nos callbacks. Os callbacks passarao a ler de `activitiesRef.current` em vez do valor capturado no closure.

---

## Arquivos modificados

- **`src/pages/PMI.tsx`**:
  - Adicionar `activitiesRef` (useRef) sincronizado com `activities`
  - Alterar `updateStatus`, `updateResponsible`, `updateDueDate` para usar `activitiesRef.current`
  - Remover `[activities]` como dependencia dos callbacks (usar `[]` ja que leem da ref)

- **Migracao SQL**: Atualizar textos existentes no banco

