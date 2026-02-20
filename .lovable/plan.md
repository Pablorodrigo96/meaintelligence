
## Análise das Propostas e Plano de Implementação

### Avaliação honesta ponto a ponto

**A. Pré-score determinístico é "cego" — CORRETO, mas a solução importa**

O diagnóstico é preciso. O `pre_score` atual no `ai-analyze/index.ts` (linhas 28-41) usa 5 regras binárias: setor exato (+40), porte exato (+20), estado exato (+20), tem capital (+10), CNPJ válido (+10). Com threshold em 30, uma empresa com setor diferente mas capital e CNPJ válidos pontuaria apenas 20 — **descartada mesmo sendo boa candidata**. O problema de adjacência setorial é real: uma empresa de BPO financeiro tem CNAE 82xx (mapeia para "Other"), mas é altamente complementar a uma consultoria financeira (69xx/70xx).

**B. LLM como ranker primário — CORRETO, mas a solução neural é cara demais para o estágio atual**

A proposta de Two-Tower ou Cross-Encoder pressupõe dados de treinamento supervisionados que **não existem ainda** (sem histórico de `contacted`, `nda_signed`, etc.). Treinar um modelo sem labels é treinar para overfitar no ruído. A solução imediata mais efetiva é **embeddings de texto sem supervisão** (ponto 9 da proposta), que não requer treino e já resolve adjacência setorial.

**C. Financial_fit sempre penalizado — CORRETO e corrigível imediatamente**

A linha 57 do `ai-analyze/index.ts` instrui a IA: "reduce financial_fit by 20 points" para toda empresa sem receita/EBITDA. Na Base Nacional, 100% das empresas não têm EBITDA. Isso distorce o score final sistematicamente. A correção de `confidence-aware scoring` (reduzir o peso do financial_fit, não o valor) é correta e implementável hoje.

**Sobre a Camada Neural (Two-Tower, Cross-Encoder, GNN):**

Concordo com a lógica, mas o sequenciamento importa:
- Two-Tower e Cross-Encoder requerem dataset de treinamento com labels de qualidade
- Sem logs de `contacted/qualified/rejected`, qualquer modelo neural vai aprender padrões espúrios
- O ponto 9 (embeddings sem supervisão por similaridade de texto) é o caminho correto agora
- **O que precisa ser instrumentado AGORA** são os eventos de feedback para viabilizar o modelo neural no futuro

---

### O que implementar agora (por impacto/esforço)

**Prioridade 1 — Correto hoje, alto impacto imediato:**

1. **Confidence-aware scoring**: Remover a penalidade fixa de -20 no financial_fit, substituir por redução de peso proporcional ao `confidence_score` do deep-dive quando disponível. Empresas sem dados financeiros recebem `financial_fit` neutro (50) e o peso da dimensão é reduzido automaticamente no cálculo final.

2. **Pré-score com adjacência setorial**: Substituir as 5 regras binárias por um sistema de pontuação com adjacência. Em vez de `sector === target_sector` para +40, usar uma matriz de adjacência que pontua setores complementares com +20 (ex: Finance:Consulting adjacente a Finance:Accounting, BPO, Legal).

3. **Instrumentação de eventos de feedback no banco**: Registrar eventos de usuário na tabela `matches` (já existe) adicionando campos `user_action` e `action_timestamp` — ou criar uma tabela `match_feedback` simples. Isso é o investimento para o modelo neural futuro.

**Prioridade 2 — Embeddings sem supervisão (melhora ranking sem treino):**

4. **Ranker por similaridade de texto**: No `ai-analyze`, antes da IA, gerar um score de similaridade textual entre o perfil do comprador (setor + porte + notas) e a descrição de cada candidato (CNAE + porte + capital + localização). Usar a API de embeddings do gateway Lovable AI (modelo `text-embedding`) para calcular cosine similarity. Ordenar os top 25 por esse score antes de enviar para o LLM.

**Prioridade 3 — Infraestrutura de feedback (viabiliza o futuro neural):**

5. **Tabela `match_feedback`**: Criar tabela para registrar ações do usuário (clicou, salvou, ignorou, contatou, rejeitou com motivo) com `buyer_id`, `company_id`, `action_type`, `rank_position`, `criteria_snapshot`. Adicionar botões no card de resultado (`Salvar na shortlist`, `Ignorar`, `Marcar como contatado`).

---

### Arquitetura final do pipeline após as mudanças

```text
[NL Input] → parse-intent (LLM rápido) → cnae_prefixes + capital_range
                    ↓
[Layer 1 - DB Filter]
national-search: CNAE exato + capital range + UF
→ retorna 80 candidatos

                    ↓
[Layer 2A - Hard Filters]
CNPJ válido + ativo + capital dentro da faixa
→ elimina inválidos

                    ↓
[Layer 2B - Pré-score com Adjacência]
Novo: matriz de adjacência setorial (adjacent = +20, complementar = +15)
Novo: embedding similarity score (cosine entre buyer profile e company text)
→ top 25 por score composto (pré-score + embedding similarity)

                    ↓
[Layer 3 - LLM explicador]
Recebe top 25 com rank_score e confidence
Gera: análise qualitativa + next steps (NÃO é ranker primário)
Novo: financial_fit com peso dinâmico baseado em confidence
→ retorna 25 matches com score final + explicações

                    ↓
[Feedback Loop] ← botões de ação no card de resultado
match_feedback: clicked / saved / ignored / contacted / rejected
→ dataset para futuro Two-Tower / Cross-Encoder
```

---

### Detalhamento técnico das alterações

**1. Nova tabela `match_feedback` (migration)**

```sql
CREATE TABLE match_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  action_type text NOT NULL, -- 'clicked','saved','ignored','contacted','rejected','meeting','nda','dd_started'
  rank_position integer,
  rejection_reason text,
  criteria_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON match_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**2. `supabase/functions/ai-analyze/index.ts` — case "match"**

Substituir o bloco de pré-score atual (linhas 26-41) por:

```typescript
// Matriz de adjacência setorial — evita descartar candidatos complementares
const SECTOR_ADJACENCY: Record<string, string[]> = {
  "Finance": ["Technology", "Real Estate", "Other"],
  "Technology": ["Finance", "Telecom", "Education"],
  "Healthcare": ["Technology", "Education", "Other"],
  "Manufacturing": ["Logistics", "Energy", "Retail"],
  "Retail": ["Logistics", "Manufacturing", "Other"],
  "Logistics": ["Manufacturing", "Retail", "Agribusiness"],
  "Real Estate": ["Finance", "Construction", "Other"],
  "Agribusiness": ["Logistics", "Manufacturing", "Energy"],
  "Education": ["Technology", "Healthcare", "Other"],
  "Energy": ["Manufacturing", "Agribusiness", "Other"],
  "Telecom": ["Technology", "Finance", "Other"],
  "Other": [],
};

// Novo pré-score com adjacência
const preScored = allCompanies.map((c: any) => {
  let score = 0;
  
  // Setor: exato (+40), adjacente (+20), complementar por CNAE prefix (+15)
  if (criteria.target_sector) {
    if (c.sector === criteria.target_sector) score += 40;
    else if (SECTOR_ADJACENCY[criteria.target_sector]?.includes(c.sector)) score += 20;
    // Bonus: se o CNAE prefix da empresa está nos cnae_prefixes do buyer (via parse-intent)
    const buyerCnaePrefixes: string[] = criteria.cnae_prefixes || [];
    if (buyerCnaePrefixes.length > 0) {
      const companyCnae = c.cnae_fiscal_principal || c.description?.match(/CNAE: (\d+)/)?.[1] || "";
      if (buyerCnaePrefixes.some(p => companyCnae.startsWith(p))) score += 15;
    }
  }
  
  // Porte: exato (+20), adjacente (+10)
  const sizeOrder = ["Startup", "Small", "Medium", "Large", "Enterprise"];
  const targetIdx = sizeOrder.indexOf(criteria.target_size || "");
  const companyIdx = sizeOrder.indexOf(c.size || "");
  if (criteria.target_size) {
    if (c.size === criteria.target_size) score += 20;
    else if (Math.abs(targetIdx - companyIdx) === 1) score += 10;
  }
  
  // Estado (+20)
  if (criteria.target_state && c.state === criteria.target_state) score += 20;
  
  // Dados disponíveis (+10)
  if (c.revenue || c.capital_social) score += 10;
  
  // CNPJ válido (+10)
  if (c.cnpj && String(c.cnpj).replace(/\D/g, "").length >= 14) score += 10;
  
  return { ...c, pre_score: score };
});

// Threshold reduzido: de 30 para 20 (menos agressivo no descarte)
// Mais empresas passam mas ordenadas melhor
const preFiltered = preScored
  .filter((c: any) => c.pre_score >= 20)
  .sort((a: any, b: any) => b.pre_score - a.pre_score)
  .slice(0, 25);
```

**Confidence-aware scoring** — modificar o rubric do LLM:

```typescript
// No systemPrompt, substituir a linha de penalidade fixa:
// ANTES: "reduce financial_fit by 20 points"  
// DEPOIS:
`FINANCIAL_FIT COM DADOS AUSENTES:
- Se a empresa não tem receita nem EBITDA, atribua financial_fit = 50 (neutro, não penalize).
- Indique no dimension_explanations que os dados são estimados ou ausentes.
- O sistema automaticamente reduzirá o peso de financial_fit no cálculo final para empresas sem dados.

PESO DINÂMICO DE FINANCIAL_FIT (calcule o compatibility_score assim):
- Se a empresa tem receita E ebitda: use os pesos normais por perfil
- Se a empresa só tem capital_social (sem receita real): reduza financial_fit_weight em 40%
  e redistribua esse peso para sector_fit e size_fit igualmente
- Exemplo Moderado com dados ausentes: 
  sector_fit*0.30 + size_fit*0.30 + financial_fit*0.15 + location_fit*0.15 + risk_fit*0.10`
```

**3. `src/pages/Matching.tsx` — botões de feedback**

Adicionar no card de resultado de cada match (no bloco de ações existente):

- Botão "Shortlist" → registra `action_type: "saved"` na tabela `match_feedback`
- Botão "Ignorar" → registra `action_type: "ignored"` + campo opcional de motivo
- Botão "Contatado" → registra `action_type: "contacted"`
- Exibir badge na aba "Resultados" mostrando quantas empresas estão na shortlist

**4. Indicador de confiança no card de resultado**

Ao expandir um match (accordion), mostrar:
- Se `source === "national_db"`: badge cinza "Dados estimados — capital social proxy"
- Se o Deep Dive foi executado e retornou `confidence_score`: mostrar badge colorido por nível

---

### Ordem de implementação

1. Migration da tabela `match_feedback`
2. Pré-score com adjacência setorial (`ai-analyze/index.ts`)
3. Confidence-aware scoring no prompt LLM (`ai-analyze/index.ts`)
4. Botões de feedback na UI de resultados (`Matching.tsx`)
5. Badge de confiança dos dados por empresa no resultado

### Arquivos a modificar

1. Nova migration SQL — tabela `match_feedback` com RLS
2. `supabase/functions/ai-analyze/index.ts` — pré-score com adjacência + confidence-aware scoring
3. `src/pages/Matching.tsx` — botões de ação de feedback + badge de confiança

### O que NÃO fazer agora (e por quê)

- **Two-Tower neural**: sem labels de treino, qualquer modelo vai aprender padrões espúrios. Implementar depois de 200+ eventos de feedback registrados.
- **Cross-Encoder**: mesmo motivo + custo de inferência seria comparável ao LLM atual.
- **GNN**: requer grafo de transações reais — horizonte de 6-12 meses mínimo.
- **Embeddings via API**: o gateway Lovable AI não expõe endpoint de embeddings separado. Seria necessário uma chamada adicional por empresa → aumenta latência e custo. Deixar para quando houver endpoint dedicado.
