

## Diagnóstico: Por que O2 Inc e 4cinco nao apareceram + Timeout

### Problemas identificados

**1. Timeout na `national-search` (erro principal na screenshot)**

O erro "cancelando a instrução devido ao tempo limite da instrução" ocorre porque a query SQL tem 2 subqueries correlacionadas (`num_filiais` e `num_ufs`) que fazem scan completo na tabela de 50M+ registros para CADA linha retornada. Com `LIMIT 2000`, isso significa 2000 x 2 subqueries = 4000 scans extras.

**2. Cobertura CNAE limitada nos perfis de compradores**

A busca que rodou para a Vispe gerou perfis com CNAE `6920` (contabilidade/consultoria). Se O2 Inc e 4cinco estão registradas sob CNAEs diferentes (ex: `7020` gestão empresarial, `6201` software, `7319` marketing), elas nunca seriam encontradas. O sistema depende 100% dos prefixos CNAE gerados pela IA.

**3. Sem busca por nome**

Atualmente não existe forma de buscar uma empresa específica por nome na base nacional. Se o usuário sabe que "O2 Inc" é um comprador relevante, não consegue adicioná-la diretamente.

### Plano de correção

#### 1. Otimizar `national-search` para eliminar timeout

Remover as subqueries correlacionadas `num_filiais` e `num_ufs` da query principal. Essas informações são "nice to have" mas causam timeout em bases grandes. Substituir por valores default (1) e calcular sob demanda apenas no enriquecimento individual.

**Arquivo**: `supabase/functions/national-search/index.ts`
- Remover as 2 subqueries `(SELECT COUNT(*) FROM estabelecimentos e2 ...)` e `(SELECT COUNT(DISTINCT e3.uf) ...)`
- Simplificar o SELECT para usar apenas joins diretos
- Adicionar `statement_timeout` de 25s na conexão para evitar travamento

#### 2. Ampliar cobertura CNAE no `parse-seller-intent`

Atualizar o prompt do `ai-analyze` para o tipo `parse-seller-intent` para gerar perfis com CNAEs mais amplos, incluindo:
- Consultoria de gestão (7020)
- Atividades de sedes de empresas (7010)
- Software/TI (62xx) para compradores tech-enabled
- Holdings (6462)

**Arquivo**: `supabase/functions/ai-analyze/index.ts` (bloco parse-seller-intent)

#### 3. Respeitar filtros geográficos corretamente

Na busca de compradores (linhas 1053-1063 do Matching.tsx), o campo `target_state` é passado condicionalmente com `search_nationwide`. Garantir que quando o usuário não marca "nacional", o estado do vendedor é respeitado; e quando marca, vai sem filtro de estado.

Atualmente isso já funciona corretamente no código (linha 1058), mas o perfil da IA pode definir `search_nationwide: true` ignorando a intenção do usuário. Corrigir para que o estado do vendedor seja sempre enviado quando não há filtro explícito.

**Arquivo**: `src/pages/Matching.tsx` linha 1058

### Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| `national-search/index.ts` | Remover subqueries `num_filiais`/`num_ufs`, adicionar `statement_timeout` |
| `ai-analyze/index.ts` | Ampliar CNAEs no prompt `parse-seller-intent` (7020, 7010, 62, 6462) |
| `Matching.tsx` linha 1058 | Garantir que estado do vendedor seja respeitado quando `search_nationwide` = false |

### Detalhes técnicos

A query otimizada ficará:
```sql
SELECT DISTINCT ON (e.cnpj_basico)
  e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj_completo,
  e.cnpj_basico, e.nome_fantasia, e.cnae_fiscal_principal,
  e.uf, e.municipio, e.situacao_cadastral,
  em.razao_social, em.capital_social, em.porte_empresa
FROM estabelecimentos e
INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
WHERE ...
ORDER BY e.cnpj_basico, ...
LIMIT ...
```

Sem as subqueries, a query deve rodar em 2-5s em vez de dar timeout.

O `statement_timeout` será configurado na conexão:
```ts
await client.queryObject("SET statement_timeout = '25s'");
```

