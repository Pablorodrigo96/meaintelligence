

## Levenshtein Fuzzy Matching para Cross-Reference Web

### O que muda

Substituir o matching atual baseado em `includes()` e busca de palavras por **similaridade de Levenshtein**, que mede a distância de edição entre strings. Isso captura variações como:
- "Tecnologia XYZ" vs "XYZ Tecnologia" (ordem diferente)
- "Telecom Brasil" vs "Telecombrasil" (sem espaço)
- "NetServ" vs "Net Serv" (segmentação)

### Implementação

**Arquivo: `src/pages/Matching.tsx`**

1. **Adicionar função `levenshteinDistance(a, b)`** — algoritmo clássico O(n×m) com matriz de distância. Para os tamanhos de nome envolvidos (~5-30 chars após normalização), a performance é irrelevante.

2. **Adicionar função `levenshteinSimilarity(a, b)`** — retorna valor 0-1:
```text
similarity = 1 - (distance / max(a.length, b.length))
```

3. **Adicionar função `bestMatchSimilarity(companyTokens, webTokens)`** — compara também por tokens (palavras) para capturar nomes reordenados. Retorna o maior score entre:
   - Similaridade da string completa
   - Similaridade por melhor combinação de tokens significativos (>3 chars)

4. **Substituir o bloco de matching** (linhas 498-507) por:
```text
const SIMILARITY_THRESHOLD = 0.65;  // 65% de similaridade mínima

const sim = Math.max(
  bestMatchSimilarity(normalizedCompany, webNorm),
  bestMatchSimilarity(normalizedRazao, webNorm)
);

if (sim >= SIMILARITY_THRESHOLD) {
  // marca como validada, aplica boost
}
```

O threshold de 0.65 é conservador o suficiente para evitar falsos positivos mas captura variações comuns de nomes empresariais.

### Detalhes técnicos

A função Levenshtein usa programação dinâmica com uma única linha de memória (otimização de espaço O(min(n,m))). Nenhuma dependência externa necessária.

A comparação por tokens resolve o problema de ordem: "ABC Telecom" vs "Telecom ABC" terá similaridade alta porque os tokens individuais "abc" e "telecom" fazem match perfeito.

### Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/Matching.tsx` | Adicionar `levenshteinDistance`, `levenshteinSimilarity`, `bestMatchSimilarity`; substituir bloco de substring matching por similaridade com threshold 0.65 |

