

## Plano: Criar Apollo Enrich + Integrar no Matching

### Estado atual
- A função `apollo-enrich` **não existe** ainda — precisa ser criada
- O secret `APOLLO_API_KEY` **não está configurado** — precisa ser adicionado
- A linha 1092 do Matching.tsx ainda faz `revenue / 2` (resquício da fórmula antiga)

### Alterações

#### 1. Secret `APOLLO_API_KEY`
Solicitar ao usuário a API key da Apollo.io.

#### 2. Nova Edge Function `supabase/functions/apollo-enrich/index.ts`
- Recebe lista de empresas (nome, estado, cidade, email_domain)
- Para cada empresa, chama `POST https://api.apollo.io/api/v1/mixed_people/search` com **`X-Api-Key` no header** (não na URL)
- Filtra por `person_seniorities: ['owner', 'founder', 'c_suite', 'director']`
- Captura `organization.estimated_num_employees` e `organization.industry`
- Calcula receita: `employees × multiplicador_setor`
- Batch de 10 empresas com delay de 500ms entre batches
- Retorna lista enriquecida

Multiplicadores:
| Setor | R$/funcionário |
|-------|---------------|
| Tech/SaaS | 500.000 |
| Indústria | 400.000 |
| Serviços/Varejo | 180.000 |
| Outros | 200.000 |

#### 3. `supabase/config.toml`
Adicionar `[functions.apollo-enrich] verify_jwt = false`

#### 4. `src/pages/Matching.tsx`
- **Step 2.5** (após deduplicação, antes do scoring ~L1088): chamar `apollo-enrich` com top 200, mergear `revenue` de volta
- **Scoring** (~L1092): substituir `revenue / 2` por uso direto de `buyer.revenue` no cálculo de `capacity_fit`

### Detalhes técnicos

Header da Apollo (conforme instrução do usuário):
```typescript
const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": APOLLO_API_KEY,  // No header, não na URL
  },
  body: JSON.stringify(searchBody),
});
```

Correção do scoring:
```typescript
// ANTES:
const capitalSocial = buyer.revenue ? buyer.revenue / 2 : null;

// DEPOIS:
const buyerRevenue = buyer.revenue || 0;
let capacity_fit = 50;
if (buyerRevenue > 0 && askingPrice > 0) {
  const ratio = buyerRevenue / askingPrice;
  if (ratio >= 10) capacity_fit = 95;
  else if (ratio >= 5) capacity_fit = 85;
  else if (ratio >= 2) capacity_fit = 70;
  else if (ratio >= 1) capacity_fit = 55;
  else capacity_fit = 30;
}
```

### Sequência de implementação
1. Solicitar `APOLLO_API_KEY` ao usuário (aguardar antes de prosseguir)
2. Criar `apollo-enrich/index.ts`
3. Atualizar `Matching.tsx` (step 2.5 + scoring)
4. Deploy da edge function

