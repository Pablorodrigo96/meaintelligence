

## Plano: Corrigir exibição da Análise IA e Aprofundamento

### Problema 1 — Análise IA exibe JSON bruto

Na screenshot, a seção "Análise da IA" renderiza o JSON cru completo (com chaves, aspas, campos como `compatibility_score`, `dimensions`, etc.) em vez de exibir apenas o texto de análise.

**Causa raiz**: Em `Matching.tsx` linha 706, quando a IA retorna a resposta e `result.analysis` é um objeto (não uma string), ou quando `result.analysis` está ausente e `result` é o JSON inteiro, esse valor é salvo como `analysis` no banco. Depois, o `parseAnalysis` retorna esse objeto como string (via `JSON.stringify` implícito do React), exibindo o JSON bruto na tela.

**Correção**:

1. **`parseAnalysis`** (linhas 728-744) — Quando `parsed.analysis` for um objeto em vez de string, extrair o texto dele (se tiver campo `analysis` dentro) ou converter para string legível. Adicionar fallback robusto.

2. **`analyzeOneCompany`** (linha 706) — Garantir que `analysis` sempre salva uma **string**, não um objeto. Se `result.analysis` for um objeto, extrair `result.analysis.analysis` ou fazer `typeof result.analysis === 'object' ? JSON.stringify(result.analysis) : result.analysis`.

3. **Exibição** (linha 2347) — Adicionar verificação: se `analysis` parecer ser JSON bruto (começa com `{` ou `` ` ``), não exibir diretamente. Exibir uma mensagem de fallback ou tentar extrair campos relevantes para exibição formatada (analysis text, strengths, weaknesses separadamente).

### Problema 2 — Aprofundamento Top 10 (DeepDiveDialog)

O dialog abre mas parece ficar travado ou sem resultados visíveis. Possíveis causas:

1. **Empresas sem CNPJ** — Se nenhuma das top 10 tem CNPJ, o Deep Dive retorna resultados vazios (sem `intelligence`, sem `public_data`). O componente renderiza cards vazios.

2. **Erro silencioso na edge function** — A chamada a `company-deep-dive` pode falhar (BrasilAPI timeout, rate limit) sem feedback adequado ao usuário.

**Correção**:

1. Adicionar estado de feedback ao usuário quando nenhuma empresa tem CNPJ — exibir mensagem clara: "Nenhuma empresa do Top 10 possui CNPJ cadastrado. Adicione CNPJs na página de Empresas para ativar o Motor de Inteligência."

2. Melhorar o loading state com progresso incremental (ex: "Processando empresa 3 de 10...").

3. Se a `aiAnalysis` retornar markdown (com `**bold**`, `##` headers), renderizar com formatação adequada em vez de texto plano.

### Resumo técnico das alterações

| Arquivo | Alteração |
|---|---|
| `src/pages/Matching.tsx` | Corrigir `analyzeOneCompany` para garantir `analysis` é string. Corrigir `parseAnalysis` para lidar com objetos aninhados. Melhorar renderização da seção "Análise da IA" para formatar texto vs JSON. |
| `src/components/DeepDiveDialog.tsx` | Adicionar estado vazio quando sem CNPJs. Renderizar `aiAnalysis` com suporte a markdown básico (bold, headers, listas). Melhorar feedback de progresso. |

