

## Plano: Corrigir busca de compradores + adicionar mascaras de moeda

### Problema 1: "A IA nao encontrou perfis de compradores"

**Causa raiz identificada e confirmada por teste direto na edge function.**

A IA retorna corretamente os perfis, mas o parsing no `ai-analyze/index.ts` (linha 405) destroi a estrutura:

```javascript
// Linha 405 — regex tenta array PRIMEIRO
const jsonMatch = stripped.match(/\[[\s\S]*\]/) || stripped.match(/\{[\s\S]*\}/);
```

A IA retorna: `{"buyer_profiles": [...], "investment_thesis": "..."}`

O regex `\[[\s\S]*\]` encontra o array interno `[{...}, {...}]` ANTES de tentar o objeto completo. Resultado: `parsed` vira apenas o array, sem o wrapper. No frontend (linha 1032):

```javascript
const profiles: BuyerProfile[] = parsed.buyer_profiles || [];
// parsed = [{...}, {...}] (array sem .buyer_profiles) → profiles = []
```

Profiles fica vazio, e a linha 1036 lanca o erro: "A IA nao encontrou perfis de compradores."

**Correcao**: No `ai-analyze/index.ts`, inverter a ordem do regex para tentar objeto PRIMEIRO:

```javascript
const jsonMatch = stripped.match(/\{[\s\S]*\}/) || stripped.match(/\[[\s\S]*\]/);
```

E no frontend, adicionar fallback para quando `result` ja for o array direto:

```javascript
const parsed = aiData?.result || aiData;
const profiles: BuyerProfile[] = parsed.buyer_profiles || (Array.isArray(parsed) ? parsed : []);
```

### Problema 2: Campos de moeda sem mascara

Os inputs de Faturamento, EBITDA e Asking Price (linhas 1990, 1994, 1998) sao `type="number"` sem formatacao. O usuario digita "5000000" sem saber se sao reais, milhares ou milhoes.

**Correcao**: Criar uma funcao `formatCurrencyInput` que formata o valor enquanto digita (ex: "5.000.000") e armazena o numero puro no estado. Usar `type="text"` com `inputMode="numeric"` em vez de `type="number"`.

Aplicar nos 3 campos do formulario do vendedor (revenue, ebitda, asking_price) e tambem nos campos de faturamento do wizard de busca de alvos (min_revenue, max_revenue, min_ebitda, max_ebitda).

### Problema 3: Build error TS1128

O erro `Declaration or statement expected` na linha 3322 pode ser causado por caractere invisivel ou BOM. A correcao dos itens acima deve reescrever a area afetada e resolver.

### Alteracoes por arquivo

1. **`supabase/functions/ai-analyze/index.ts`** (linha 405): Inverter regex — objeto antes de array
2. **`src/pages/Matching.tsx`**:
   - Linha 1032: Fallback para array direto no parsing de profiles
   - Linhas 1987-1999: Campos de moeda com mascara `R$ X.XXX.XXX`
   - Campos equivalentes no wizard Step 1 (min_revenue, max_revenue, min_ebitda, max_ebitda)
   - Helper `formatBRL(value)` / `parseBRL(formatted)` para converter entre display e valor numerico

