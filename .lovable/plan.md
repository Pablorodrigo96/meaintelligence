

## Auditoria do Módulo de Matching — Diagnóstico e Oportunidades de Melhoria

### Arquivo principal: `src/pages/Matching.tsx` (3.244 linhas)

---

### PROBLEMA CRÍTICO 1: Arquivo monolítico de 3.244 linhas

O arquivo `Matching.tsx` concentra absolutamente tudo: tipos, constantes, mapas CNAE, lógica de scoring, formulários, cards de resultado, analytics e busca reversa. Isso causa:
- Dificuldade de manutenção e navegação
- Re-renderizações desnecessárias (qualquer mudança de estado re-processa tudo)
- Impossibilidade de testar componentes isoladamente

**Sugestão**: Extrair em módulos:
- `src/lib/matching/scoring.ts` — funções `scoreCompanyLocal`, `parseIntentLocal`, constantes `CNAE_VALUE_CHAIN`, `SECTOR_BOTTLENECK_MAP`, `KEYWORD_MAP`
- `src/lib/matching/types.ts` — interfaces `MatchDimensions`, `MatchResult`, `SellerData`, `BuyerProfile`
- `src/components/matching/MatchCard.tsx` — card de resultado individual
- `src/components/matching/BuyerSearchForm.tsx` — formulário do vendedor
- `src/components/matching/CriteriaWizard.tsx` — wizard de 3 passos
- `src/components/matching/FunnelCard.tsx` — já existe inline, extrair

---

### PROBLEMA 2: Busca reversa salva empresas duplicadas no banco

Cada vez que `runBuyerSearch` executa, ele insere TODAS as empresas encontradas na tabela `companies` (linha 1117) sem verificar se já existem. Se o usuário rodar a busca 3 vezes, terá 3 cópias de cada empresa. O mesmo ocorre no `runMatchMutation` (linha 625).

**Sugestão**: Antes de inserir, verificar por CNPJ se a empresa já existe:
```sql
SELECT id FROM companies WHERE cnpj = $1 AND user_id = $2 LIMIT 1
```
Se existir, reutilizar o `id` existente em vez de inserir novamente.

---

### PROBLEMA 3: Inserções sequenciais lentas (N+1)

Nas linhas 623-658 e 1116-1157, cada empresa é inserida uma a uma com `await`. Para 200 empresas, são 400 chamadas sequenciais (1 insert company + 1 insert match). Isso pode levar minutos.

**Sugestão**: Usar batch insert com `supabase.from("companies").insert([...array]).select()` e depois `supabase.from("matches").insert([...array])` em uma única operação.

---

### PROBLEMA 4: Busca reversa não tem validação web

O fluxo "Buscar Alvos" inclui validação Perplexity + Google (linhas 560-618), mas o fluxo "Buscar Compradores" pula completamente essa etapa. Compradores potenciais não são validados na web.

**Sugestão**: Adicionar a mesma etapa de validação web na busca reversa, adaptada para verificar se as empresas compradoras realmente existem e têm presença digital.

---

### PROBLEMA 5: Size Fit no scoring reverso usa lógica incorreta

Linha 1049: `sizeOrder.indexOf(sellerData.sector ? "Small" : "Small")` — sempre retorna "Small" independentemente dos dados do vendedor. Deveria inferir o porte baseado no faturamento/EBITDA.

**Sugestão**: Inferir porte do vendedor a partir do faturamento:
```typescript
const sellerRevenue = Number(sellerData.revenue) || 0;
const sellerSize = sellerRevenue > 100_000_000 ? "Enterprise" :
  sellerRevenue > 10_000_000 ? "Large" :
  sellerRevenue > 1_000_000 ? "Medium" :
  sellerRevenue > 100_000 ? "Small" : "Startup";
```

---

### PROBLEMA 6: Limpeza de matches antigos agressiva

Linha 536 e 1113: `await supabase.from("matches").delete().eq("buyer_id", user!.id).eq("status", "new")` — deleta TODOS os matches "new" do usuário antes de salvar novos. Se o usuário alternar entre "Buscar Alvos" e "Buscar Compradores", perde os resultados anteriores.

**Sugestão**: Adicionar um campo `match_type` na tabela `matches` ("target_search" | "buyer_search") e deletar apenas os matches do mesmo tipo. Ou criar uma coluna `search_session_id` para agrupar buscas.

---

### PROBLEMA 7: national-search usa LIKE sem índice para CNAE

Linha 134: `e.cnae_fiscal_principal LIKE '${p}%'` é injetado diretamente no SQL sem prepared statement para o valor do prefixo CNAE. Além de potencial SQL injection (embora os prefixos venham do código), `LIKE` sem índice em 50M+ registros é lento.

**Sugestão**: 
1. Usar prepared statements para os prefixos CNAE
2. Considerar um índice `btree` na coluna `cnae_fiscal_principal` se não existir
3. Usar `LEFT(cnae_fiscal_principal, 2) = $N` em vez de LIKE para prefixos de 2 dígitos

---

### PROBLEMA 8: Sem exportação de resultados

Não existe funcionalidade de exportar os resultados do matching (CSV, PDF). Para um assessor de M&A, compartilhar resultados com clientes é essencial.

**Sugestão**: Adicionar botão "Exportar CSV" que gera um arquivo com: Nome, CNPJ, Setor, Score, Sinergia Dominante, Estado, Cidade, Telefone (se enriquecido), Email.

---

### PROBLEMA 9: Sem persistência do modo/contexto da busca reversa

Quando o usuário preenche dados do vendedor e navega para outra página, perde tudo. Os estados `sellerData`, `buyerProfiles`, `investmentThesis` são voláteis.

**Sugestão**: Salvar o contexto do vendedor no `match_criteria` com um campo `mode: "find-buyers"` e os dados do seller em `notes` (JSON). Ao voltar à página, carregar automaticamente.

---

### PROBLEMA 10: Sem "Enriquecer em lote"

O enriquecimento é individual (clique por clique). Para 200 resultados, é impraticável.

**Sugestão**: Botão "Enriquecer Top 10" que executa `enrichOneCompany` para as 10 empresas com maior score em paralelo (com throttle de 2 simultâneos para não sobrecarregar APIs).

---

### RESUMO DE PRIORIDADES

| # | Problema | Impacto | Esforço |
|---|----------|---------|---------|
| 2 | Empresas duplicadas no banco | Alto | Baixo |
| 5 | Size Fit incorreto na busca reversa | Alto | Baixo |
| 3 | Inserções sequenciais lentas | Médio | Médio |
| 7 | SQL injection + performance CNAE | Médio | Médio |
| 6 | Limpeza agressiva de matches | Médio | Médio |
| 8 | Exportação CSV | Alto (UX) | Médio |
| 10 | Enriquecer em lote | Alto (UX) | Médio |
| 1 | Refatoração do monolito | Alto (manutenção) | Alto |
| 4 | Validação web na busca reversa | Médio | Médio |
| 9 | Persistência do contexto seller | Baixo | Baixo |

