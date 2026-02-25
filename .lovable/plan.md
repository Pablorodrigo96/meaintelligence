

## Tripla Validação: Base Nacional + Perplexity + Google Custom Search

### Conceito

Adicionar o Google Custom Search como terceira camada de validação paralela ao Perplexity, criando um sistema de ranking por autoridade digital com pontuação cumulativa:

```text
┌──────────────────────────────────────────────────────────┐
│  CAMADA 1: Base Nacional (custo zero)                    │
│  2000 empresas → scoring local → 200 qualificadas       │
└──────────────┬───────────────────────────────────────────┘
               │ paralelo (Promise.all)
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌─────────────────┐
│  Perplexity  │  │  Google Custom   │
│  Sonar       │  │  Search API      │
│  ~20 nomes   │  │  ~10 resultados  │
└──────┬───────┘  └────────┬────────┘
       └───────┬───────────┘
               ▼
┌──────────────────────────────────────────────────────────┐
│  CAMADA 3: Cross-reference triplo                        │
│  DB only          → score base                           │
│  DB + Perplexity  → +15 pontos, badge "Validada Web"     │
│  DB + Google      → +10 pontos, badge "Google"           │
│  DB + ambos       → +25 pontos, badge "Dupla Validação"  │
└──────────────────────────────────────────────────────────┘
```

### Pré-requisito: Chave API do Google

O usuário mencionou que já tem a chave. Será necessário armazenar dois secrets:
- `GOOGLE_CSE_API_KEY` — a chave de API do Google
- `GOOGLE_CSE_CX` — o ID do Custom Search Engine (cx)

Vou solicitar ambos via ferramenta de secrets antes de implementar o código.

### Mudanças técnicas

#### 1. Nova Edge Function: `google-search-validate`

Arquivo: `supabase/functions/google-search-validate/index.ts`

- Recebe `sector`, `state`, `city`
- Monta query: `"empresas de [setor] em [cidade/estado]"`
- Chama `https://www.googleapis.com/customsearch/v1?key=...&cx=...&q=...&num=10`
- Extrai nomes de empresas dos títulos e snippets dos resultados
- Normaliza e retorna array no mesmo formato do Perplexity (`{ original, normalized, rank }`)
- Custo: R$0 (100 queries/dia gratuitas)

#### 2. `src/pages/Matching.tsx` — Chamada paralela tripla

Substituir a chamada sequencial do Perplexity por `Promise.all` com ambas as fontes:

```text
const [perplexityResult, googleResult] = await Promise.all([
  supabase.functions.invoke("perplexity-validate", { body: { sector, state, city } }),
  supabase.functions.invoke("google-search-validate", { body: { sector, state, city } }),
]);
```

#### 3. Cross-reference com pontuação cumulativa

Lógica de boost atualizada:
- Match com Perplexity: `+15` pontos (mantém atual)
- Match com Google: `+10` pontos (novo)
- Os boosts são **cumulativos** — empresa que aparece em ambos ganha `+25`
- Novas flags em `MatchDimensions`:
  - `google_validated?: boolean`
  - `google_rank?: number | null`

#### 4. UI: Badges diferenciados

- **Apenas Perplexity**: Badge verde "Validada Web" (Globe icon) — como hoje
- **Apenas Google**: Badge azul "Google" (Search icon)
- **Ambos**: Badge dourado "Dupla Validação" (Shield icon) — máxima confiança

#### 5. PROGRESS_STEPS atualizado

Adicionar step para Google Search entre os existentes:
```text
{ label: "Validando presença digital (Perplexity + Google)...", pct: 70 },
```
Fusionar em um único step já que rodam em paralelo.

#### 6. Filtro de resultados na UI

Expandir o toggle "Validadas Web" para incluir opções:
- Todas (200)
- Validadas Web (Perplexity ou Google)
- Dupla Validação (ambos)

### Custo mensal estimado (100 queries/dia)

| Componente | Custo/mês |
|---|---|
| Base Nacional | R$0 |
| Perplexity Sonar | ~R$24 |
| Google Custom Search | R$0 (100/dia grátis) |
| **Total** | **~R$24/mês** |

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/google-search-validate/index.ts` | Criar — Edge function para Google CSE |
| `supabase/config.toml` | Registrar nova função |
| `src/pages/Matching.tsx` | Modificar — Promise.all triplo, cross-reference cumulativo, badges diferenciados, filtros expandidos |

### Sequência de implementação

1. Solicitar secrets `GOOGLE_CSE_API_KEY` e `GOOGLE_CSE_CX` ao usuário
2. Criar edge function `google-search-validate`
3. Modificar `Matching.tsx` com chamada paralela e cross-reference cumulativo
4. Atualizar UI com badges e filtros

### Detalhes técnicos

A Google Custom Search API retorna resultados genéricos (títulos de páginas, snippets) — não nomes estruturados como o Perplexity. A edge function precisará extrair nomes de empresas dos campos `title` e `snippet` usando heurísticas simples (split por separadores comuns como `|`, `-`, `—`). O mesmo `normalizeNameForMatch` + Levenshtein será usado para o cruzamento.

Se o Google falhar ou não estiver configurado, o fluxo continua normalmente com Perplexity apenas (graceful degradation dupla).

