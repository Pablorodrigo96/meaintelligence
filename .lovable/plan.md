

## Evolucao do Motor de Sinergia: GPI + Gargalos por Setor + Consolidator Score

### Objetivo

Adicionar 3 camadas de inteligencia ao matching existente:
1. **Gain Potential Index (GPI)** com frases explicativas de valor
2. **Matriz de gargalos por setor** que cruza o problema do buyer com o CNAE do seller
3. **Consolidator Likelihood Score** que detecta empresas ja estruturadas para consolidar

### 1. Gain Potential Index (GPI) — Frases de Valor

Hoje o sistema calcula os 5 pilares (revenue, cost, vertical, consolidation, strategic) mas nao explica POR QUE aquele match gera valor.

**Novo comportamento:** Para cada match, gerar 1-3 frases curtas que explicam o ganho potencial.

Logica deterministica baseada nos pilares dominantes:

```text
SE revenue_synergy > 60 E isCrossSell:
  "Cross-sell direto na base de clientes existente"

SE cost_synergy > 60 E sameCity:
  "Reducao de estrutura duplicada na mesma praca"

SE vertical_synergy > 60 E isUpstream:
  "Internaliza fornecedor critico — reduz dependencia operacional"

SE vertical_synergy > 60 E isDownstream:
  "Captura margem do canal de distribuicao"

SE consolidation_synergy > 60 E sameCnae4:
  "Consolidacao horizontal — dilui overhead e aumenta market share"

SE strategic_synergy > 60 E estadoDiferente:
  "Diversificacao geografica — reduz concentracao de receita"
```

Cada frase fica acessivel no resultado do match como `gain_insights: string[]`.

### 2. Matriz de Gargalos por Setor

Hoje os gargalos so ajustam pesos. O novo comportamento cruza gargalos declarados com o CNAE do seller para gerar insights especificos.

**Nova constante `SECTOR_BOTTLENECK_MAP`:**

```text
{
  "61" (Telecom/ISP): {
    gargalos_tipicos: ["churn alto", "custo de instalacao", "capex elevado", "concorrencia regional"],
    resolucoes: {
      "80": "Reduz churn via cross-sell de CFTV/seguranca",
      "43": "Reduz custo de instalacao internalizando equipe de campo",
      "61": "Elimina concorrente direto na mesma regiao",
      "35": "Cross-sell de energia solar na base existente",
    }
  },
  "69" (Consultoria/BPO): {
    gargalos_tipicos: ["concentracao de clientes", "dependencia de pessoas-chave", "ticket medio baixo"],
    resolucoes: {
      "62": "Automatiza entregas via software proprio — reduz dependencia de pessoas",
      "69": "Aumenta base de clientes e dilui concentracao",
      "73": "Canal de aquisicao proprio via marketing",
      "85": "Gera autoridade e canal via educacao corporativa",
    }
  },
  "62" (Software): {
    gargalos_tipicos: ["custo de aquisicao alto", "churn", "escala limitada"],
    resolucoes: {
      "73": "Reduz CAC via canal de marketing integrado",
      "85": "Canal de aquisicao via educacao/treinamento",
      "62": "Consolida base de clientes e reduz concorrencia",
      "63": "Monetiza dados como novo produto",
    }
  },
  // ... mais setores
}
```

Quando o buyer declara gargalos, o sistema cruza com o CNAE do seller e gera:

```text
"Essa aquisicao resolve seu gargalo: reduz churn via cross-sell de CFTV/seguranca"
```

Isso fica no campo `bottleneck_resolution: string | null` do resultado.

### 3. Consolidator Likelihood Score

**Novo campo no resultado:** `consolidator_score` (0-100) que indica se uma empresa ja esta estruturada para consolidar.

**Como calcular (com dados disponiveis):**

Os dados ja vem do banco nacional via `national-search`. Para calcular o consolidator score, precisamos de informacao adicional que pode ser obtida na mesma query ou em um passo separado.

**Indicadores disponiveis nos dados atuais:**
- Capital social alto vs media do setor → proxy de estrutura
- Porte "05" (Demais) → empresa maior que micro/pequena
- Nome fantasia vs razao social (empresas estruturadas costumam ter nome fantasia)

**Indicadores que precisam de query adicional (fase 2):**
- Contagem de estabelecimentos por cnpj_basico (filiais)
- Presenca em mais de 1 UF
- Idade da empresa (data de abertura)

**Implementacao fase 1 (sem query adicional):**

```text
consolidator_score = 0

SE porte = "05" (Demais): +30
SE capital_social > media_setor * 2: +25
SE capital_social > 1_000_000: +15
SE tem nome_fantasia: +10
SE mesmo CNAE do buyer: +20
```

O score aparece como badge no card: "Potencial Consolidador" (score > 60).

**Implementacao fase 2 (com query adicional na edge function):**

Modificar `national-search` para incluir:
- `COUNT(e2.cnpj_basico) as num_filiais` via subquery
- `COUNT(DISTINCT e2.uf) as num_ufs` via subquery

Isso permite:

```text
SE num_filiais > 3: +25
SE num_ufs > 1: +20
SE idade > 10 anos: +15
```

### Mudancas tecnicas

**Arquivo: `src/pages/Matching.tsx`**

1. **Adicionar constante `SECTOR_BOTTLENECK_MAP`** (~20 linhas) apos `CNAE_VALUE_CHAIN`

2. **Adicionar constante `GPI_RULES`** — array de regras {condition, insight} para gerar frases

3. **Expandir `scoreCompanyLocal()`:**
   - Calcular `gain_insights: string[]` baseado nos pilares dominantes
   - Calcular `bottleneck_resolution: string | null` cruzando gargalos do buyer com CNAE do seller
   - Calcular `consolidator_score: number` baseado em capital/porte/nome fantasia
   - Retornar esses 3 novos campos em `dimensions`

4. **Expandir interface `MatchDimensions`:**
   - Adicionar `gain_insights: string[]`
   - Adicionar `bottleneck_resolution: string | null`
   - Adicionar `consolidator_score: number`

5. **Atualizar cards de resultado:**
   - Mostrar `gain_insights` como lista de bullets abaixo das barras de sinergia
   - Mostrar `bottleneck_resolution` com icone de alvo quando presente
   - Mostrar badge "Potencial Consolidador" quando `consolidator_score > 60`

6. **Atualizar expanded view:**
   - Secao "Potencial de Geracao de Valor" com as frases do GPI
   - Secao "Resolucao de Gargalos" quando aplicavel
   - Barra de consolidator score

### UX do card atualizado

```text
PROVENET INTERNET LTDA                   Score: 82
[Telecom] [Florianopolis, SC]
[Verticalizacao] [Potencial Consolidador]

Sinergias:
  Receita:        ████████░░░░  68
  Custo:          ██████████░░  85
  Verticalizacao: ████████████  92
  Consolidacao:   ██████░░░░░░  55
  Estrategica:    ████░░░░░░░░  40

Potencial de valor:
  * Internaliza fornecedor critico — reduz dependencia operacional
  * Consolidacao horizontal — dilui overhead

Resolve seu gargalo:
  -> Reduz custo de instalacao internalizando equipe de campo

[Shortlist] [Contatado] [Ignorar]           [IA]
```

### Fases

**Fase 1 (esta implementacao):** GPI frases + Matriz gargalos + Consolidator score basico (sem query adicional)

**Fase 2 (futura):** Consolidator score avancado com contagem de filiais e presenca multi-UF via modificacao na edge function `national-search`

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/Matching.tsx` | Adicionar constantes GPI_RULES, SECTOR_BOTTLENECK_MAP. Expandir scoreCompanyLocal(). Expandir MatchDimensions. Atualizar cards e expanded view. |

Nenhum arquivo novo necessario. Nenhuma mudanca no backend nesta fase.

