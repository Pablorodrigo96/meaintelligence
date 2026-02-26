

## Plano: Corrigir Lusha para funcionar sem decisores Apollo (usar sócios como fallback)

### Problema

O botão "Enriquecer com Lusha" bloqueia com a mensagem "Sem decisores" porque o Apollo retornou erro 429 (rate limit: 50 chamadas/minuto) para todas as empresas, então `decision_makers` está vazio no `ai_analysis`. Porém, o enriquecimento de contato (BrasilAPI/Perplexity) já trouxe dados de **sócios** (`contact_info.owners`) com nomes e cargos — esses podem ser usados como fallback.

### Causa raiz

1. **Apollo rate-limited**: O sistema envia 200 empresas em batches de 10 com apenas 500ms de delay, excedendo o limite de 50 req/min da Apollo. Resultado: 0/200 enriquecidas, `decision_makers` vazio para todas.
2. **Lusha bloqueada**: A função `enrichWithLusha` exige `decision_makers` do Apollo e não tem fallback para os sócios já disponíveis via `contact_info.owners`.

### Alterações

#### 1. `src/pages/Matching.tsx` — Fallback para sócios no `enrichWithLusha` (~linha 351)

Quando `decision_makers` do Apollo estiver vazio, usar `contact_info.owners` como fonte alternativa:

```typescript
let decisionMakers = currentAnalysis.decision_makers || [];

// Fallback: usar sócios do contact_info se não houver decisores Apollo
if (decisionMakers.length === 0 && currentAnalysis.contact_info?.owners?.length > 0) {
  decisionMakers = currentAnalysis.contact_info.owners.map((owner: any) => ({
    name: owner.name,
    title: owner.role || "Sócio",
    linkedin_url: owner.linkedin || null,
  }));
}

if (decisionMakers.length === 0) {
  toast({ title: "Sem decisores", description: "...", variant: "destructive" });
  return;
}
```

#### 2. `supabase/functions/apollo-enrich/index.ts` — Respeitar rate limit da Apollo (~linha 68)

Reduzir `BATCH_SIZE` de 10 para 5 e aumentar delay entre batches de 500ms para 1500ms (garante < 50 req/min):

```typescript
const BATCH_SIZE = 5;
// ...
await delay(1500);
```

### Detalhes técnicos

**Fallback de dados:**
```text
Prioridade 1: decision_makers (Apollo) → nome, cargo, LinkedIn
Prioridade 2: contact_info.owners (BrasilAPI/Perplexity) → nome, cargo (sócio), LinkedIn
```

**Rate limit Apollo corrigido:**
```text
ANTES: 10 empresas/batch × 2 batches/seg = 200 req em ~10s (excede 50/min)
DEPOIS: 5 empresas/batch × 1 batch/1.5s = ~200 req/min... ainda alto

Melhor: BATCH_SIZE=5, delay=6000ms → 5 req/6s = 50 req/min (exato no limite)
```

Ajuste final: `BATCH_SIZE = 5` e `delay(6500)` para ficar seguro abaixo de 50/min.

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Matching.tsx` ~linha 351 | Fallback: usar `contact_info.owners` quando `decision_makers` vazio |
| `supabase/functions/apollo-enrich/index.ts` ~linha 68 | `BATCH_SIZE=5`, `delay(6500)` para respeitar rate limit |

