

## Plano: Corrigir erro `column em.opcao_pelo_simples does not exist`

### Problema

A busca de compradores está falhando com erro 500 porque a query SQL referencia `em.opcao_pelo_simples` na tabela `empresas`, mas essa coluna não existe nessa tabela. Na base da Receita Federal, a informação sobre Simples Nacional geralmente fica em uma tabela separada chamada `simples`.

### Causa raiz

Na linha 274 do `national-search/index.ts`, a query seleciona `em.opcao_pelo_simples` da tabela `empresas` (alias `em`), mas essa coluna não pertence a essa tabela.

### Solução

Remover a referência a `opcao_pelo_simples` da query SQL e ajustar a lógica de estimativa de receita para funcionar sem esse dado. A coluna não é crítica — ela é usada apenas como "camada 1" na função `estimateRevenue` para identificar empresas do Simples Nacional. Sem ela, o sistema usará as camadas 2 e 3 (baseadas em porte e capital social), que já são suficientes para estimar receita.

### Alterações

#### 1. `supabase/functions/national-search/index.ts` — Query SQL (linha 274)

Remover `em.opcao_pelo_simples` do SELECT:

```sql
-- ANTES:
em.porte_empresa,
em.opcao_pelo_simples

-- DEPOIS:
em.porte_empresa
```

#### 2. `supabase/functions/national-search/index.ts` — Mapeamento de resultados (linha ~309)

Passar `null` em vez de `row.opcao_pelo_simples` para `estimateRevenue`:

```typescript
// ANTES:
revenue: estimateRevenue(row.opcao_pelo_simples, row.porte_empresa, ...)

// DEPOIS:
revenue: estimateRevenue(null, row.porte_empresa, ...)
```

### Impacto

- A estimativa de receita para empresas do Simples Nacional será um pouco menos precisa (usará a lógica de porte/capital social em vez do teto do Simples), mas a busca voltará a funcionar
- Todas as outras funcionalidades (scoring, Apollo, Lusha, Shortlist) não são afetadas

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `national-search/index.ts` linha 274 | Remover `em.opcao_pelo_simples` do SELECT |
| `national-search/index.ts` linha ~309 | Passar `null` para `opcaoSimples` no `estimateRevenue` |

