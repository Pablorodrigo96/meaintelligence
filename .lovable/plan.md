

## Plano: Rastrear origem das empresas + melhorar aba Empresas + fix build error

### Contexto

As empresas mineradas pelo Matching JÁ são salvas na tabela `companies` (linhas 646-653 e 1201-1208 do Matching.tsx). Porém, não há como distinguir se uma empresa foi cadastrada manualmente ou veio de uma busca. E a aba "Empresas" mostra todas sem contexto de origem.

### 1. Adicionar coluna `source` na tabela `companies`

Migração SQL:
```sql
ALTER TABLE companies ADD COLUMN source text DEFAULT 'manual';
```

Valores possíveis: `manual`, `target_search`, `buyer_search`, `enriched`

### 2. Matching.tsx — gravar `source` ao inserir empresas

- Na busca de alvos (linha 648): adicionar `source: "target_search"`
- Na busca de compradores (linha 1203): adicionar `source: "buyer_search"`

### 3. Companies.tsx — exibir badge de origem + filtro

- Adicionar badge colorido no card: "Manual" (cinza), "Busca Alvos" (azul), "Busca Compradores" (verde)
- Adicionar filtro dropdown "Origem" ao lado do filtro de setor
- Exibir CNPJ formatado no card quando disponível
- Exibir contagem total de empresas no header

### 4. Fix build error TS1128 (Matching.tsx linha 3334)

Reescrever as linhas finais (3333-3335) para eliminar caractere invisível que causa o erro de compilação.

### Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Adicionar coluna `source` em `companies` |
| `Matching.tsx` linhas 648, 1203 | Gravar `source` ao inserir empresas |
| `Matching.tsx` linhas 3333-3335 | Fix TS1128 (caractere invisível) |
| `Companies.tsx` | Badge de origem, filtro por origem, CNPJ formatado, contagem |

