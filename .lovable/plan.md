
## Duas Melhorias nos Cards de Resultado e no Wizard Step 1

### O que será feito

**Melhoria 1 — Badge de Capital Social no card de resultado**

Hoje o card mostra `Receita: N/A · EBITDA: N/A` para todas as empresas da Base Nacional (linha 1391-1394), porque esses campos são sempre nulos. A informação que existe é o `capital_social`, que está embutida na `description` com formato `"CNAE: 6141-6/01 | Porte: 01 | Capital Social: R$2.300K"`.

A mudança: extrair o capital social da `description` da empresa e exibir como badge visível no card, ao lado do setor e localização. Isso permite ao usuário confirmar imediatamente que os resultados são provedores regionais (capital R$500K–R$5M) e não operadoras nacionais (capital R$1B+).

**Localização exata da mudança:** linha 1371-1380 (bloco de badges no topo do card) e linha 1391-1397 (mini stats row).

Novo badge no bloco de badges do card:
```
[Finance] [SP, Campinas] [Capital: R$2,3M] [Dados estimados]
```

E na mini stats row, substituir "Receita: N/A · EBITDA: N/A" por:
```
Capital Social: R$2,3M · CNAE: 6141-6/01 · 34% dados
```

---

**Melhoria 2 — Campo "Meu faturamento anual" no Wizard Step 1**

Hoje o `max_capital_social` e `buyer_revenue_brl` só são preenchidos se o usuário escrever texto no campo de linguagem natural (ex: "fatura R$5M/ano"). Se o usuário usar apenas os selects do Wizard, esses valores ficam nulos e o filtro cai no `SECTOR_DEFAULT_MAX_CAPITAL` genérico — ou sem cap se o setor não tiver cap padrão.

A mudança: adicionar um campo de input numérico "Meu faturamento anual (R$)" no card "Alvo Principal" do Wizard Step 1, abaixo dos selects de Setor e Tamanho. Quando preenchido, ele alimenta diretamente `nlExtraParams.buyer_revenue_brl` e `nlExtraParams.max_capital_social` (= faturamento × 0.5), melhorando a qualidade do filtro mesmo sem linguagem natural.

**Localização exata da mudança:** linhas 1016-1039 (card "Alvo Principal" no Step 1), adicionar um terceiro campo após os dois selects existentes.

Também: exibir esse valor no resumo do Step 3 (linhas 1178-1217) como nova célula "Faturamento".

---

### Detalhes técnicos

**Extração do capital social da description:**

A `description` das empresas nacionais tem formato padrão gerado pelo `national-search`:
```
"CNAE: 6141-6/01 | Porte: 01 | Capital Social: R$2300K"
```

Função helper a ser adicionada:
```typescript
function extractCapitalFromDescription(desc: string | null): number | null {
  if (!desc) return null;
  // Match "Capital Social: R$2300K" or "R$1.5M" or "R$500"
  const m = desc.match(/Capital Social:\s*R\$(\d+[\.,]?\d*)(K|M|B)?/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(",", "."));
  const unit = (m[2] || "").toUpperCase();
  if (unit === "B") return val * 1e9;
  if (unit === "M") return val * 1e6;
  if (unit === "K") return val * 1e3;
  return val;
}
```

**Extração do CNAE real da description:**

```typescript
function extractCnaeFromDescription(desc: string | null): string | null {
  if (!desc) return null;
  const m = desc.match(/CNAE:\s*([\d\-\/]+)/);
  return m ? m[1] : null;
}
```

**Novo estado para faturamento do comprador:**

```typescript
const [buyerRevenueBrl, setBuyerRevenueBrl] = useState<string>("");
```

Quando preenchido, atualiza `nlExtraParams`:
```typescript
const handleBuyerRevenueChange = (val: string) => {
  setBuyerRevenueBrl(val);
  const numVal = Number(val);
  if (numVal > 0) {
    setNlExtraParams(prev => ({
      ...prev,
      buyer_revenue_brl: numVal,
      max_capital_social: numVal * 0.5,
    }));
  } else {
    setNlExtraParams(prev => {
      const next = { ...prev };
      delete next.buyer_revenue_brl;
      delete next.max_capital_social;
      return next;
    });
  }
};
```

---

### Arquivos a modificar

Apenas **`src/pages/Matching.tsx`** — dois blocos:

1. **Linhas ~631-637** — adicionar `extractCapitalFromDescription` e `extractCnaeFromDescription` após `formatCurrency`

2. **Linhas ~196-213** — adicionar estado `buyerRevenueBrl` e handler `handleBuyerRevenueChange`

3. **Linhas ~1016-1039** — card "Alvo Principal" no Step 1: adicionar campo de faturamento anual com helper text explicando que alimenta o filtro de capital

4. **Linhas ~1371-1397** — bloco de badges no card de resultado: adicionar badge de Capital Social; atualizar mini stats row com capital + CNAE real

5. **Linhas ~1178-1217** — Step 3 resumo: adicionar célula "Faturamento do Comprador" quando preenchido

---

### UX final do card de resultado

```
┌─────────────────────────────────────────────┐
│ PROVENET INTERNET LTDA          Score: 78   │
│ [Telecom] [Florianópolis, SC]               │
│ [Capital: R$2,3M] [Dados estimados]         │
│                                             │
│ Capital Social: R$2,3M · CNAE: 6141-6/01   │
│ ████████████████░░░░ 78                    │
│                                             │
│ [Shortlist] [Contatado] [Ignorar]  [IA ✦]  │
└─────────────────────────────────────────────┘
```

O badge `Capital: R$2,3M` é imediatamente comparável com `Capital: R$1,2B` (Vivo) — o usuário sabe que o filtro está funcionando.
