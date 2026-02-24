

## Top 10 Estrategico: Filtro de Qualidade Empresarial

### Problema atual

O motor retorna ate 2.000 empresas do banco nacional e seleciona as top 20 por synergy_score. Porem, o synergy_score mede **encaixe estrategico** (sinergia), nao **qualidade da empresa**. Resultado: empresas com score alto de sinergia mas sem estrutura (MEIs, informais, capital minimo) podem ocupar posicoes no top 10.

### Solucao: Company Quality Score

Criar um **quality_score** (0-100) que funciona como multiplicador do synergy_score, garantindo que empresas estruturadas e reconhecidas subam naturalmente no ranking.

### Indicadores de qualidade (dados ja disponiveis)

| Indicador | Sinal | Pontos |
|---|---|---|
| Capital social > R$500K | Empresa capitalizada | +15 |
| Capital social > R$2M | Empresa bem capitalizada | +10 (adicional) |
| Porte "05" (Demais) | Nao e micro/pequena | +15 |
| Nome fantasia presente | Marca propria, reconhecida | +10 |
| Num filiais > 1 | Empresa estruturada com equipe | +15 |
| Num filiais > 5 | Rede consolidada | +10 (adicional) |
| Presenca multi-UF (num_ufs > 1) | Escala regional/nacional | +10 |
| Capital social entre R$100K e R$50M | Faixa ideal (exclui gigantes e informais) | +15 |

O quality_score sera combinado com o synergy_score via formula ponderada:

```text
final_score = synergy_score * 0.7 + quality_score * 0.3
```

Isso garante que sinergia continua sendo o criterio principal (70%), mas qualidade empresarial influencia fortemente o ranking (30%).

### Exclusao automatica de extremos

Alem do quality_score, adicionar filtros hard no scoring:

- **Excluir empresas com capital social < R$10K** (informais/MEIs) -- ja existe via `min_capital_social: 10_000` mas reforcar no scoring
- **Penalizar empresas sem nome fantasia E sem filiais** (quality_score capped em 30)
- **O max_capital ja exclui gigantes** via `SECTOR_DEFAULT_MAX_CAPITAL` no backend

### Mudancas tecnicas

**Arquivo: `src/pages/Matching.tsx`**

1. **Novo calculo `quality_score`** dentro de `scoreCompanyLocal()`: Score 0-100 baseado nos indicadores acima

2. **Nova formula de ranking**: `final_score = synergy_score * 0.7 + quality_score * 0.3` substitui `compatibility_score` como criterio de ordenacao

3. **Expandir `MatchDimensions`**: Adicionar `quality_score: number`

4. **Atualizar sorting** (~linha 436): Ordenar por `final_score` (combinado) ao inves de `compatibility_score` puro

5. **UI nos cards**: Mostrar indicador visual de qualidade empresarial (ex: icone de estrela ou badge "Empresa Estruturada" quando quality_score > 65)

6. **Manter `compatibility_score` visivel** como "Score de Sinergia" -- o `final_score` aparece como "Ranking Score" principal

### Logica detalhada do quality_score

```text
quality_score = 0

// Capital social
SE capital > 2_000_000: +25
SENAO SE capital > 500_000: +15
SENAO SE capital > 100_000: +8

// Faixa ideal (nao e gigante nem informal)
SE capital >= 100_000 E capital <= 50_000_000: +15

// Porte
SE porte == "05": +15

// Marca
SE nome_fantasia presente e diferente de razao social: +10

// Estrutura operacional
SE num_filiais > 5: +25
SENAO SE num_filiais > 1: +15

// Presenca geografica
SE num_ufs > 1: +10

Cap em 100.
```

### Impacto no ranking

Exemplo pratico com 3 empresas do setor Telecom:

```text
Empresa A: ISP regional, 3 filiais, capital R$1.5M, marca forte
  synergy=72, quality=70, final=72*0.7+70*0.3 = 50.4+21.0 = 71

Empresa B: MEI instalador, 1 filial, capital R$15K, sem marca
  synergy=75, quality=23, final=75*0.7+23*0.3 = 52.5+6.9 = 59

Empresa C: ISP estruturado, 8 filiais, 2 UFs, capital R$5M, marca
  synergy=68, quality=90, final=68*0.7+90*0.3 = 47.6+27.0 = 75
```

Sem quality_score: B (75) > A (72) > C (68)
Com quality_score: C (75) > A (71) > B (59)

A empresa C -- estruturada, multi-UF, capitalizada -- sobe para o topo mesmo com synergy um pouco menor.

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/Matching.tsx` | Adicionar quality_score em scoreCompanyLocal(), nova formula final_score, atualizar sorting, expandir MatchDimensions, badge na UI |

Zero mudancas no backend. Dados necessarios (capital, porte, nome_fantasia, num_filiais, num_ufs) ja vem do `national-search`.
