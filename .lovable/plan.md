

## Modelo Universal de Matching por Setor

### Objetivo

Expandir a matriz `CNAE_VALUE_CHAIN` e `SECTOR_BOTTLENECK_MAP` para cobrir todos os setores principais com mapeamentos granulares de cadeia de valor (upstream, downstream, cross-sell), e refinar a logica de ordenacao para priorizar os matches mais valiosos.

### 1. Expansao do CNAE_VALUE_CHAIN

A matriz atual cobre ~20 CNAEs. Sera expandida para ~40+ entradas com mapeamentos especificos por setor:

| Setor | CNAEs base | Upstream | Downstream | Cross-sell |
|---|---|---|---|---|
| Telecom/ISP | 61, 6110, 6120, 6190 | 4221, 4321, 9512, 26 | 6201, 6311, 6190 | 8020, 35 |
| Consultoria | 69, 6920, 70, 7020 | 6911, 6204 | 64, 66, 6499 | 62, 73, 85 |
| Industria (generico) | 10-25, 27-32 | fornecedor insumo (20, 24) | 46, 47 (distribuicao) | 49, 52 (logistica) |
| Educacao | 85, 8511-8599 | 58 (editora), 62 (LMS) | 73 (canal B2B) | 86 (saude ocupacional) |
| Saude | 86, 87, 88 | 21 (farma), 32 (equip.) | 65 (planos) | 62 (telemedicina), 85 |
| Agronegocio | 01, 02, 03 | 20 (insumos), 28 (maquinas) | 10 (beneficiamento), 46 (trading) | 35 (energia), 49 (transporte) |
| Varejo | 45, 46, 47 | 10-25 (industria) | 62 (e-commerce) | 49 (logistica), 73 (marketing) |

Novos mapeamentos granulares a adicionar:
- `4221` (infraestrutura telecom) com upstream/downstream proprio
- `9512` (manutencao equipamentos telecom)
- `6911` (advocacia societaria)
- `6499` (credito estruturado)
- `21` (farmaceutica) com cadeia propria
- `52` (armazenagem) ligada a logistica e agro

### 2. Expansao do SECTOR_BOTTLENECK_MAP

Adicionar resolucoes para setores faltantes:

| Setor CNAE | Novas resolucoes |
|---|---|
| `01` (Agro) | 52 -> "Internaliza armazenagem", 49 -> "Controla logistica propria", 10 -> "Captura margem de beneficiamento" |
| `10` (Alimentos) | 01 -> "Verticaliza materia-prima", 46 -> "Canal atacado direto", 49 -> "Reduz frete internalizando" |
| `35` (Energia) | 43 -> "Internaliza instalacao", 26 -> "Verticaliza equipamentos", 73 -> "Reduz CAC" |
| `70` (Gestao) | 62 -> "Plataforma digital propria", 69 -> "Amplia oferta contabil", 73 -> "Canal marketing integrado" |
| `66` (Investimentos) | 62 -> "Plataforma digital", 69 -> "Back-office integrado", 73 -> "Canal de captacao" |

### 3. Refinamento da Ordenacao (Tier System)

Implementar um `tier_priority` no resultado do scoring que classifica cada match em 6 niveis de prioridade:

```text
Tier 1: Mesmo CNAE + mesma cidade               (consolidacao imediata)
Tier 2: Mesmo CNAE + mesmo estado                (consolidacao regional)
Tier 3: Upstream critico na mesma regiao          (verticalizacao)
Tier 4: Downstream estrategico                   (captura de canal)
Tier 5: Cross-sell / complementar                (receita incremental)
Tier 6: Expansao geografica (outro estado)       (diversificacao)
```

O tier sera usado como criterio de desempate quando o synergy_score for proximo (diferenca < 5 pontos).

### 4. Consolidator Boost Universal

Aplicar bonus universal no score final quando a empresa target apresenta sinais de consolidacao ativa (dados ja disponiveis via Phase 2):

```text
SE consolidator_score > 70: synergy_score final += 5
SE consolidator_score > 85: synergy_score final += 10
```

Isso garante que consolidadores naturais subam no ranking independente do setor.

### Mudancas tecnicas

**Arquivo: `src/pages/Matching.tsx`**

1. **Expandir `CNAE_VALUE_CHAIN`** (~linha 731): Adicionar ~20 novas entradas com upstream/downstream/cross_sell granulares para Agro, Industria, Saude, Educacao, Energia, Investimentos

2. **Expandir `SECTOR_BOTTLENECK_MAP`** (~linha 757): Adicionar 5 novos setores (Agro 01, Alimentos 10, Energia 35, Gestao 70, Investimentos 66)

3. **Adicionar `tier_priority`** no retorno de `scoreCompanyLocal()` (~linha 1050): Calculo determinístico baseado em CNAE match + proximidade geografica

4. **Adicionar Consolidator Boost** (~linha 996): Bonus no synergy_score quando consolidator_score > 70

5. **Atualizar ordenacao de resultados**: Usar synergy_score como primario e tier_priority como desempate

6. **Expandir `MatchDimensions`**: Adicionar `tier_priority: number` e `tier_label: string`

7. **UI**: Mostrar o tier como badge sutil no card (ex: "Tier 1 - Consolidacao Local")

### Impacto

- Zero mudancas no backend
- Apenas `src/pages/Matching.tsx` sera modificado
- Compatibilidade total com dados existentes do `national-search`
- Melhora a qualidade do ranking sem adicionar latencia
