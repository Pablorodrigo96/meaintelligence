

## Plano: Corrigir parsing da Análise IA (JSON bruto na tela)

### Diagnóstico

O problema persiste porque a IA retorna a resposta envolvida em code fences markdown (`` ```json ... ``` ``), e o código atual não remove essas fences. O fluxo é:

1. **Edge function `ai-analyze`** (tipo `match-single`): a IA retorna `` ```json\n{ "compatibility_score": 70, "analysis": "texto...", ... }\n``` ``
2. **`ai-analyze` tenta extrair JSON** com regex `content.match(/\{[\s\S]*\}/)` — isso funciona e retorna o objeto parseado
3. **Mas** `result.analysis` é a string `"texto..."` corretamente **apenas quando o parse funciona**. Quando o AI retorna o JSON inteiro como string dentro de `result` (ou quando `result` já é o JSON completo), o código em `analyzeOneCompany` (linha 707) faz `result.analysis || result` — e se `result` ainda contém o wrapper `` ```json `` como string, isso é salvo diretamente
4. **Na leitura**: `parseAnalysis` faz `JSON.parse(raw)` do objeto `enriched`, obtém `parsed.analysis` = `` ```json\n{...}\n``` ``, passa para `extractAnalysisText`, que tenta `trim().startsWith("{")` — mas a string começa com `` ` `` (backtick), então o check falha e retorna o texto bruto com JSON

### Alterações necessárias

**Arquivo: `src/pages/Matching.tsx`**

1. **Criar helper `stripCodeFences`**: Remove `` ```json `` e `` ``` `` do início/fim de qualquer string antes de processá-la. Isso resolve o problema na raiz.

2. **Atualizar `extractAnalysisText`** (linha 737): Aplicar `stripCodeFences` no início, antes de checar se começa com `{`. Assim qualquer resposta da IA com code fences será limpa.

3. **Atualizar `analyzeOneCompany`** (linha 706): Ao salvar `analysis`, aplicar `stripCodeFences` na string antes de armazená-la. Se após limpar a string ela for um JSON válido com campo `analysis`, extrair apenas o texto.

4. **Atualizar `parseAnalysis`** (linha 767): Aplicar `stripCodeFences` no `raw` antes de `JSON.parse`, para que dados já salvos no banco com fences sejam corretamente parseados na leitura.

**Arquivo: `supabase/functions/ai-analyze/index.ts`**

5. **Limpar fences no backend também** (defesa em profundidade): Após o regex `content.match(...)`, verificar se `content` contém `` ```json `` e removê-lo antes do match, garantindo que o backend nunca retorne dados com fences.

### Helper proposto

```typescript
const stripCodeFences = (s: string): string => {
  let t = s.trim();
  // Remove ```json or ``` at start
  t = t.replace(/^```(?:json)?\s*\n?/, '');
  // Remove ``` at end
  t = t.replace(/\n?```\s*$/, '');
  return t.trim();
};
```

### Resultado esperado

- A seção "Análise da IA" exibirá apenas o texto em português, sem JSON bruto
- Strengths, weaknesses, recommendation e dimension_explanations serão extraídos corretamente e exibidos em seus respectivos cards
- Dados já salvos no banco com fences serão corretamente parseados na leitura (fix retroativo)

