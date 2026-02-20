
## Problema Real: 25 CNPJs da Mesma Empresa

### Diagnóstico Definitivo

**Causa 1 — Sem deduplicação por empresa no BD:**
A query do `national-search` faz `INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico`. A tabela `estabelecimentos` tem uma linha por filial/estabelecimento. A Telefônica tem centenas de estabelecimentos ativos no RS (cada agência, torre, ponto de presença = 1 linha). Com `LIMIT 80` sem `GROUP BY cnpj_basico`, os 80 resultados são todos estabelecimentos da mesma empresa. No frontend, o `scoreCompanyLocal` recebe 80 Telefônicas e ordena as top 25 — todas Telefônica.

**Causa 2 — CNAE `61` inclui gigantes sem filtro de capital:**
"Provedor de internet" mapeia para CNAE `61xx` (Telecom). Sem `buyer_revenue_brl` informado (o usuário não digitou faturamento no campo de linguagem natural), `max_capital_social` fica `null`. A ordenação cai para `ORDER BY em.capital_social DESC NULLS LAST` — e a Telefônica (capital social bilionário) domina o topo.

**Causa 3 — Deduplicação ausente também no frontend:**
Mesmo que viessem 80 empresas diferentes do BD, o scoring local não tem lógica de deduplicação por `cnpj_basico` (empresa-mãe).

---

### Três Correções Cirúrgicas

---

**Correção 1 — Deduplicação por `cnpj_basico` na query do BD (mais importante)**

Trocar a query atual para selecionar apenas **1 estabelecimento por empresa** (`DISTINCT ON (e.cnpj_basico)`), pegando o estabelecimento sede (ou o mais relevante por tipo):

```sql
-- ANTES: retorna múltiplos estabelecimentos da mesma empresa
SELECT e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv, ...
FROM estabelecimentos e
INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
WHERE ...
ORDER BY em.capital_social DESC

-- DEPOIS: 1 empresa = 1 resultado (deduplicado)
SELECT DISTINCT ON (e.cnpj_basico) 
  e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv, ...
FROM estabelecimentos e
INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
WHERE ...
ORDER BY e.cnpj_basico, [critério de proximidade de capital]
```

`DISTINCT ON (e.cnpj_basico)` garante que cada empresa apareça **1 única vez**, independente de quantos estabelecimentos tenha. O `ORDER BY` dentro do `DISTINCT ON` controla qual estabelecimento representa a empresa (o mais relevante por localização/tipo).

Esta única mudança elimina o problema dos 25 Telefônicas.

---

**Correção 2 — Filtro de capital social padrão para Telecom (e outros setores com gigantes)**

Quando o usuário pesquisa por provedor de internet/telecom sem informar faturamento, não há âncora para calcular `max_capital_social`. A solução é adicionar **caps de capital por setor** no `national-search`:

```typescript
// Capital social máximo padrão por setor (evita gigantes sem âncora de buyer)
const SECTOR_DEFAULT_MAX_CAPITAL: Record<string, number> = {
  "Telecom": 50_000_000,      // R$50M — exclui Vivo/Claro/TIM (capital >R$1B)
  "Finance": 100_000_000,     // R$100M — exclui Itaú, Bradesco
  "Energy": 200_000_000,      // R$200M — exclui Petrobras, Eletrobras
  "Manufacturing": 500_000_000,
  // outros setores: sem cap padrão (são mais fragmentados)
};
```

Se `max_capital_social` não vier do body **e** o setor tiver um cap padrão, aplicar automaticamente. Isso garante que provedores regionais de internet (capital R$50K–R$10M) apareçam, e não a Vivo.

---

**Correção 3 — Deduplicação adicional no frontend por `cnpj_basico`**

Como camada extra de segurança, antes do `scoreCompanyLocal`, adicionar deduplicação no `runMatchMutation`:

```typescript
// Deduplicar por empresa-mãe (cnpj_basico = primeiros 8 dígitos do CNPJ)
const dedupedCompanies = companiesToAnalyze.reduce((acc: any[], company: any) => {
  const baseCnpj = String(company.cnpj || "").replace(/\D/g, "").substring(0, 8);
  if (!baseCnpj || acc.some(c => String(c.cnpj || "").replace(/\D/g, "").substring(0, 8) === baseCnpj)) {
    return acc; // duplicata: pula
  }
  return [...acc, company];
}, []);
```

Isso garante que mesmo se o BD retornar 2-3 estabelecimentos da mesma empresa (por bug ou race condition), o frontend exibirá apenas 1.

---

### Mudança no KEYWORD_MAP: Telecom → Provedores Regionais

O CNAE `61` engloba tanto a Vivo (grande) quanto provedores regionais (pequenos). Uma melhoria adicional: separar "provedor de internet" de "telecom grande" no keyword map:

```typescript
// ANTES (um único entry para telecom):
{ keywords: ["telecom", "telecomunicações", "internet", "fibra", "provedor"], 
  cnae_prefixes: ["61"], sector: "Telecom" }

// DEPOIS (dois entries com prioridade):
{ keywords: ["provedor de internet", "isp", "fibra óptica", "internet residencial", "internet empresarial"],
  cnae_prefixes: ["6110", "6120", "6130", "6141", "6142", "6143", "6190"],  // CNAE 4 dígitos mais específico
  sector: "Telecom", subtype: "ISP",
  default_max_capital: 50_000_000 },
{ keywords: ["telecom", "telecomunicações"],
  cnae_prefixes: ["61"], sector: "Telecom", subtype: "Telecom" },
```

Isso permite distinguir um provedor regional de internet (CNAE 6141-6/00, 6142-4/00) de uma operadora nacional.

---

### Resumo das Mudanças por Arquivo

**1. `supabase/functions/national-search/index.ts`**
- Adicionar `DISTINCT ON (e.cnpj_basico)` na query SQL — garante 1 resultado por empresa
- Adicionar `SECTOR_DEFAULT_MAX_CAPITAL`: caps de capital automáticos por setor quando `max_capital_social` não for informado
- Ajustar o `ORDER BY` para ser compatível com `DISTINCT ON`: `ORDER BY e.cnpj_basico, ABS(...) ASC`
- Aumentar `effectiveLimit` para `200` quando há deduplicação (para compensar o filtro `DISTINCT`)

**2. `src/pages/Matching.tsx`**
- Adicionar deduplicação por `cnpj_basico` no `runMatchMutation` antes do scoring (Correção 3)
- Melhorar `KEYWORD_MAP`: separar "provedor de internet/ISP" de "telecom" com CNAE 4 dígitos mais específicos
- Adicionar `default_max_capital` por entrada do `KEYWORD_MAP`, passado como `max_capital_social` para o `national-search` quando `buyer_revenue_brl` não for informado
