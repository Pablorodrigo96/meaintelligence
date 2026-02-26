

## Plano: Receita por regime tributário (Simples Nacional) + EBITDA + LinkedIn dos sócios

### Correção do usuário

O campo `porte_empresa` da Receita Federal (00, 01, 03, 05) **não é** o regime tributário. Empresas LTDA, S/A, qualquer natureza jurídica podem estar no Simples Nacional. O que define é o campo `opcao_pelo_simples` na tabela `empresas` do banco da RF (valores 'S'/'N'/nulo).

Capital social **não serve** para estimar funcionários — são coisas completamente independentes.

### Alterações

#### 1. `national-search/index.ts` — Query e estimativa de receita/EBITDA

**Query**: Adicionar `em.opcao_pelo_simples` ao SELECT (linha 214), pois é esse campo que indica se a empresa está no Simples Nacional.

**Nova função `estimateRevenue`**:

| Camada | Lógica |
|--------|--------|
| 1 — Regime tributário | Se `opcao_pelo_simples = 'S'` → fatura ≤ R$4.8M (teto legal do Simples). Estimar ~R$3.5M como média, ajustável por setor |
| 2 — Presumido/Real | Se `opcao_pelo_simples != 'S'` (ou 'N'/nulo) → fatura > R$4.8M. Usar porte + setor para estimar faixa |
| 3 — Ajuste por setor | Multiplicador setorial sobre capital social apenas para empresas fora do Simples (porte 05/Demais) |

Nota: O teto legal do Simples é R$4.8M, mas considerando que muitos sonegam um pouco, usamos ~R$7M como teto prático conforme orientação do usuário.

**Nova função `estimateEbitda`**: `revenue * ebitda_margin_setor` usando benchmarks setoriais.

**Mapping de retorno** (linhas 247-248): Substituir `capitalSocial * 2` por `estimateRevenue(row.opcao_pelo_simples, row.porte_empresa, row.cnae_fiscal_principal, capitalSocial)` e `estimateEbitda(revenue, cnae)`.

#### 2. `company-enrich/index.ts` — LinkedIn dos sócios

- Trocar modelo `sonar` → `sonar-pro` (linha 140) para melhor precisão com citações
- Adicionar Camada 3b: prompt dedicado por sócio para busca individual de LinkedIn
- Fallback: se não encontrar perfil direto, gerar URL de busca LinkedIn pré-preenchida: `https://www.linkedin.com/search/results/people/?keywords=Nome+Empresa`

### Detalhes técnicos

```typescript
// Benchmarks setoriais
const SECTOR_BENCHMARKS: Record<string, { rev_per_employee: number; ebitda_margin: number }> = {
  "Technology":    { rev_per_employee: 500_000, ebitda_margin: 0.25 },
  "Retail":        { rev_per_employee: 200_000, ebitda_margin: 0.05 },
  "Manufacturing": { rev_per_employee: 250_000, ebitda_margin: 0.12 },
  "Healthcare":    { rev_per_employee: 180_000, ebitda_margin: 0.15 },
  "Logistics":     { rev_per_employee: 200_000, ebitda_margin: 0.08 },
  "Finance":       { rev_per_employee: 400_000, ebitda_margin: 0.20 },
  "Education":     { rev_per_employee: 120_000, ebitda_margin: 0.18 },
  "Real Estate":   { rev_per_employee: 250_000, ebitda_margin: 0.15 },
  "Energy":        { rev_per_employee: 350_000, ebitda_margin: 0.18 },
  "Telecom":       { rev_per_employee: 300_000, ebitda_margin: 0.20 },
  "Agribusiness":  { rev_per_employee: 300_000, ebitda_margin: 0.15 },
  "Other":         { rev_per_employee: 150_000, ebitda_margin: 0.10 },
};

function estimateRevenue(
  opcaoSimples: string | null,
  porte: string | null,
  cnae: string | null,
  capitalSocial: number | null
): number | null {
  const sector = mapCnaeToSector(cnae);

  // Camada 1: Simples Nacional → teto prático R$7M
  if (opcaoSimples === "S") {
    // Média estimada com margem de sonegação
    // Micro tende a faturar menos, EPP mais próximo do teto
    const p = (porte || "").trim();
    if (p === "01") return 1_500_000;   // Micro: ~R$1.5M média
    if (p === "03") return 5_000_000;   // EPP: ~R$5M média
    return 3_500_000;                   // Default Simples: ~R$3.5M
  }

  // Camada 2: Presumido/Real (fora do Simples) → piso R$7M
  const p = (porte || "").trim();
  if (p === "05" && capitalSocial && capitalSocial > 0) {
    // Multiplicador setorial sobre capital social, com piso de R$7M
    const multipliers: Record<string, number> = {
      "Technology": 8, "Finance": 5, "Healthcare": 4,
      "Retail": 6, "Manufacturing": 2.5, "Energy": 1.5,
      "Real Estate": 1.5, "Logistics": 3, "Education": 4,
      "Telecom": 2, "Agribusiness": 2, "Other": 3,
    };
    const mult = multipliers[sector] || 3;
    return Math.max(capitalSocial * mult, 7_000_000);
  }

  // Porte desconhecido mas fora do Simples
  if (capitalSocial && capitalSocial > 100_000) {
    return Math.max(capitalSocial * 3, 7_000_000);
  }

  return 7_000_000; // Default fora do Simples
}

function estimateEbitda(revenue: number | null, cnae: string | null): number | null {
  if (!revenue) return null;
  const sector = mapCnaeToSector(cnae);
  const bench = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS["Other"];
  return Math.round(revenue * bench.ebitda_margin);
}
```

Query atualizada (adicionar `opcao_pelo_simples`):
```sql
SELECT DISTINCT ON (e.cnpj_basico)
  ...,
  em.porte_empresa,
  em.opcao_pelo_simples    -- NOVO
FROM estabelecimentos e
INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
```

LinkedIn fallback por sócio:
```typescript
// Para cada sócio sem LinkedIn, gerar URL de busca
for (const owner of owners) {
  if (!owner.linkedin) {
    owner.linkedin = `https://www.linkedin.com/search/results/people/?keywords=${
      encodeURIComponent(owner.name + " " + company_name)
    }`;
    owner.linkedin_is_search = true; // flag para UI diferenciar link direto vs busca
  }
}
```

### Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| `national-search/index.ts` | Adicionar `em.opcao_pelo_simples` ao SELECT |
| `national-search/index.ts` | Nova função `estimateRevenue()` baseada em regime tributário (Simples S/N) |
| `national-search/index.ts` | Nova função `estimateEbitda()` usando margem setorial |
| `national-search/index.ts` | Tabela `SECTOR_BENCHMARKS` com rev_per_employee e ebitda_margin |
| `company-enrich/index.ts` | Trocar `sonar` → `sonar-pro` |
| `company-enrich/index.ts` | Prompt dedicado por sócio para LinkedIn |
| `company-enrich/index.ts` | Fallback com URL de busca LinkedIn quando perfil não encontrado |

