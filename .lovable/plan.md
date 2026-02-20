
## Busca Inteligente por Linguagem Natural + Filtro de Subtipo CNAE

### Diagnóstico dos 3 Problemas

**Problema 1 — Itaú aparece:**
O `CNAE_SECTOR_MAP` mapeia prefixos `64` (bancos), `65` (seguros), `66` (auxiliares financeiros), `69` (serviços contábeis/jurídicos) e `70` (consultoria empresarial) para o mesmo setor `"Finance"`. A query no BD filtra apenas por esse setor amplo, sem distinguir banco de consultoria.

**Problema 2 — Concorrentes não aparecem:**
A query ordena por `capital_social DESC NULLS LAST`. Grandes bancos têm capital social de bilhões → dominam os primeiros 80 resultados. Consultorias financeiras com capital de R$ 50K–500K ficam na página 5.000 e nunca chegam ao matching.

**Problema 3 — Sem linguagem natural:**
O usuário precisa saber o nome exato do setor/porte antes de pesquisar. Não existe forma de dizer "quero empresas parecidas com a minha de gestão financeira" e deixar a IA parametrizar.

---

### Solução: 3 Mudanças Integradas

---

### Mudança 1 — Decomposição do CNAE em Subtipos ("Finance" → 4 subtipos)

Atualmente o setor Finance engloba tudo. Vamos criar um segundo nível de mapeamento:

```text
Finance
├── Finance:Banking       → CNAE 64xx (bancos, cooperativas de crédito)
├── Finance:Insurance     → CNAE 65xx (seguros, previdência)
├── Finance:Markets       → CNAE 66xx (bolsa, fundos, corretoras)
├── Finance:Consulting    → CNAE 69xx + 70xx (consultoria, contabilidade)
└── Finance:Other         → demais
```

Isso permite que quando o usuário (via IA) diz "gestão financeira / consultoria", o sistema filtre **especificamente** `CNAE 69xx` e `70xx`, excluindo bancos (`64xx`).

O mesmo princípio se aplica a outros setores amplos como Technology (Software vs Hardware vs Telecom).

---

### Mudança 2 — Ordenação Inteligente na Query do BD

O problema é ordenar por `capital_social DESC`. Isso favorece gigantes.

Novo critério de ordenação: usar `capital_social` relativo ao porte esperado. Para consultorias pequenas, empresas com capital de R$ 50K–2M são mais relevantes que bancos com R$ 10B.

Implementação em `national-search/index.ts`:

Quando `target_sector` inclui subtipo (ex: `Finance:Consulting`), adicionar **filtro hard** pelos prefixos CNAE exatos e **limitar capital_social máximo** para evitar que corporações dominem:

```sql
-- Antes (genérico):
ORDER BY em.capital_social DESC NULLS LAST

-- Depois (com faixa de capital relevante):
-- Se buyer_revenue informado (ex: R$ 5M), buscar empresas com capital entre 5% e 500% do buyer
-- Isso elimina o Itaú automaticamente (capital R$ 100B vs buyer R$ 5M = fora de faixa)
ORDER BY ABS(LOG(em.capital_social + 1) - LOG($target_capital + 1)) ASC NULLS LAST
-- Ordena por quem tem capital_social mais próximo do target
```

Alternativamente (mais simples): adicionar filtro `capital_social BETWEEN min AND max` calculado com base no faturamento do comprador que a IA vai informar.

---

### Mudança 3 — Campo de Linguagem Natural com IA como Parametrizador

Adicionar um novo campo no wizard Step 1: **"Descreva o que você procura"** (textarea livre).

Quando o usuário escreve: *"Sou uma consultoria de gestão financeira faturando 5M/ano. Quero outras consultorias financeiras menores que possam ser complementares ou que eu possa adquirir."*

A IA (chamada via `ai-analyze` com novo tipo `"parse-intent"`) extrai:
- `target_sector`: `"Finance:Consulting"` 
- `target_size`: `"Small"` / `"Startup"`
- `max_capital_social`: R$ 5M (evita gigantes)
- `buyer_revenue`: R$ 5M (âncora para filtragem de porte)
- `intent`: `"acquisition"` vs `"partnership"`
- `cnae_subtype_filter`: `["69", "70"]` (exclui `64`, `65`, `66`)

Esses parâmetros são preenchidos automaticamente nos campos do formulário E passados para o `national-search` como filtros adicionais.

---

### Detalhamento das Alterações por Arquivo

**1. `supabase/functions/ai-analyze/index.ts`**

Adicionar novo case `"parse-intent"`:

```typescript
case "parse-intent": {
  systemPrompt = `Você é um especialista em M&A brasileiro. O usuário vai descrever com linguagem informal o que procura em uma aquisição. Extraia os parâmetros de busca e retorne JSON estruturado.`;
  
  userPrompt = `Texto do usuário: "${data.text}"
  
  Retorne JSON:
  {
    "target_sector": "Finance|Technology|Healthcare|...",
    "cnae_subtype": "Banking|Insurance|Consulting|Software|...",
    "cnae_prefixes": ["64", "65"] // prefixos CNAE para filtrar no BD,
    "target_size": "Startup|Small|Medium|Large|Enterprise",
    "buyer_revenue_brl": 5000000, // faturamento declarado pelo usuário,
    "max_capital_social_brl": 5000000, // capital máximo para evitar gigantes,
    "min_capital_social_brl": 10000,
    "intent": "acquisition|partnership|synergy",
    "suggested_notes": "frase descritiva para contextualizar a IA de matching"
  }`;
  break;
}
```

**2. `supabase/functions/national-search/index.ts`**

Adicionar suporte a `cnae_prefixes` e `capital_range` no body:

```typescript
const {
  target_sector,
  target_state,
  target_size,
  cnae_prefixes,        // NOVO: array de prefixos específicos ex: ["69", "70"]
  min_capital_social,   // NOVO: âncora de tamanho do comprador
  max_capital_social,   // NOVO: evitar gigantes irrelevantes
  raw = false,
  limit,
} = body;

// CNAE filter por prefixo exato (sobrescreve o filtro de setor genérico)
if (cnae_prefixes && cnae_prefixes.length > 0) {
  const cnaeLikes = cnae_prefixes.map((p: string) => `e.cnae_fiscal_principal LIKE '${p}%'`).join(" OR ");
  conditions.push(`(${cnaeLikes})`);
} else if (target_sector) {
  // fallback: filtro genérico de setor
  ...
}

// Capital range filter (evita o Itaú aparecer)
if (max_capital_social) {
  params.push(String(max_capital_social));
  conditions.push(`em.capital_social <= $${params.length}`);
}
if (min_capital_social) {
  params.push(String(min_capital_social));
  conditions.push(`em.capital_social >= $${params.length}`);
}
```

E mudar a ordenação para priorizar por proximidade de capital (quando disponível) ao invés de apenas `DESC`:

```sql
ORDER BY em.capital_social DESC NULLS LAST
-- substituído por:
ORDER BY ABS(em.capital_social - $target_capital) ASC NULLS LAST
```

**3. `src/pages/Matching.tsx`**

Adicionar no Wizard Step 1 um card de **Linguagem Natural**:

- Textarea: "Descreva o que você procura (ex: quero consultorias financeiras pequenas para aquisição)"
- Botão: "Deixar IA parametrizar" → chama `ai-analyze` com `type: "parse-intent"` 
- Ao retornar, preenche automaticamente os campos: setor, porte, notas estratégicas
- Mostra um resumo visual: "A IA entendeu: Consultoria Financeira (CNAE 69xx/70xx), Pequenas, Capital < R$ 5M"
- Badge de confirmação com opção de editar manualmente

Também adicionar ao `runMatchMutation`: passar `cnae_prefixes`, `min_capital_social`, `max_capital_social` extraídos pelo parse-intent para a chamada do `national-search`.

---

### Nova UX do Wizard Step 1

```text
┌────────────────────────────────────────────────────┐
│  💬 DESCREVA O QUE VOCÊ PROCURA (opcional)         │
│                                                    │
│  "Tenho uma consultoria financeira faturando       │
│   R$5M/ano e quero empresas similares para         │
│   adquirir ou fazer parceria..."                   │
│                                           [Analisar]│
├────────────────────────────────────────────────────┤
│  ✅ IA PARAMETRIZOU (clique para editar)            │
│  Setor: Consultoria Financeira (CNAE 69xx/70xx)    │
│  Porte: Startup a Pequena                          │
│  Capital alvo: R$ 50K – R$ 5M                     │
│  Intenção: Aquisição                               │
└────────────────────────────────────────────────────┘

[Perfil Investidor] continua igual abaixo...
```

---

### Arquivos a modificar

1. `supabase/functions/ai-analyze/index.ts` — novo case `"parse-intent"` para extrair parâmetros de linguagem natural
2. `supabase/functions/national-search/index.ts` — suporte a `cnae_prefixes`, `min_capital_social`, `max_capital_social` + ordenação por proximidade de capital
3. `src/pages/Matching.tsx` — card de linguagem natural no Step 1, chamada ao parse-intent, preenchimento automático dos filtros, passagem de parâmetros extras ao national-search
