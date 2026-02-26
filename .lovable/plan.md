

## Plano: Melhorar fluxo de funil — card estático + ações inline + Shortlist completa

### Problema atual

1. **Card "some" ao clicar Shortlist**: O `queryClient.invalidateQueries` causa re-render completo da lista, e o card pode mudar de posição ou o scroll resetar — dando a impressão de "sumir".
2. **Ida e volta entre abas**: O usuário precisa ir para a aba Shortlist para enriquecer com Lusha, depois voltar para os 400 resultados para continuar trabalhando — fluxo confuso.
3. **Falta de fluxo de funil**: O ideal é: Enriquecer → Analisar IA → card fica no lugar → clicar Shortlist → card sai dos resultados e vai para a aba Shortlist com todas as informações.

### Solução

#### 1. Card não desaparece ao enriquecer/analisar — só sai ao clicar Shortlist

Atualizar o estado local **otimisticamente** sem invalidar a query inteira quando o status muda para "saved". O card muda o visual (badge verde "Shortlist ✓") mas permanece na posição até o próximo ciclo.

**Alteração em `recordFeedback`** (~linha 780):
- Ao invés de `queryClient.invalidateQueries`, usar `queryClient.setQueryData` para atualizar o match localmente (otimistic update)
- Isso evita o re-render que causa o "sumiço"

#### 2. Botão Lusha direto no card dos resultados

Adicionar o botão "Enriquecer com Lusha" diretamente no card expandido da aba de Resultados (não apenas na Shortlist). Assim o usuário pode fazer todo o enriquecimento sem trocar de aba.

**Alteração na seção expandida do card** (~linha 3060):
- Adicionar botão Lusha ao lado de "Re-analisar IA" e "Enriquecer" quando `m.status === "saved"`

#### 3. Filtrar cards salvos dos resultados após shortlist

Quando o usuário clica "Shortlist", o card recebe o badge verde e permanece visível por 2 segundos (para feedback visual), depois é filtrado da lista de resultados. O `displayMatches` no tab de resultados passa a excluir `status === "saved"` por padrão, com opção de ver todos via filtro.

**Alteração em `displayMatches`** (linha 1001):
```typescript
const displayMatches = useMemo(() => {
  let result = [...matches];
  // Por padrão na aba results, excluir salvos (foram pra Shortlist)
  if (statusFilter === "all") {
    result = result.filter(m => m.status !== "saved" && m.status !== "dismissed");
  } else if (statusFilter !== "all") {
    result = result.filter(m => m.status === statusFilter);
  }
  // ... resto dos filtros
}, [...]);
```

**Alteração no filtro de Status** (linha 2804):
- Adicionar opção "Ativos" como default (novos + em análise)
- Renomear "Todos" para incluir salvos+dispensados

#### 4. Shortlist com card completo e todas as ações

A aba Shortlist já tem cards razoáveis. Vamos garantir que mostrem **tudo**: Receita, EBITDA, funcionários, badges, seção de contato expandida, sócios, e botão Lusha — exatamente como o card expandido dos resultados.

### Alterações no arquivo

| Local | Alteração |
|-------|-----------|
| `Matching.tsx` ~linha 757 | `updateStatus`: update otimístico via `setQueryData` em vez de `invalidateQueries` |
| `Matching.tsx` ~linha 1001 | `displayMatches`: excluir `saved` e `dismissed` por padrão nos resultados |
| `Matching.tsx` ~linha 2804 | Filtro de status: default "Ativos" (new), opção "Todos" para ver tudo |
| `Matching.tsx` ~linha 3060 | Card expandido: adicionar botão Lusha inline quando status=saved |
| `Matching.tsx` ~linha 3417 | Shortlist tab: garantir card completo com todas as informações e ações |

### Fluxo após a mudança

```text
Resultados (400 leads)
  ├─ Card: Enriquecer → dados de contato aparecem no card
  ├─ Card: Análise IA → insights aparecem no card
  ├─ Card: clica Shortlist → badge verde, card sai da lista
  └─ Card: clica Ignorar → card sai da lista

Shortlist (leads selecionados)
  ├─ Card completo com TODAS as informações
  ├─ Botão Lusha → enriquece inline
  └─ Pode remover da shortlist → volta para Resultados
```

