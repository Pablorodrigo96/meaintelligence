

## Plano: Badges Apollo + Persistência dos dados de enriquecimento

### Problema identificado

Os dados da Apollo (`apollo_enriched`, `employee_count`, `apollo_industry`, `decision_makers`) são atribuídos aos objetos em memória durante o Step 2.5, mas **não são persistidos** no `ai_analysis` JSON quando os matches são salvos no banco (linhas 1243-1254). Portanto, ao recarregar a página, esses dados se perdem e os badges nunca aparecem.

### Alterações

#### 1. Persistir dados Apollo no `ai_analysis` (linhas 1243-1254)

Ao montar o JSON de `ai_analysis` para cada match, incluir os campos Apollo do objeto `company`:

```typescript
ai_analysis: JSON.stringify({
  ...existingFields,
  apollo_enriched: company.apollo_enriched || false,
  employee_count: company.employee_count || null,
  apollo_industry: company.apollo_industry || null,
  decision_makers: company.decision_makers || [],
})
```

#### 2. Atualizar `parseAnalysis` (linha 918)

Adicionar extração de `apollo_enriched`, `employee_count`, `apollo_industry` do JSON parseado para disponibilizar na renderização dos cards.

#### 3. Adicionar badges visuais nos cards (após linha 2844)

Na área de badges dos cards de resultado (entre as badges existentes), adicionar:

- **Badge "Apollo"** — ícone Zap em roxo, visível quando `apollo_enriched === true`
- **Badge de funcionários** — ícone Users com contagem (ex: "45 func."), visível quando `employee_count > 0`
- **Badge de setor Apollo** — texto do setor Apollo quando disponível e diferente do setor já exibido

### Detalhes técnicos

Localização dos badges no código:
```
Linha 2841-2845: Badge "Enriquecida" (contactInfo)
→ APÓS esta badge, adicionar as 3 novas badges Apollo
```

Dados lidos do `ai_analysis` parseado (não do `m.companies`):
```typescript
const apolloEnriched = parsedData.apollo_enriched;
const employeeCount = parsedData.employee_count;
const apolloIndustry = parsedData.apollo_industry;
```

Renderização:
```tsx
{apolloEnriched && (
  <Badge className="text-[10px] bg-violet-500/15 text-violet-600 border-violet-500/30 border">
    <Zap className="w-2.5 h-2.5 mr-0.5" />Apollo
  </Badge>
)}
{employeeCount > 0 && (
  <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600">
    <Users className="w-2.5 h-2.5 mr-0.5" />{employeeCount} func.
  </Badge>
)}
{apolloIndustry && (
  <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
    {apolloIndustry}
  </Badge>
)}
```

### Resumo de alterações

| Arquivo | Linha(s) | Alteração |
|---------|----------|-----------|
| `Matching.tsx` | ~1243-1254 | Persistir `apollo_enriched`, `employee_count`, `apollo_industry`, `decision_makers` no `ai_analysis` JSON |
| `Matching.tsx` | ~918 | Extrair campos Apollo no `parseAnalysis` |
| `Matching.tsx` | ~2844 | Adicionar 3 badges visuais: Apollo, funcionários, setor |

