
## Reestruturação do Matching: IA Apenas para Enriquecimento Individual

### Diagnóstico do Problema de Custo

Hoje a IA é chamada em **3 momentos** a cada busca, sendo 2 deles desnecessários e caros:

**Chamada 1 — `parse-intent` (LLM para extrair CNAE do texto):**
Usa um LLM completo apenas para mapear texto como "consultoria financeira" → CNAE prefixes `["69", "70"]`. Esse mapeamento é 100% determinístico e pode ser feito com um simples lookup de palavras-chave em código.

**Chamada 2 — `type: "match"` com 25 empresas (o maior custo):**
O `ai-analyze` recebe 25 empresas completas com todos os dados e pede ao LLM que gere, para cada uma: `analysis`, `dimensions` (5 scores), `dimension_explanations` (5 textos), `strengths` (2-3 itens), `weaknesses` (2-3 itens), `recommendation`. Isso representa centenas de tokens de OUTPUT por empresa × 25 empresas = payload massivo a cada busca. Toda essa pontuação pode ser feita deterministicamente.

**Chamada 3 — `company-deep-dive` quando o usuário clica em "Aprofundar":**
IA enriquece UMA empresa específica com dados da BrasilAPI. Este é o **uso legítimo** — IA a pedido, sobre dado específico, gerando valor real.

---

### A Nova Arquitetura: 100% Determinístico → IA Sob Demanda

```text
ANTES (3 chamadas de IA por busca):
NL Text → [LLM parse-intent] → filtros
                                  ↓
national-search → 80 empresas → [LLM 25 empresas] → scores + análises
                                                         ↓
                                              Usuário clica → [LLM deep-dive]

DEPOIS (0 chamadas de IA na busca, 1 sob demanda):
NL Text → [lookup determinístico] → filtros
                                  ↓
national-search → 80 empresas → [pré-score determinístico] → top 15 exibidos
                                                         ↓
                                 Usuário clica "Ver análise IA" → [LLM deep-dive]
```

---

### Mudanças Concretas por Arquivo

---

**1. `src/pages/Matching.tsx` — Substituir `parse-intent` por lookup local**

A função `parseIntent()` (linha 638) hoje chama `ai-analyze` via Supabase. Será substituída por uma função local em TypeScript que faz lookup de palavras-chave:

```typescript
// ANTES: chamada de IA
const { data } = await supabase.functions.invoke("ai-analyze", {
  body: { type: "parse-intent", data: { text: nlText } },
});

// DEPOIS: lookup local, zero custo, zero latência
function parseIntentLocal(text: string): ParsedIntent {
  const lower = text.toLowerCase();
  
  const KEYWORD_MAP = [
    { keywords: ["consultoria financeira", "gestão financeira", "assessoria financeira", "bpo financeiro"],
      cnae_prefixes: ["69", "70"], sector: "Finance", subtype: "Consulting" },
    { keywords: ["banco", "financeira", "crédito", "empréstimo"],
      cnae_prefixes: ["64"], sector: "Finance", subtype: "Banking" },
    { keywords: ["seguro", "previdência", "seguradora"],
      cnae_prefixes: ["65"], sector: "Finance", subtype: "Insurance" },
    { keywords: ["software", "tecnologia", "ti ", "sistemas", "saas", "startup de tech"],
      cnae_prefixes: ["62", "63"], sector: "Technology", subtype: "Software" },
    { keywords: ["saúde", "clínica", "hospital", "farmácia", "laboratório"],
      cnae_prefixes: ["86", "87", "88"], sector: "Healthcare", subtype: "Health" },
    { keywords: ["educação", "escola", "ensino", "cursos", "treinamento"],
      cnae_prefixes: ["85"], sector: "Education", subtype: "Education" },
    { keywords: ["construção", "incorporação", "obra", "imóvel"],
      cnae_prefixes: ["41", "42", "43"], sector: "Real Estate", subtype: "Construction" },
    { keywords: ["logística", "transporte", "frete", "distribuição"],
      cnae_prefixes: ["49", "50", "51", "52"], sector: "Logistics", subtype: "Logistics" },
    { keywords: ["comércio", "varejo", "loja", "venda"],
      cnae_prefixes: ["45", "46", "47"], sector: "Retail", subtype: "Retail" },
    { keywords: ["agro", "agricultura", "pecuária", "fazenda"],
      cnae_prefixes: ["01", "02", "03"], sector: "Agribusiness", subtype: "Agro" },
    { keywords: ["energia", "elétrica", "solar", "geração"],
      cnae_prefixes: ["35"], sector: "Energy", subtype: "Energy" },
    { keywords: ["telecom", "telecomunicações", "internet", "fibra"],
      cnae_prefixes: ["61"], sector: "Telecom", subtype: "Telecom" },
  ];

  // Extrair faturamento: "fatura 5M", "faturamento de 2 milhões", "R$3mi"
  const revenueMatch = lower.match(/r?\$?\s*(\d+[\.,]?\d*)\s*(m|mi|milhão|milhões|k|mil|b|bi|bilh)/i);
  let buyerRevenueBrl: number | null = null;
  if (revenueMatch) {
    const val = parseFloat(revenueMatch[1].replace(",", "."));
    const unit = revenueMatch[2].toLowerCase();
    if (unit.startsWith("b")) buyerRevenueBrl = val * 1e9;
    else if (unit.startsWith("m")) buyerRevenueBrl = val * 1e6;
    else if (unit.startsWith("k") || unit.startsWith("mil")) buyerRevenueBrl = val * 1e3;
  }

  const matched = KEYWORD_MAP.find(entry =>
    entry.keywords.some(kw => lower.includes(kw))
  );

  const maxCapital = buyerRevenueBrl ? buyerRevenueBrl * 0.5 : null;
  const minCapital = 10_000;

  return {
    target_sector: matched?.sector || null,
    cnae_prefixes: matched?.cnae_prefixes || [],
    cnae_subtype: matched?.subtype || null,
    target_size: lower.includes("startup") ? "Startup" : lower.includes("pequen") ? "Small" : lower.includes("médi") ? "Medium" : "Small",
    buyer_revenue_brl: buyerRevenueBrl,
    max_capital_social_brl: maxCapital,
    min_capital_social_brl: minCapital,
    intent: lower.includes("adquir") || lower.includes("comprar") ? "acquisition" : lower.includes("parceri") ? "partnership" : "acquisition",
    human_readable_summary: `${matched?.subtype || matched?.sector || "Empresa"} (CNAE ${matched?.cnae_prefixes?.map(p => `${p}xx`).join("/") || "N/A"}) · ${buyerRevenueBrl ? `Capital até R$${(maxCapital! / 1e6).toFixed(1)}M` : ""}`,
  };
}
```

**2. `src/pages/Matching.tsx` — Substituir LLM de matching por scoring determinístico local**

O `runMatchMutation` (linha 332) hoje chama `ai-analyze` type `"match"` e recebe análise completa de 25 empresas. Será reescrito para:

1. Buscar as empresas via `national-search` (mantém, sem IA)
2. Aplicar o pré-score determinístico **localmente no frontend** (já existe a lógica no `ai-analyze`, só move para o cliente)
3. Calcular os 5 scores de dimensão deterministicamente (setor, porte, estado, capital, CNAE)
4. Calcular `compatibility_score` com os pesos por perfil de investidor
5. Exibir os resultados **sem chamar LLM nenhum**

O score determinístico funciona assim:
```typescript
function scoreCompany(company, criteria, investorProfile, cnae_prefixes) {
  // sector_fit
  const sectorExact = company.sector === criteria.target_sector;
  const sectorAdjacent = SECTOR_ADJACENCY[criteria.target_sector]?.includes(company.sector);
  const cnaeBonus = cnae_prefixes.some(p => company.description?.includes(`CNAE: ${p}`));
  const sector_fit = sectorExact ? 90 : sectorAdjacent ? 65 : cnaeBonus ? 70 : 30;

  // size_fit
  const sizeOrder = ["Startup","Small","Medium","Large","Enterprise"];
  const diff = Math.abs(sizeOrder.indexOf(company.size) - sizeOrder.indexOf(criteria.target_size));
  const size_fit = diff === 0 ? 95 : diff === 1 ? 75 : diff === 2 ? 50 : 25;

  // location_fit
  const location_fit = company.state === criteria.target_state ? 90 : 50;

  // financial_fit (sem dados = neutro)
  const financial_fit = company.revenue ? 65 : 50;

  // risk_fit
  const risk_fit = 60; // neutro sem dados reais

  // Pesos por perfil
  const weights = PROFILE_WEIGHTS[investorProfile];
  const compatibility_score = Math.round(
    sector_fit * weights.sector +
    size_fit * weights.size +
    financial_fit * weights.financial +
    location_fit * weights.location +
    risk_fit * weights.risk
  );

  return { compatibility_score, dimensions: { sector_fit, size_fit, location_fit, financial_fit, risk_fit } };
}
```

Os resultados são exibidos imediatamente. Sem IA, sem espera, sem custo.

**3. `src/pages/Matching.tsx` — Botão "Ver análise IA" por empresa individual**

Em vez de análise automática de todas as 25, adicionar botão **por empresa** no card de resultado:

```text
┌─────────────────────────────────────────────┐
│ EMPRESA XYZ LTDA              Score: 82%    │
│ Consultoria · SP · Pequena                  │
│ ████████████████████░ 82                   │
│                                             │
│ [Shortlist] [Ignorar] [Ver análise IA ✦]   │
└─────────────────────────────────────────────┘
```

O botão "Ver análise IA ✦" chama o **`company-deep-dive`** (que já existe) ou uma versão reduzida do `ai-analyze` para **aquela empresa específica** — 1 empresa, 1 chamada, sob demanda.

**4. Remover `type: "match"` do `ai-analyze/index.ts`**

O case `"match"` inteiro pode ser removido ou desativado. Toda sua lógica determinística (pré-score, adjacência, pesos por perfil) migra para o frontend em TypeScript puro.

**5. Manter `parse-intent` como fallback no `ai-analyze`**

O case `"parse-intent"` pode ser mantido no edge function mas **não será mais chamado automaticamente**. Será chamado apenas se o lookup local falhar em encontrar CNAE (ou seja: usuário descreve algo muito incomum que o lookup não cobre). Isso vira exceção, não regra.

---

### O que muda na UX

**Antes:**
- Usuário preenche texto → aguarda IA (3-5s)
- Clica "Iniciar Matching" → aguarda IA analisar 25 empresas (15-30s)
- Resultados aparecem com análise completa

**Depois:**
- Usuário preenche texto → resultado instantâneo (lookup local, 0s)
- Clica "Iniciar Matching" → resultados aparecem em ~3s (só `national-search`, sem IA)
- Usuário clica "Ver análise IA" em 1-3 empresas interessantes → IA processa só essa, 5-8s

**Custo de IA por sessão de busca:**
- Antes: 1 chamada de `parse-intent` + 1 chamada de `match` (25 empresas) = ~15.000 tokens por busca
- Depois: 0 chamadas na busca + 1 chamada por empresa que o usuário quer analisar (~1.500 tokens)
- Redução: **~90% de custo de IA eliminado**

---

### Arquivos a Modificar

1. **`src/pages/Matching.tsx`** — principal:
   - Substituir `parseIntent()` por `parseIntentLocal()` (sem IA)
   - Reescrever `runMatchMutation` para scoring determinístico local (sem `ai-analyze`)
   - Adicionar botão "Ver análise IA" por empresa individual
   - Adicionar função `analyzeOneCompany(company)` que chama IA para 1 empresa

2. **`supabase/functions/ai-analyze/index.ts`** — simplificar:
   - Adicionar case `"match-single"` para analisar 1 empresa específica (substitui o `"match"` com 25)
   - Manter `"parse-intent"` como fallback mas não chamar por padrão
   - O case `"match"` original pode ser mantido para compatibilidade ou removido

3. **`supabase/functions/company-deep-dive/index.ts`** — avaliar:
   - Se o `"match-single"` for leve o suficiente, o Deep Dive só é chamado para análise de 5 camadas (BrasilAPI + inteligência profunda), mantendo-o como funcionalidade premium separada
