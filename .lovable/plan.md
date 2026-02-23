

## Synergy Score: Motor de Sinergia Estrutural para o Matching

### Objetivo

Substituir o score simplista atual (sector_fit + size_fit + location_fit + financial_fit + risk_fit) por um **Synergy Score** de 5 pilares que classifica automaticamente o **tipo de sinergia** e estima o **potencial de geracao de valor** de cada match.

### Os 5 Pilares do Synergy Score

| Pilar | O que mede | Peso base |
|---|---|---|
| Revenue Synergy | Cross-sell, nova base de clientes, canal complementar | 25% |
| Cost Synergy | Reducao de estrutura duplicada, mesma praca, mesmo setor | 20% |
| Vertical Integration | Internalizacao de margem, CNAE upstream/downstream | 20% |
| Consolidation (Roll-up) | Escala, mercado fragmentado, capital baixo, porte similar | 20% |
| Strategic (Multiplo) | Diversificacao geografica, reducao de risco, maturidade | 15% |

### Como funciona (deterministico, zero IA)

**1. Classificacao automatica do tipo de sinergia**

Para cada empresa candidata, o sistema cruza:
- CNAE do buyer vs. CNAE do target
- Estado/cidade do buyer vs. target
- Porte/capital do buyer vs. target
- Cadeia de valor (CNAE upstream/downstream)

E classifica como:
- **Horizontal**: mesmo CNAE ou CNAE muito proximo
- **Vertical**: CNAE na cadeia upstream/downstream
- **Complementar**: CNAE adjacente com potencial de cross-sell
- **Consolidacao**: horizontal + porte menor + mercado fragmentado
- **Estrategica**: geografia diferente ou setor adjacente que reduz risco

**2. Matriz CNAE de Cadeia de Valor**

Nova estrutura que mapeia relacoes entre CNAEs:

```text
CNAE_VALUE_CHAIN = {
  "61" (Telecom/ISP): {
    upstream: ["43" (instalacao fibra), "26" (equipamentos)],
    downstream: ["62" (software), "63" (dados)],
    cross_sell: ["80" (seguranca/CFTV), "35" (energia solar)],
  },
  "6920" (Consultoria financeira): {
    upstream: ["6920" (contabilidade)],
    downstream: ["64" (banking), "66" (investimentos)],
    cross_sell: ["62" (software/ERP), "73" (marketing)],
  },
  // ... mais setores
}
```

**3. Calculo de cada pilar**

- **Revenue Synergy** (0-100):
  - CNAE cross-sell match: +40
  - Mesmo estado: +20 (base de clientes acessivel)
  - Porte compativel (diff <= 1): +20
  - CNAE complementar downstream: +20

- **Cost Synergy** (0-100):
  - Mesmo CNAE (horizontal): +40
  - Mesma cidade: +30, mesmo estado: +15
  - Porte similar (diff = 0): +20
  - Capital social proximo (ratio < 3x): +10

- **Vertical Integration** (0-100):
  - CNAE upstream match: +50
  - CNAE downstream match: +40
  - Mesmo estado (logistica): +10

- **Consolidation** (0-100):
  - Mesmo CNAE exato (4 digitos): +40
  - Target porte menor que buyer: +25
  - Capital social baixo (tier Micro/Pequena): +20
  - Mesma regiao: +15

- **Strategic** (0-100):
  - Estado diferente (diversificacao geo): +30
  - Setor adjacente (SECTOR_ADJACENCY): +25
  - Empresa madura (alta idade, capital medio): +25
  - Reduz concentracao setorial: +20

**4. Score final e label**

```text
synergy_score = revenue * 0.25 + cost * 0.20 + vertical * 0.20 + consolidation * 0.20 + strategic * 0.15
```

Label principal = pilar com maior pontuacao:
- "Sinergia de Receita" / "Reducao de Custo" / "Verticalizacao" / "Consolidacao" / "Estrategica"

### Perfil do Comprador influencia os pesos

Os pesos dos pilares mudam conforme o perfil do investidor:

| Perfil | Revenue | Cost | Vertical | Consolidation | Strategic |
|---|---|---|---|---|---|
| Agressivo | 0.30 | 0.15 | 0.25 | 0.20 | 0.10 |
| Moderado | 0.25 | 0.20 | 0.20 | 0.20 | 0.15 |
| Conservador | 0.15 | 0.30 | 0.15 | 0.15 | 0.25 |

### Input do Buyer (novo campo no Wizard Step 1)

Adicionar ao wizard uma pergunta simples:

**"Qual e seu principal gargalo hoje?"**
- [ ] Preciso de mais clientes / receita
- [ ] Preciso reduzir custos operacionais
- [ ] Dependo de fornecedores criticos
- [ ] Quero crescer em novas regioes
- [ ] Quero aumentar o valor da minha empresa

A resposta ajusta os pesos dos pilares automaticamente (ex: "mais clientes" = Revenue +15%, Cost -10%).

Tambem adicionar campo "Meu CNAE principal" (select) para que o sistema saiba calcular upstream/downstream.

### UX do card de resultado

```text
PROVENET INTERNET LTDA                Score: 82
[Telecom] [Florianopolis, SC]
[Verticalizacao] [Capital: R$2,3M]

Sinergias identificadas:
  Receita:        ████████░░░░  68
  Custo:          ██████████░░  85
  Verticalizacao: ████████████  92  <-- principal
  Consolidacao:   ██████░░░░░░  55
  Estrategica:    ████░░░░░░░░  40

Score: 82/100

[Shortlist] [Contatado] [Ignorar]        [IA]
```

### Detalhes tecnicos

**Arquivos a modificar:**

| Arquivo | Mudanca |
|---|---|
| `src/pages/Matching.tsx` | Refatorar `scoreCompanyLocal()` para calcular 5 pilares de sinergia. Adicionar `CNAE_VALUE_CHAIN`. Adicionar campos no Wizard Step 1. Atualizar cards de resultado com barras de sinergia e label. |

**Nenhum arquivo novo necessario** — tudo fica dentro do Matching.tsx existente.

**Mudancas especificas:**

1. **Linhas ~703-716**: Expandir `SECTOR_ADJACENCY` para incluir `CNAE_VALUE_CHAIN` com upstream/downstream/cross_sell

2. **Linhas ~718-722**: Expandir `PROFILE_WEIGHTS` para os 5 novos pilares (revenue, cost, vertical, consolidation, strategic)

3. **Linhas ~752-801**: Refatorar `scoreCompanyLocal()` completamente:
   - Calcular cada pilar separadamente
   - Retornar `dimensions` com os 5 pilares + `synergy_type` (label do pilar dominante)
   - Manter compatibilidade com o `MatchDimensions` type (adicionar novos campos)

4. **Wizard Step 1 (~linhas 1016-1039)**: Adicionar select "Meu CNAE" e checkboxes "Qual seu gargalo?"

5. **Cards de resultado (~linhas 1371-1397)**: Substituir barras genéricas por 5 mini-barras de sinergia com o label principal em badge

6. **Step 3 resumo (~linhas 1178-1217)**: Mostrar pesos de sinergia configurados

**Impacto no `MatchDimensions` type**: Adicionar `revenue_synergy`, `cost_synergy`, `vertical_synergy`, `consolidation_synergy`, `strategic_synergy`, `synergy_type` ao tipo existente.

