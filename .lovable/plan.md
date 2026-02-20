
## Aprofundamento Inteligente das Empresas Pré-Selecionadas

### O Problema Atual

O `DeepDiveDialog` e o edge function `company-deep-dive` já existem, mas são básicos:
- Estimativa de receita usa apenas: `benchmark_setor × regime_fiscal × capital_ratio × localização`
- Não há estimativa de funcionários, nem faixa de cluster
- Não há cálculo de massa salarial estimada
- Não há análise de maturidade (idade vs. funcionários)
- A IA recebe os dados brutos e gera um texto genérico sem estrutura

### A Nova Arquitetura: Motor de Inteligência de 5 Camadas

Cada empresa pré-selecionada passará por 5 layers de análise determinística ANTES da IA:

```text
[BrasilAPI: dados do CNPJ]
        ↓
Layer 1: Capital Social → Cluster de Porte
Layer 2: CNAE → Modelo de Negócio + Benchmarks Setoriais
Layer 3: Idade da Empresa → Sinal de Maturidade/Crescimento
Layer 4: Estimativa de Funcionários (por faixa)
Layer 5: Massa Salarial Estimada → Faturamento por Inversão
        ↓
[IA: análise qualitativa sobre dados estruturados]
```

---

### Detalhamento de Cada Layer

**Layer 1 — Capital Social → Cluster de Porte**
```typescript
function capitalCluster(capital: number): { label: string; tier: number } {
  if (capital < 10_000)   return { label: "Micro informal", tier: 1 };
  if (capital < 100_000)  return { label: "Micro estruturada", tier: 2 };
  if (capital < 500_000)  return { label: "Pequena", tier: 3 };
  if (capital < 2_000_000) return { label: "Média estruturada", tier: 4 };
  if (capital < 10_000_000) return { label: "Grande / Tese definida", tier: 5 };
  return { label: "Corporação", tier: 6 };
}
```

**Layer 2 — CNAE → Modelo de Negócio**

Expansão dos benchmarks setoriais com 3 métricas por setor:
- `payroll_pct`: % da receita representado pela folha salarial
- `rev_per_employee`: receita por funcionário (em R$)
- `margin_profile`: "alta margem", "margem baixa / giro alto", "previsível", etc.

```typescript
const CNAE_BUSINESS_MODEL: Record<string, {
  payroll_pct: number;
  rev_per_employee: number;
  margin_profile: string;
  model_label: string;
}> = {
  "Tecnologia":   { payroll_pct: 0.40, rev_per_employee: 500_000, margin_profile: "Alta margem", model_label: "Software / SaaS" },
  "Comércio":     { payroll_pct: 0.12, rev_per_employee: 200_000, margin_profile: "Margem baixa, giro alto", model_label: "Distribuição / Varejo" },
  "Indústria":    { payroll_pct: 0.20, rev_per_employee: 250_000, margin_profile: "Capital intensivo", model_label: "Produção industrial" },
  "Saúde":        { payroll_pct: 0.35, rev_per_employee: 180_000, margin_profile: "Estável regulado", model_label: "Serviços de saúde" },
  "Logística":    { payroll_pct: 0.25, rev_per_employee: 200_000, margin_profile: "Margem operacional apertada", model_label: "Transporte / Armazenagem" },
  "Agronegócio":  { payroll_pct: 0.15, rev_per_employee: 300_000, margin_profile: "Cíclico / Commodity", model_label: "Produção agrícola" },
  "Finanças":     { payroll_pct: 0.30, rev_per_employee: 400_000, margin_profile: "Alta alavancagem", model_label: "Serviços financeiros" },
  "Educação":     { payroll_pct: 0.45, rev_per_employee: 120_000, margin_profile: "Escala de alunos", model_label: "Ensino e treinamento" },
  "Construção":   { payroll_pct: 0.22, rev_per_employee: 220_000, margin_profile: "Ciclo longo", model_label: "Incorporação / Obras" },
  "Energia":      { payroll_pct: 0.18, rev_per_employee: 350_000, margin_profile: "Capital intensivo regulado", model_label: "Geração / Distribuição" },
  "Imobiliário":  { payroll_pct: 0.20, rev_per_employee: 250_000, margin_profile: "Ciclo longo / Ativo intensivo", model_label: "Gestão imobiliária" },
  "Serviços":     { payroll_pct: 0.38, rev_per_employee: 150_000, margin_profile: "Serviço profissional", model_label: "Prestação de serviços" },
};
```

**Layer 3 — Idade da Empresa → Sinal de Maturidade**

Cruzamento entre anos de existência e porte para classificar a empresa:
```typescript
function maturitySignal(yearsActive: number, capitalTier: number): {
  signal: "crescimento_acelerado" | "maturidade_consolidada" | "estagnacao_estrutural" | "startup_nascente";
  label: string;
  insight: string;
}
```

- < 3 anos, tier 4+: "Crescimento acelerado — alto potencial, alto risco"
- > 15 anos, tier 2-3: "Estagnação estrutural — cuidado com EBITDA"
- 5-15 anos, tier 3-5: "Maturidade consolidada — perfil ideal para M&A"
- < 2 anos qualquer: "Empresa nascente — DD aprofundada necessária"

**Layer 4 — Estimativa de Funcionários por Faixa**

Derivado do cruzamento: capital social + setor + localização:
```typescript
// rev_per_employee do setor → funcionários estimados
const estimatedEmployees = estimatedRevenue / sectorModel.rev_per_employee;

// Enquadrar na faixa de cluster
function employeeCluster(n: number): string {
  if (n < 10)  return "1–10";
  if (n < 30)  return "10–30";
  if (n < 80)  return "30–80";
  if (n < 200) return "80–200";
  if (n < 500) return "200–500";
  return "500+";
}
```

**Layer 5 — Massa Salarial → Faturamento por Inversão**

O método mais inteligente, conforme descrito pelo usuário:
```typescript
const salarioMedioSetor: Record<string, number> = {
  "Tecnologia": 8_000,
  "Comércio": 2_500,
  "Saúde": 4_500,
  // ...
};

// Estimativa por massa salarial
const avgSalary = salarioMedioSetor[sector];
const estimatedEmployeesCount = estimatedEmployees; // do layer 4
const monthlyPayroll = avgSalary * estimatedEmployeesCount;
const annualPayroll = monthlyPayroll * 12;
const revenueFromPayroll = annualPayroll / sectorModel.payroll_pct;

// Score de confiança cruzado (dois métodos)
const revMethod1 = estimatedRevenueBenchmark; // método antigo
const revMethod2 = revenueFromPayroll;        // método novo (massa salarial)
const convergence = Math.abs(revMethod1 - revMethod2) / Math.max(revMethod1, revMethod2);
// convergence < 0.3 → alta confiança (os dois métodos concordam)
```

---

### O que será alterado

**1. `supabase/functions/company-deep-dive/index.ts`**

Adicionar as 5 layers determinísticas antes da IA:

- Expandir `SECTOR_BENCHMARKS` com `CNAE_BUSINESS_MODEL` (payroll_pct, rev_per_employee, margin_profile, model_label)
- Adicionar tabela de salários médios por setor `AVG_SALARY_BY_SECTOR`
- Implementar funções: `capitalCluster()`, `maturitySignal()`, `employeeCluster()`, `calcMassaSalarial()`
- Retornar novo objeto `intelligence` por empresa com todos os layers calculados
- Atualizar o prompt da IA para usar os dados estruturados (não mais dados brutos) e gerar análise em seções específicas: Porte Real, Maturidade, Estimativas Financeiras, Sinais de Alerta

**2. `src/components/DeepDiveDialog.tsx`**

Expandir a interface TypeScript para incluir o novo campo `intelligence`:
```typescript
interface Intelligence {
  capital_cluster: { label: string; tier: number };
  employee_cluster: string;
  estimated_employees: number;
  maturity_signal: { signal: string; label: string; insight: string };
  business_model: { model_label: string; margin_profile: string; payroll_pct: number };
  revenue_method1_brl: number;  // benchmark setorial
  revenue_method2_brl: number;  // inversão massa salarial
  monthly_payroll_brl: number;
  annual_payroll_brl: number;
  convergence_pct: number;      // % de divergência entre os 2 métodos
  confidence_score: number;
}
```

Redesenhar o card de cada empresa com seções visuais:

- **Seção "Radiografia da Empresa"**: capital cluster (badge colorido por tier), maturidade (badge com ícone de sinal), modelo de negócio
- **Seção "Estimativa de Equipe"**: faixa de funcionários em destaque visual + salário médio estimado + massa salarial mensal
- **Seção "Estimativa de Faturamento (2 métodos)"**: lado a lado, Método 1 (Benchmark Setorial) vs Método 2 (Inversão Massa Salarial), com indicador de convergência
- **Seção "Sinais de Alerta"**: ícones coloridos por criticidade (ex: "Empresa antiga com capital baixo → risco de estagnação")

---

### Nova UI do DeepDiveDialog

```text
┌──────────────────────────────────────────────────────────┐
│  EMPRESA XYZ LTDA  ●  ATIVA  ●  CNPJ: 12.345.678/0001-99 │
├──────────────────────────────────────────────────────────┤
│  RADIOGRAFIA                                              │
│  [Pequena estruturada]  [Maturidade consolidada ●12 anos] │
│  Modelo: Software / SaaS  ·  Margem: Alta                 │
├──────────────────────────────────────────────────────────┤
│  ESTIMATIVA DE EQUIPE                                     │
│  Faixa: 30–80 funcionários                               │
│  Salário médio setor: R$ 8.000/mês                       │
│  Massa salarial estimada: R$ 400.000/mês                  │
├──────────────────────────────────────────────────────────┤
│  FATURAMENTO (2 MÉTODOS)                                  │
│  Método 1 — Benchmark:     R$ 5.000.000/ano              │
│  Método 2 — Massa Salarial: R$ 6.000.000/ano             │
│  Convergência: 83% ●● Alta confiança                      │
├──────────────────────────────────────────────────────────┤
│  ANÁLISE IA                                               │
│  "Esta empresa apresenta perfil de crescimento...         │
│   Pontos de atenção: ... Recomendação: ..."               │
└──────────────────────────────────────────────────────────┘
```

---

### Arquivos a modificar

1. `supabase/functions/company-deep-dive/index.ts` — 5 layers de inteligência + prompt IA estruturado
2. `src/components/DeepDiveDialog.tsx` — nova interface TypeScript + redesign visual dos cards
