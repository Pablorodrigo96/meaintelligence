

## Plano: Corrigir exibição de Faturamento, EBITDA e Funcionários nos cards

### Problema

1. **Faturamento estimado existe mas não aparece**: O `national-search` estima o faturamento corretamente, mas o card mostra apenas Capital Social/CNAE quando presentes — escondendo faturamento e EBITDA (linhas 2944-2965).
2. **EBITDA não é salvo**: Na inserção de empresas (linha 706), o campo `ebitda` não é incluído, então fica `null` no banco.
3. **Funcionários estimados não aparecem**: O badge de funcionários só aparece após enriquecimento Apollo. A estimativa pode ser derivada do faturamento/setor.

### Alterações

#### 1. `src/pages/Matching.tsx` — Salvar EBITDA na inserção (linha ~706)

Adicionar `ebitda: company.ebitda` ao insert de empresas:

```typescript
// ANTES (linha 706):
revenue: company.revenue, description: company.description,

// DEPOIS:
revenue: company.revenue, ebitda: company.ebitda, description: company.description,
```

#### 2. `src/pages/Matching.tsx` — Mostrar Faturamento + EBITDA + Capital Social + CNAE juntos (linhas 2942-2965)

Remover a lógica condicional que esconde receita/EBITDA quando capital/CNAE existem. Exibir **tudo junto**:

```typescript
{/* Mini stats row */}
<div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
  <span>Receita: {formatCurrency(m.companies?.revenue ?? null)}</span>
  <span>·</span>
  <span>EBITDA: {formatCurrency(m.companies?.ebitda ?? null)}</span>
  {(() => {
    const capital = extractCapitalFromDescription(m.companies?.description ?? null);
    const cnae = extractCnaeFromDescription(m.companies?.description ?? null);
    return (
      <>
        {capital && <><span>·</span><span>Capital: {formatCurrency(capital)}</span></>}
        {cnae && <><span>·</span><span className="font-mono">CNAE: {cnae}</span></>}
      </>
    );
  })()}
  <span>·</span>
  <Badge variant={completeness >= 60 ? "secondary" : "outline"} className={`text-[10px] ${completeness < 40 ? "text-warning" : ""}`}>
    {completeness}% dados
  </Badge>
</div>
```

#### 3. `src/pages/Matching.tsx` — Estimar funcionários a partir do faturamento/setor

Quando `employee_count` do Apollo não estiver disponível, calcular uma estimativa baseada no faturamento e no benchmark setorial (mesma lógica do `SECTOR_BENCHMARKS`):

```typescript
// No render do card, após parsedData:
const estimatedEmployees = (() => {
  if (parsedData.employee_count && parsedData.employee_count > 0) return parsedData.employee_count;
  const rev = m.companies?.revenue;
  if (!rev || rev <= 0) return null;
  const benchmarks: Record<string, number> = {
    "Technology": 500000, "Retail": 200000, "Manufacturing": 250000,
    "Healthcare": 180000, "Logistics": 200000, "Finance": 400000,
    "Education": 120000, "Real Estate": 250000, "Energy": 350000,
    "Telecom": 300000, "Agribusiness": 300000, "Other": 150000,
  };
  const revPerEmp = benchmarks[m.companies?.sector || "Other"] || 150000;
  return Math.max(1, Math.round(rev / revPerEmp));
})();
```

Badge atualizado para mostrar funcionários (estimados ou Apollo):

```typescript
{estimatedEmployees && estimatedEmployees > 0 && (
  <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600">
    <Users className="w-2.5 h-2.5 mr-0.5" />
    ~{estimatedEmployees} func.{parsedData.apollo_enriched ? "" : " (est.)"}
  </Badge>
)}
```

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Matching.tsx` linha 706 | Adicionar `ebitda: company.ebitda` ao insert |
| `src/pages/Matching.tsx` linhas 2942-2965 | Mostrar faturamento + EBITDA + capital + CNAE juntos (sem esconder) |
| `src/pages/Matching.tsx` cards | Estimar e exibir número de funcionários a partir de faturamento/setor |

Empresas já salvas sem EBITDA continuarão mostrando N/A até uma nova busca. Novas buscas salvarão o EBITDA corretamente.

