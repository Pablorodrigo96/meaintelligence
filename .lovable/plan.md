

# Plano: Melhorar o Mecanismo de Matching

## Problemas Atuais Identificados

### UX / Amigabilidade
1. **Formulario extenso e intimidador**: O usuario ve uma parede de campos (setor, tamanho, risco, notas, estado, cidade, raio, receita min/max, EBITDA min/max) sem orientacao de prioridade
2. **Sem guia passo-a-passo**: Tudo aparece de uma vez, sem indicar o que e obrigatorio vs opcional
3. **Resultados em tabela pouco visual**: A tabela de resultados e densa e nao destaca as melhores oportunidades
4. **Cards expandidos bagunçados**: A area de detalhe mistura texto, numeros e radar chart sem hierarquia clara
5. **Sem feedback de progresso real**: O loading so mostra "Analisando com IA..." sem indicar etapas
6. **Filtro de risco nao e enviado para a IA**: O campo `risk_level` nos criterios existe no formulario mas nao e utilizado no pre-filtro nem enviado ao prompt

### Motor de IA
1. **Prompt generico**: O system prompt e vago ("Be rigorous, data-driven") sem instrucoes especificas sobre como calcular cada dimensao
2. **Sem escala de scoring definida**: A IA nao tem referencia de como distribuir scores (ex: quando dar 90 vs 60)
3. **Falta contexto financeiro comparativo**: Os criterios financeiros (min/max receita) sao enviados mas a IA nao recebe benchmarks de mercado
4. **Notas estrategicas ignoradas no scoring**: O campo `notes` e enviado nos criterios mas o prompt nao instrui a IA a usa-lo
5. **Sem penalizacao por dados incompletos**: Empresas sem receita/EBITDA recebem scores similares a empresas com dados completos
6. **Score geral nao e a media ponderada das dimensoes**: A IA calcula score geral independente das dimensoes, podendo gerar inconsistencias

---

## Solucao Proposta

### Parte 1: UX - Interface mais amigavel

**Arquivo: src/pages/Matching.tsx**

#### 1.1 Formulario em etapas com wizard visual
- Substituir layout de 2 colunas por um fluxo em 3 passos dentro da aba "Criterios":
  - **Passo 1 - Perfil**: Perfil do investidor + Setor + Tamanho (essencial)
  - **Passo 2 - Filtros** (colapsavel): Financeiros + Geograficos + Risco + Notas
  - **Passo 3 - Confirmar**: Preview com resumo dos criterios + botao executar
- Usar `Collapsible` para filtros avancados (financeiros/geo) - comecar colapsado
- Adicionar indicador de progresso visual (1/3, 2/3, 3/3)

#### 1.2 Resultados em cards visuais (em vez de tabela)
- Substituir Table por grid de Cards ordenados por score
- Cada card mostra:
  - Score grande e colorido no topo (gauge visual com cor verde/amarelo/vermelho)
  - Nome da empresa + setor + localizacao
  - Mini radar chart inline (pequeno, 120x120)
  - Badge de completude de dados
  - Botoes de acao (salvar/dispensar) mais visiveis
- Card expandido abre um painel lateral ou secao abaixo com detalhes completos
- Top 3 matches destacados com borda dourada/premium

#### 1.3 Feedback de progresso durante analise
- Mostrar etapas: "Filtrando empresas..." -> "Enviando para IA..." -> "Processando resultados..." -> "Salvando matches..."
- Progress bar com porcentagem estimada

#### 1.4 Botao de limpar filtros
- Adicionar botao "Limpar todos os filtros" ao lado do pre-filtro

#### 1.5 Filtro de risco funcional
- Conectar o campo `risk_level` ao pre-filtro de empresas (filtrar empresas pelo risk_level)

### Parte 2: Motor de IA mais potente

**Arquivo: supabase/functions/ai-analyze/index.ts**

#### 2.1 Prompt estruturado com rubrica de scoring
Reescrever o prompt de matching com instrucoes detalhadas:

```text
RUBRICA DE SCORING POR DIMENSAO:

FINANCIAL_FIT (0-100):
- 90-100: Receita e EBITDA dentro da faixa desejada, margens saudaveis, divida controlada
- 70-89: Dentro da faixa com pequenos desvios, margens aceitaveis
- 40-69: Parcialmente fora da faixa ou dados financeiros incompletos
- 0-39: Significativamente fora dos criterios financeiros ou sem dados

SECTOR_FIT (0-100):
- 90-100: Mesmo setor ou setor adjacente com sinergia clara
- 70-89: Setor relacionado com potencial de sinergia
- 40-69: Setor diferente mas com alguma complementaridade
- 0-39: Setor sem relacao ou em declinio

SIZE_FIT (0-100):
- 90-100: Tamanho exato do criterio alvo
- 70-89: Um nivel de diferenca (ex: Small vs Medium)
- 40-69: Dois niveis de diferenca
- 0-39: Muito grande ou muito pequeno para o criterio

LOCATION_FIT (0-100):
- Se distance_km fornecido: 100 - (distance_km / radius_km * 50), min 10
- Sem coordenadas: 50 (neutro)
- Mesmo estado: bonus +15

RISK_FIT (0-100):
- Para perfil Conservador: empresas com risco "Low" = 90+, "Medium" = 60-75, "High" = 20-40
- Para perfil Agressivo: empresas com risco "High" = 70-85, "Low" = 50-65
- Para perfil Moderado: distribuicao equilibrada

SCORE GERAL = Media ponderada conforme perfil do investidor:
- Agressivo: sector_fit*30 + size_fit*25 + financial_fit*20 + location_fit*15 + risk_fit*10
- Moderado: financial_fit*25 + sector_fit*20 + size_fit*20 + location_fit*20 + risk_fit*15
- Conservador: financial_fit*30 + risk_fit*30 + sector_fit*15 + size_fit*15 + location_fit*10

DADOS INCOMPLETOS: Se a empresa nao tem receita OU ebitda, reduzir financial_fit em 20 pontos e mencionar na explicacao.
```

#### 2.2 Incluir notas estrategicas no prompt
- Adicionar instrucao explicita: "O comprador forneceu as seguintes notas estrategicas que DEVEM ser consideradas no scoring e na analise: [notes]"

#### 2.3 Enviar risk_level dos criterios
- Passar o `risk_level` dos criterios para o prompt para que a IA compare com o risco de cada empresa

#### 2.4 Usar modelo mais potente para matching
- Trocar de `google/gemini-3-flash-preview` para `google/gemini-3-pro-preview` especificamente para o caso `match`, mantendo o flash para os outros tipos mais simples

#### 2.5 Adicionar campo "pontos_fortes" e "pontos_fracos"
- Pedir a IA para retornar arrays de `strengths` (2-3 itens) e `weaknesses` (2-3 itens) para cada empresa
- Exibir como bullets no card expandido

---

## Resumo de Arquivos

### Modificar
- `src/pages/Matching.tsx` -- Redesign completo da UX (wizard, cards, progresso, filtro risco)
- `supabase/functions/ai-analyze/index.ts` -- Prompt melhorado com rubrica, pesos, modelo superior

### Nao modificar
- Schema do banco (sem alteracoes em tabelas)
- DeepDiveDialog (mantem como esta)

## Ordem de Execucao

1. Motor de IA: melhorar prompt + modelo + rubrica (fundacao)
2. UI criterios: wizard simplificado com collapsibles
3. UI resultados: cards visuais em vez de tabela
4. Progresso e polish final

