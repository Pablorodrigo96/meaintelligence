
## Diagnóstico: Como funciona o fluxo atual

O fluxo atual tem 3 etapas sequenciais sem pré-filtragem eficiente:

```text
[BD Externo] → 150 empresas brutas
       ↓
[IA: ai-analyze] → analisa TODAS as 150 de uma vez (payload gigante)
       ↓
[Frontend] → salva todas no banco local como matches
```

**Por que demora tanto:**
- A `national-search` busca 150 registros ordenados por capital social (simples, rápido)
- Todas as 150 são serializadas em JSON e enviadas em um único prompt para a IA
- A IA analisa empresa por empresa, retorna 150 objetos JSON com scores e análises
- O frontend faz N inserts no banco (uma por empresa que a IA retornou)
- Não há etapa de descarte antes da IA: empresas obviamente irrelevantes "gastam" tokens

---

## Proposta: Pipeline de 3 Camadas com Funil Visível

### Camada 1 — Filtro no BD (já existe, mas será fortalecido)

A `national-search` já filtra por setor, estado e porte. Vamos tornar esses filtros mais restritivos para devolver **no máximo 50 candidatos pré-qualificados** ao invés de 150.

- Reduzir o `limit` default de 150 para 50 nas chamadas normais
- Adicionar um campo `pre_filter_count` na resposta para rastrear quantas passaram pelo BD

### Camada 2 — Pré-score no Edge Function (NOVO: sem IA)

Criar uma etapa de **pontuação determinística** no `ai-analyze` antes de chamar a IA. Essa etapa roda no servidor em milissegundos:

```text
Para cada empresa recebida:
  - sector_match: setor da empresa == setor alvo? (+40)
  - size_match: porte == porte alvo? (+20)  
  - state_match: UF == estado alvo? (+20)
  - has_capital: tem capital_social > 0? (+10)
  - cnpj_valid: CNPJ tem 14 dígitos? (+10)
  pre_score = soma dos pontos (0-100)
```

Empresas com `pre_score < 30` são descartadas antes de ir para a IA.
Apenas as **top 25** por `pre_score` seguem para análise pela IA.

### Camada 3 — IA analisa apenas os pré-selecionados

Com 25 empresas ao invés de 150, o prompt fica ~6x menor → resposta ~6x mais rápida.

### Funil Visual no Frontend

Mostrar durante e após o processo um card de funil com os números reais:

```text
┌─────────────────────────────────────┐
│  FUNIL DE SELEÇÃO                   │
│                                     │
│  Base Nacional  →  150 registros    │
│  Filtro BD      →   50 candidatos   │
│  Pré-score      →   25 qualificados │
│  Análise IA     →   25 analisados   │
│  Score ≥ 40     →   18 matches      │
└─────────────────────────────────────┘
```

---

## O que será alterado

### 1. `supabase/functions/ai-analyze/index.ts`

Adicionar lógica de pré-score **antes** da chamada à IA no case `"match"`:

```typescript
// Pré-score determinístico (sem IA)
const preScored = companies.map(c => {
  let score = 0;
  if (criteria.target_sector && c.sector === criteria.target_sector) score += 40;
  if (criteria.target_size && c.size === criteria.target_size) score += 20;
  if (criteria.target_state && c.state === criteria.target_state) score += 20;
  if (c.revenue || c.capital_social) score += 10;
  if (c.cnpj?.length >= 14) score += 10;
  return { ...c, pre_score: score };
});

const preFiltered = preScored
  .filter(c => c.pre_score >= 30)
  .sort((a, b) => b.pre_score - a.pre_score)
  .slice(0, 25);

// Logar o funil
console.log(`Funil: ${companies.length} recebidas → ${preFiltered.length} para IA`);
```

Retornar também os metadados do funil na resposta:
```typescript
return { result: parsed, funnel: { received: companies.length, pre_filtered: preFiltered.length } }
```

### 2. `supabase/functions/national-search/index.ts`

- Mudar o `limit` máximo: quando chamado pelo matching (sem `raw` flag), busca 80 registros do BD; quando chamado com `raw: true`, retorna até 200 para exploração manual.
- Incluir `db_count` na resposta para o funil.

### 3. `src/pages/Matching.tsx`

**A) Novo estado para o funil:**
```typescript
const [funnelStats, setFunnelStats] = useState<{
  db_fetched: number;
  pre_filtered: number;
  ai_analyzed: number;
  final_matches: number;
} | null>(null);
```

**B) Capturar dados do funil durante o `runMatchMutation`:**
- Após `national-search`: registrar `db_fetched = nationalData.total`
- Após `ai-analyze`: registrar `pre_filtered` e `ai_analyzed` da resposta
- Após salvar matches: registrar `final_matches = results.length`

**C) Card de funil visual (novo componente inline):**
Exibir abaixo do progresso durante a análise e nos resultados:

```text
Base Nacional → Filtro BD → Pré-score → IA → Matches finais
    150            80           25       25       18
```

Cada etapa com um ícone (Database → Filter → Zap → Star) e a taxa de conversão entre etapas.

**D) Progress steps mais granulares:**
Atualizar `PROGRESS_STEPS` para refletir as novas etapas:
```typescript
{ label: "Buscando no banco nacional...", pct: 10 },
{ label: "Aplicando pré-filtros...", pct: 30 },
{ label: "Enviando para IA (top candidatos)...", pct: 50 },
{ label: "Analisando compatibilidade...", pct: 75 },
{ label: "Salvando resultados...", pct: 90 },
```

**E) Mostrar o funil nos resultados:**
No topo da aba "Resultados", exibir um banner colapsável com o funil da última busca.

---

## Impacto esperado

| Métrica | Antes | Depois |
|---|---|---|
| Empresas enviadas para IA | 150 | ~25 |
| Tamanho do prompt | ~60KB | ~10KB |
| Tempo de resposta da IA | 45-90s | 10-20s |
| Visibilidade do processo | Nenhuma | Funil completo |

---

## Arquivos a modificar

1. `supabase/functions/ai-analyze/index.ts` — pré-score + metadados do funil
2. `supabase/functions/national-search/index.ts` — ajuste de limite e `db_count`
3. `src/pages/Matching.tsx` — estado do funil, progress steps e componente visual
