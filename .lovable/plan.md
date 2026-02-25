

## Plano: Corrigir parsing IA + máscaras de moeda

Três correções cirúrgicas, todas confirmadas pela leitura do código atual.

### 1. Regex no `ai-analyze` (linha 405)

O regex atual prioriza array `[...]` sobre objeto `{...}`, descartando o wrapper `buyer_profiles`. Inverter a ordem:

**`supabase/functions/ai-analyze/index.ts` linha 405:**
```js
// DE:
const jsonMatch = stripped.match(/\[[\s\S]*\]/) || stripped.match(/\{[\s\S]*\}/);
// PARA:
const jsonMatch = stripped.match(/\{[\s\S]*\}/) || stripped.match(/\[[\s\S]*\]/);
```

### 2. Fallback no frontend (linha 1032)

Adicionar fallback para quando o parsing já retorna array direto.

**`src/pages/Matching.tsx` linha 1032:**
```ts
// DE:
const profiles: BuyerProfile[] = parsed.buyer_profiles || [];
// PARA:
const profiles: BuyerProfile[] = parsed.buyer_profiles || (Array.isArray(parsed) ? parsed : []);
```

### 3. Helpers de moeda + máscaras nos 7 inputs financeiros

Adicionar após linha 58 (após `sectorLabel`):
```ts
function formatBRL(value: string | number): string {
  const num = typeof value === "string" ? Number(value.replace(/\D/g, "")) : value;
  if (!num && num !== 0) return "";
  return num.toLocaleString("pt-BR");
}
function parseBRL(formatted: string): string {
  return formatted.replace(/\./g, "").replace(/,/g, "").replace(/\D/g, "");
}
function handleCurrencyChange(formatted: string, setter: (val: string) => void) {
  setter(parseBRL(formatted));
}
```

**Formulário do vendedor** (linhas 1990, 1994, 1998) — trocar `type="number"` por `inputMode="numeric"` com `formatBRL`:
```tsx
<Input inputMode="numeric"
  value={sellerData.revenue ? formatBRL(sellerData.revenue) : ""}
  onChange={(e) => handleCurrencyChange(e.target.value, (v) => setSellerData(prev => ({ ...prev, revenue: v })))}
  placeholder="Ex: 5.000.000" />
```
Mesmo padrão para `ebitda` e `asking_price`.

**Wizard Step 1** (linhas 2386, 2390, 2394, 2398) — mesmo padrão para `min_revenue`, `max_revenue`, `min_ebitda`, `max_ebitda`.

### 4. Build error TS1128 (linha 3322)

O arquivo termina corretamente com `}` na linha 3322 — confirmado pela leitura. Provavelmente um caractere BOM/invisível. A reescrita da linha final resolverá.

### Resumo de alterações
| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `ai-analyze/index.ts` | 405 | Inverter regex |
| `Matching.tsx` | 58 | Adicionar 3 helpers (`formatBRL`, `parseBRL`, `handleCurrencyChange`) |
| `Matching.tsx` | 1032 | Fallback array direto |
| `Matching.tsx` | 1990, 1994, 1998 | Máscaras moeda vendedor |
| `Matching.tsx` | 2386, 2390, 2394, 2398 | Máscaras moeda wizard |
| `Matching.tsx` | 3322 | Limpar caractere invisível |

