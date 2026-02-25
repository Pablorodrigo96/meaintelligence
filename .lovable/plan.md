

## Funil de 200 + Validação Perplexity Paralela

### Conceito

Concordo totalmente com a lógica. O fluxo fica:

```text
┌─────────────────────────────────────────────────────┐
│  CAMADA 1: Base Nacional (custo zero de IA)         │
│  national-search → 2000 empresas brutas             │
│  scoring local → 200 empresas qualificadas          │
│  Exibe todas 200 no funil (sem IA)                  │
└─────────────┬───────────────────────────────────────┘
              │ paralelo
┌─────────────▼───────────────────────────────────────┐
│  CAMADA 2: Perplexity Sonar (1 query por execução)  │
│  "Top [setor] empresas em [estado/cidade]"          │
│  Retorna ~10-20 nomes reais do mercado              │
└─────────────┬───────────────────────────────────────┘
              │ cruzamento
┌─────────────▼───────────────────────────────────────┐
│  CAMADA 3: Cross-reference & Boost                  │
│  Empresa está na lista 200 E no Perplexity?         │
│  → web_validated = true, quality_score += 15        │
│  → Badge "Validada Google" com ícone Globe          │
│  → Sobe naturalmente no ranking                     │
└─────────────────────────────────────────────────────┘
```

### Pré-requisito: Conectar Perplexity

O projeto não tem Perplexity configurado ainda. Será necessário conectar via conector nativo do Lovable antes de implementar.

### Mudanças técnicas

#### 1. Edge Function: `perplexity-validate` (novo)

Nova edge function que recebe setor + estado/cidade e faz **1 query** ao Perplexity Sonar:

- Prompt: `"Liste as principais empresas de [setor] em [estado]. Inclua nome fantasia, cidade e porte aproximado."`
- Modelo: `sonar` (mais barato: ~$0.005/query)
- Retorna: Array de nomes de empresas encontradas
- Custo: ~R$0.80/dia para 100 consultas (~R$24/mês)

#### 2. `src/pages/Matching.tsx` - Ampliar funil para 200

**Linha 447**: Mudar `slice(0, 20)` para `slice(0, 200)`:
```text
const top = qualified.slice(0, 200);
```

Salvar as 200 no banco (não apenas 20). O usuário vê todas as 200 na aba de resultados, paginadas ou com scroll.

#### 3. `src/pages/Matching.tsx` - Chamada paralela ao Perplexity

Dentro de `runMatchMutation`, após o scoring local das 200, disparar em paralelo:

```text
const [scored200, perplexityNames] = await Promise.all([
  // scoring local (já existe)
  scoringLocal(),
  // Perplexity query (nova)
  supabase.functions.invoke("perplexity-validate", {
    body: { sector, state, city }
  })
]);
```

#### 4. Cross-reference: Boost por validação web

Após receber os nomes do Perplexity, fazer fuzzy match (normalização de texto: lowercase, remove acentos, remove "ltda/eireli/sa") contra os 200 nomes da base:

```text
Para cada empresa nas 200:
  SE nome_fantasia OU razao_social aparece nos resultados Perplexity:
    quality_score += 15
    web_validated = true
    web_rank = posição no resultado Perplexity (1-20)
```

Empresas validadas sobem no ranking naturalmente pelo boost no quality_score (que já pesa 30% no final_score).

#### 5. UI: Badge "Validada Web" + indicador visual

- Badge verde com ícone Globe: `"Validada Web"` para empresas com `web_validated = true`
- Na lista de 200, as validadas ficam naturalmente no topo pelo score
- Adicionar coluna/indicador de `web_rank` (posição no Google/Perplexity)

#### 6. UI: Paginação ou "Ver mais" para 200 empresas

Como agora são 200 (não 20), adicionar:
- Mostrar as primeiras 20 por padrão (como hoje)
- Botão "Ver mais" que carrega mais 20 por vez
- Ou filtro por `web_validated` para ver só as validadas

#### 7. `MatchDimensions` - Expandir interface

```text
web_validated: boolean;
web_rank: number | null;
```

### Fluxo do usuário

1. Configura critérios normalmente (setor, estado, CNAE, etc.)
2. Clica "Buscar na Base Nacional"
3. Motor busca 2000 empresas, filtra/pontua 200 (custo zero)
4. **Em paralelo**, Perplexity faz 1 busca semântica pelo setor+região
5. Cross-reference: empresas que aparecem nos dois recebem boost
6. Resultado: 200 empresas ordenadas, com as validadas web no topo
7. Badge "Validada Web" indica presença digital confirmada

### Custo mensal estimado

| Componente | Custo/mês (100 queries/dia) |
|---|---|
| Base Nacional (2000 empresas) | R$0 |
| Scoring local (200 empresas) | R$0 |
| Perplexity Sonar (1 query/execução) | ~R$24 |
| **Total** | **~R$24/mês** |

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/perplexity-validate/index.ts` | Criar - Edge function para query Perplexity |
| `src/pages/Matching.tsx` | Modificar - Ampliar para 200, chamada paralela, cross-reference, UI badges, paginação |

### Pré-requisito

Antes de implementar, será necessário conectar o conector Perplexity do Lovable para disponibilizar a API key como variável de ambiente nas edge functions.

### Notas técnicas

- O fuzzy matching de nomes usa normalização simples (lowercase + remove sufixos empresariais) -- não precisa de lib externa
- Se Perplexity falhar ou timeout, as 200 continuam funcionando normalmente sem boost (graceful degradation)
- O `web_validated` é salvo no `ai_analysis` JSON do match, não precisa de nova coluna no banco

