

## Plano: Corrigir erros de build no Matching.tsx

O arquivo `Matching.tsx` foi corrompido na última edição — caiu de 3.300+ linhas para 1.299 linhas, perdendo a maior parte do código funcional. Além disso, o código restante referencia estruturas que não existem no banco de dados.

### Problemas identificados

**1. Tabela `buyers` não existe no banco**
- Linhas 387 e 500: `supabase.from("buyers")` — esta tabela nunca foi criada
- O sistema original não usava uma tabela `buyers` separada; os perfis de compradores eram derivados dos critérios de busca (`match_criteria`) e dos dados do wizard

**2. Colunas erradas na tabela `matches`**
- O código usa `company_id`, `score`, `notes`, `user_id` — mas a tabela real tem `seller_company_id`, `compatibility_score`, sem `notes` nem `user_id`
- Linha 415: tenta gravar `notes` que não existe
- Linha 440: insere `company_id` e `score` em vez de `seller_company_id` e `compatibility_score`

**3. DeepDiveDialog chamado com props erradas**
- Linha 1296: passa `company` e `buyer` mas o componente espera `companies: any[]`

**4. Arquivo truncado — perdeu ~2.000 linhas**
- Todo o sistema de busca nacional, validação web, scoring, cards de resultado, busca reversa, formulários, analytics — tudo foi perdido

### Solução

A única solução viável é **reverter o `Matching.tsx` para a versão anterior funcional** (antes da última edição que o corrompeu) e depois aplicar cirurgicamente apenas as 3 correções planejadas:

1. **Regex fix no `ai-analyze`** — já foi deployado com sucesso
2. **Fallback de parsing** dos `buyer_profiles` — adicionar `Array.isArray(parsed) ? parsed : []`
3. **Máscaras BRL** nos inputs financeiros — `formatBRL`/`parseBRL`

### Ação necessária

Reverter `src/pages/Matching.tsx` para a versão imediatamente anterior (a de ~3.335 linhas que estava funcional), e depois aplicar as correções pontuais de máscara BRL e fallback de parsing.

### Detalhes técnicos

As queries do Supabase precisam usar os nomes corretos das colunas:
- `seller_company_id` (não `company_id`)
- `compatibility_score` (não `score`)
- Sem `notes` na tabela `matches`
- Sem tabela `buyers` — o sistema usa `match_criteria` + perfis gerados pela IA
- `DeepDiveDialog` recebe `companies: any[]`, não `company` + `buyer`

