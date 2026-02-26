

## Plano: Integrar Apollo.io para estimativa de faturamento baseada em funcionários

### Contexto

Atualmente o faturamento é estimado apenas pelo regime tributário (Simples/Presumido) e capital social — sem dado real de funcionários. A Apollo.io fornece `estimated_num_employees` por empresa, permitindo uma estimativa muito mais precisa: **Funcionários × Multiplicador Setorial**.

### Arquitetura proposta

O fluxo de matching passará a ter uma etapa intermediária entre a busca na RF e o scoring:

```text
RF (national-search) → Apollo Enrichment → Scoring → Resultados
     50M+ registros       Top 200 empresas     Buyer Fit Score
```

### Alterações

#### 1. Novo secret: `APOLLO_API_KEY`

Será necessário configurar a API key da Apollo.io como secret do projeto.

#### 2. Nova Edge Function: `supabase/functions/apollo-enrich/index.ts`

Função dedicada que recebe uma lista de empresas e retorna dados enriquecidos da Apollo:

- **Endpoint**: `POST https://api.apollo.io/api/v1/mixed_people/search`
- **Filtros**: `person_seniorities: ['owner', 'founder', 'c_suite', 'director']` para identificar decisores
- **Dados capturados por empresa**:
  - `organization.estimated_num_employees` (número de funcionários)
  - `organization.industry` (setor Apollo)
  - `organization.website_url` (website)
  - `organization.linkedin_url` (LinkedIn da empresa)
  - Nomes e cargos dos decisores encontrados
- **Lógica de busca**: Para cada empresa, buscar pelo domínio do email (se disponível da RF) ou pelo nome da empresa + localização
- **Rate limiting**: Processar em batches de 10, com delay de 500ms entre batches para respeitar limites da API
- **Cálculo de faturamento**:

| Setor Apollo | Multiplicador/funcionário |
|-------------|--------------------------|
| Technology / SaaS | R$500.000 |
| Manufacturing / Industrial | R$400.000 |
| Services / Retail | R$180.000 |
| Outros | R$200.000 |

Fórmula: `revenue_apollo = estimated_num_employees × multiplicador_setor`

- **Retorno**: Lista de empresas com `revenue_apollo`, `employee_count`, `apollo_industry`, decisores encontrados

#### 3. Atualizar `src/pages/Matching.tsx` — Novo Step entre busca e scoring

Após o Step 2 (national-search) e antes do Step 3 (scoring), adicionar:

**Step 2.5 — Apollo Enrichment** (linhas ~1077-1090):
- Pegar os top 200 compradores (já deduplicados)
- Chamar `apollo-enrich` com a lista de nomes/CNPJs/emails
- Para empresas que a Apollo encontrar: substituir `revenue` pelo valor calculado (`employees × multiplicador`)
- Para empresas sem match na Apollo: manter a estimativa atual (regime tributário)
- Atualizar `progressStep` para mostrar progresso ao usuário

**Step 3 — Scoring** (linha ~1092):
- No cálculo de `capacity_fit`, usar `buyer.revenue` (que agora pode vir da Apollo) em vez de tentar reverter `capitalSocial` (linha 1092: `const capitalSocial = buyer.revenue ? buyer.revenue / 2 : null`)
- Remover a linha 1092 que faz `revenue / 2` — isso era resquício da fórmula antiga `capital * 2`

#### 4. Atualizar `national-search/index.ts` — Manter estimativa como fallback

A estimativa por regime tributário (Simples/Presumido) continua como fallback para quando a Apollo não encontrar a empresa. Nenhuma alteração necessária neste arquivo.

### Detalhes técnicos

**Edge Function `apollo-enrich/index.ts`:**

```typescript
// Multiplicadores por setor
const APOLLO_SECTOR_MULTIPLIERS: Record<string, number> = {
  "information technology and services": 500_000,
  "computer software": 500_000,
  "internet": 500_000,
  "saas": 500_000,
  "manufacturing": 400_000,
  "industrial automation": 400_000,
  "machinery": 400_000,
  "retail": 180_000,
  "consumer services": 180_000,
  "hospitality": 180_000,
  "food & beverages": 180_000,
};
const DEFAULT_MULTIPLIER = 200_000;

// Para cada empresa, buscar na Apollo por nome + localização
for (const company of companies) {
  const searchBody = {
    person_seniorities: ["owner", "founder", "c_suite", "director"],
    organization_locations: [company.state ? `${company.state}, Brazil` : "Brazil"],
    q_organization_name: company.name,
    per_page: 5,
  };

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": APOLLO_API_KEY,
    },
    body: JSON.stringify(searchBody),
  });

  // Extrair org data do primeiro resultado
  const org = data.people?.[0]?.organization;
  if (org?.estimated_num_employees) {
    const industry = (org.industry || "").toLowerCase();
    const multiplier = APOLLO_SECTOR_MULTIPLIERS[industry] || DEFAULT_MULTIPLIER;
    company.revenue_apollo = org.estimated_num_employees * multiplier;
    company.employee_count = org.estimated_num_employees;
    company.apollo_industry = org.industry;
  }
}
```

**Matching.tsx — Step 2.5:**

```typescript
// Step 2.5: Apollo enrichment for top candidates
setProgressStep(2.5);
const topCandidates = uniqueBuyers.slice(0, 200);
const { data: apolloData } = await supabase.functions.invoke("apollo-enrich", {
  body: { companies: topCandidates.map(c => ({
    name: c.name, state: c.state, city: c.city,
    email_domain: c.email?.split("@")[1] || null,
  })) },
});

// Merge Apollo data back
if (apolloData?.enriched) {
  for (const enriched of apolloData.enriched) {
    const match = topCandidates.find(c => c.name === enriched.name);
    if (match && enriched.revenue_apollo) {
      match.revenue = enriched.revenue_apollo; // Override with Apollo estimate
      match.employee_count = enriched.employee_count;
      match.apollo_enriched = true;
    }
  }
}
```

**Correção no scoring (linha 1092):**
```typescript
// ANTES (errado):
const capitalSocial = buyer.revenue ? buyer.revenue / 2 : null;
const actualCapital = capitalSocial ? capitalSocial : null;

// DEPOIS (correto):
const buyerRevenue = buyer.revenue || 0;
// Capacity fit baseado em receita vs asking price
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

### Config

```toml
[functions.apollo-enrich]
verify_jwt = false
```

### Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| **Novo secret** | `APOLLO_API_KEY` — chave da API Apollo.io |
| **Nova função** `apollo-enrich/index.ts` | Busca empresas na Apollo, calcula receita por funcionários × multiplicador setorial |
| `supabase/config.toml` | Adicionar `[functions.apollo-enrich]` |
| `src/pages/Matching.tsx` ~L1077 | Novo Step 2.5: chamar `apollo-enrich` nos top 200 antes do scoring |
| `src/pages/Matching.tsx` ~L1092 | Corrigir `capacity_fit` para usar receita direta em vez de `revenue / 2` |

