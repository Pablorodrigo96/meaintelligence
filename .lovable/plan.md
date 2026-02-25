

## Plano: Badge "Enriquecida" + Motor de Busca Reversa (Seller → Buyers)

### Parte 1: Badge "Enriquecida" no card compacto

Alteração simples no `src/pages/Matching.tsx`. A variável `contactInfo` já é calculada na linha 2199. Basta adicionar um badge na zona de badges (após linha 2273, junto aos outros badges) que aparece quando `contactInfo` existe.

**Arquivo: `src/pages/Matching.tsx`**
- Após o badge "Dados estimados" (~linha 2273), adicionar:
```tsx
{contactInfo && (
  <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 border">
    <UserCheck className="w-2.5 h-2.5 mr-0.5" />Enriquecida
  </Badge>
)}
```
- Garantir que `UserCheck` está importado do `lucide-react` (provavelmente já está)

---

### Parte 2: Matching Reverso — Encontrar compradores para um vendedor

#### Conceito

Hoje o fluxo é: **Comprador define critérios → Sistema encontra empresas-alvo (sellers)**.

O fluxo reverso é: **Assessor recebe um vendedor → Sistema identifica potenciais compradores no mercado**.

Para o exemplo dado: empresa de beneficiamento de arroz + cestas básicas, Gravataí/RS, lucro R$1.8M, pedindo R$3M.

Os possíveis compradores seriam:
1. **Concorrentes maiores** (consolidação horizontal) — outras empresas de beneficiamento de arroz/alimentos
2. **Empresas de cadeia a montante/jusante** (integração vertical) — distribuidoras de alimentos, redes de supermercados, cooperativas agrícolas
3. **Fundos de investimento** focados em agro/alimentos
4. **Empresas de setores adjacentes** querendo diversificar para alimentos

#### Arquitetura proposta

**Nova aba no módulo de Matching: "Buscar Compradores"**

O wizard terá um formulário diferente:

```text
┌────────────────────────────────────────────┐
│  Modo: [Buscar Alvos] [Buscar Compradores] │
├────────────────────────────────────────────┤
│  Dados do Vendedor:                        │
│  Nome da empresa: _______________          │
│  CNPJ: _______________                     │
│  Setor/CNAE: _______________               │
│  Estado/Cidade: _____ / _____              │
│  Faturamento anual: R$ _______             │
│  Lucro/EBITDA: R$ _______                  │
│  Valor pedido (asking price): R$ _______   │
│  Descrição do negócio: ________________    │
│                                            │
│  [Buscar Compradores Potenciais]           │
└────────────────────────────────────────────┘
```

**Lógica de busca de compradores (3 estratégias simultâneas):**

1. **Base Nacional — Consolidadores horizontais**
   - Buscar empresas com MESMO CNAE (ou prefixo) do vendedor
   - Porte igual ou maior (capital social > vendedor)
   - Mesma região ou nacional
   - Query: `cnae_prefixes` do vendedor + `min_capital_social` > capital do vendedor

2. **Base Nacional — Integradores verticais**
   - Usar a matriz `CNAE_VALUE_CHAIN` existente para identificar CNAEs upstream/downstream
   - Ex: arroz (CNAE 10.61) → buscar distribuidoras (46.3x), supermercados (47.1x), cooperativas agrícolas (01.xx)
   - Porte médio-grande

3. **IA — Análise estratégica de perfil de comprador ideal**
   - Novo tipo `parse-seller-intent` no `ai-analyze` que recebe os dados do vendedor e retorna:
     - Lista de perfis de compradores ideais (setor, porte, motivação)
     - CNAEs sugeridos para busca
     - Tese de investimento resumida
   - Usado para refinar as buscas nas camadas 1 e 2

**Scoring reverso (Buyer Fit Score):**

Para cada potencial comprador encontrado, calcular:
- **Capacity Fit** (0-100): O comprador tem capacidade financeira para pagar o asking price? (capital social vs asking price)
- **Sector Fit** (0-100): Sinergia setorial (mesmo CNAE, adjacente, vertical)
- **Size Fit** (0-100): Porte adequado (comprador deve ser >= vendedor)
- **Location Fit** (0-100): Proximidade geográfica
- **Strategic Fit** (0-100): Potencial de sinergia (consolidação, integração, diversificação)

### Alterações por arquivo

**Arquivo: `src/pages/Matching.tsx`**
- Adicionar toggle no topo: "Buscar Alvos" (atual) vs "Buscar Compradores" (novo)
- Novo estado `matchMode: "find-targets" | "find-buyers"`
- Quando `matchMode === "find-buyers"`, exibir formulário do vendedor em vez do wizard atual
- A lógica de resultados e cards pode ser reutilizada (mesma estrutura)

**Arquivo: `supabase/functions/ai-analyze/index.ts`**
- Novo case `parse-seller-intent`: recebe dados do vendedor, retorna perfis de compradores ideais com CNAEs sugeridos
- Novo case `match-buyers`: recebe vendedor + lista de candidatos, retorna scoring reverso

**Arquivo: `supabase/functions/national-search/index.ts`**
- Novo modo de busca `mode: "find-buyers"` que inverte a lógica:
  - Em vez de buscar empresas pequenas para um comprador grande, busca empresas maiores/iguais que poderiam comprar o vendedor
  - Filtros: mesmo CNAE ou cadeia vertical, capital social >= asking price * 0.3, porte >= vendedor

### Fluxo completo do exemplo

1. Assessor seleciona "Buscar Compradores"
2. Preenche: "Beneficiamento de arroz, cestas básicas, Gravataí RS, lucro 1.8M, pedindo 3M"
3. IA (`parse-seller-intent`) retorna:
   - Perfil 1: "Concorrentes - empresas de beneficiamento de grãos (CNAE 10.6x), porte médio-grande"
   - Perfil 2: "Distribuidoras de alimentos (CNAE 46.3x) buscando integração vertical"
   - Perfil 3: "Redes de supermercado regionais (CNAE 47.1x) querendo marca própria"
4. Sistema busca na Base Nacional com esses 3 perfis
5. Resultados exibidos com Buyer Fit Score e análise de motivação de compra
6. Assessor pode "Enriquecer" cada potencial comprador para obter contatos

### Dependências
- Nenhuma nova — reutiliza `national-search`, `ai-analyze`, `company-enrich`
- Mesmo banco externo de 50M+ registros

