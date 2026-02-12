

# Redesign Completo do Modulo de Matching

O matching atual e basicamente um formulario simples + cards rasos. Vamos transforma-lo no modulo central da plataforma com uma experiencia rica e profissional.

## Problemas Atuais

1. **UI extremamente basica** -- formulario plano com 4 campos e cards sem profundidade
2. **Sem pre-filtragem** -- envia TODAS as empresas para a IA, sem inteligencia local
3. **Sem deduplicacao** -- rodar matching novamente cria duplicatas
4. **Sem visualizacoes** -- nenhum grafico ou dado visual
5. **Sem detalhes expandidos** -- nao ha como explorar um match em profundidade
6. **Empresas limitadas ao proprio usuario** -- RLS restringe a `user_id`, entao so faz match com suas proprias empresas
7. **Sem abas ou organizacao** -- tudo jogado numa unica rolagem

## Nova Arquitetura da Pagina

A pagina sera reorganizada com **3 abas (Tabs)**:

### Aba 1: "Criterios & Busca"
- Formulario expandido com mais campos:
  - Setor alvo (multi-select)
  - Regiao/Pais (com opcoes globais: Americas, Europe, Asia-Pacific, Global)
  - Faixa de receita (slider duplo com min/max)
  - Faixa de EBITDA (slider duplo)
  - Tamanho da empresa (Small/Medium/Large/Enterprise)
  - Nivel de risco aceitavel (Low/Medium/High)
  - Notas estrategicas (textarea)
- Historico de criterios salvos anteriormente (carrega do banco)
- Botao "Run AI Matching" com animacao de loading elaborada

### Aba 2: "Resultados" (aba principal apos rodar)
- **Painel de estatisticas no topo:**
  - Total de matches encontrados
  - Score medio de compatibilidade
  - Distribuicao por faixa (High/Medium/Low) em mini-chart
- **Filtros rapidos:** por status (All/New/Saved/Dismissed), por score minimo (slider)
- **Tabela/lista detalhada** com colunas:
  - Empresa, Setor, Localizacao, Revenue, EBITDA, Score, Status, Acoes
- **Card expandivel** ao clicar em um match:
  - Analise completa da IA
  - Dados financeiros da empresa lado a lado com os criterios
  - Radar chart (Recharts) comparando dimensoes (financeiro, setor, tamanho, localizacao, risco)
  - Botoes: Salvar, Dispensar, Iniciar Due Diligence, Ver Empresa

### Aba 3: "Analytics"
- Grafico de barras: distribuicao de scores dos matches
- Grafico de pizza: matches por setor
- Timeline: historico de matchings realizados

## Correcoes Tecnicas

### Deduplicacao
Antes de inserir novos matches, deletar matches anteriores do mesmo usuario com status "new" para evitar duplicatas.

### Pre-filtragem inteligente
Filtrar empresas localmente antes de enviar para a IA:
- Se setor definido, filtrar por setor
- Se faixa de revenue definida, filtrar por range
- Enviar apenas empresas relevantes (reduz custo e melhora qualidade)

### Prompt da IA melhorado
Atualizar o system prompt do matching no edge function para:
- Retornar analise mais detalhada e estruturada
- Incluir breakdown por dimensao (financial_fit, sector_fit, size_fit, location_fit, risk_fit)
- Fornecer recomendacoes especificas para cada match

## Detalhes Tecnicos

### Arquivos a modificar
- `src/pages/Matching.tsx` -- reescrita completa com Tabs, charts, filtros
- `supabase/functions/ai-analyze/index.ts` -- melhorar prompt de matching

### Componentes usados
- `Tabs` do Radix (ja instalado)
- `Recharts` para radar chart, bar chart, pie chart (ja instalado)
- `Slider` do Radix para filtros de range (ja instalado)
- `Badge`, `Progress`, `Card`, `Dialog` (ja instalados)
- `Table` do shadcn para lista de resultados

### Estrutura do resultado da IA (atualizada)
```text
{
  "company_id": "uuid",
  "compatibility_score": 82,
  "analysis": "Detailed text...",
  "dimensions": {
    "financial_fit": 90,
    "sector_fit": 75,
    "size_fit": 80,
    "location_fit": 70,
    "risk_fit": 85
  },
  "recommendation": "Strong candidate for acquisition..."
}
```

### Fluxo de execucao
1. Atualizar edge function com prompt melhorado
2. Reescrever Matching.tsx com layout de 3 abas
3. Implementar pre-filtragem e deduplicacao
4. Adicionar charts e analytics
5. Testar end-to-end

