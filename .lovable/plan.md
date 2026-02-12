
# Plano de Correções Completas da Plataforma

## Problemas Identificados

### 1. Textos ainda em Ingles
- **Setores**: "Technology", "Healthcare", "Finance", etc. aparecem nos selects de Companies.tsx e Matching.tsx
- **Tamanhos**: "Small (<$10M)", "Medium ($10M-$100M)", etc.
- **Moeda**: Todas as funções `formatCurrency` usam `$` em vez de `R$`
- **Valuation.tsx**: formatador de valores usa `$`

### 2. Type casts desnecessarios (`as any`)
- Companies.tsx e Matching.tsx usam `(c as any).state`, `(c as any).latitude`, `(c as any).cnpj` etc.
- Os tipos no `types.ts` ja incluem `state`, `city`, `latitude`, `longitude`, `cnpj` -- os casts sao desnecessarios e escondem erros

### 3. Transparencia da IA ausente
- O matching mostra scores dimensionais (financeiro, setor, tamanho, localizacao, risco) mas nao explica como cada um foi calculado
- Falta breakdown detalhado de por que a IA deu determinada nota em cada dimensao

### 4. Tratamento de dados incompletos nao e comunicado
- Quando uma empresa nao tem receita, EBITDA, ou CNPJ, o sistema nao informa ao usuario como isso impacta a qualidade da analise
- Falta um "indicador de completude" por empresa

### 5. Perfil de investidor inexistente
- Nao ha ajuste de recomendacoes baseado em perfil (Agressivo, Moderado, Conservador)
- O matching trata todos os compradores igual

### 6. Cache do Deep Dive nao implementado
- Cada vez que clica "Aprofundar Top 10", faz chamadas novas para a BrasilAPI
- A tabela `deep_dive_results` mencionada no plano original nao foi criada

---

## Correcoes a Implementar

### Fase 1: Traducao e Consistencia (Rapido)

**Arquivos: Companies.tsx, Matching.tsx, Valuation.tsx**

- Traduzir array de setores: Technology -> Tecnologia, Healthcare -> Saude, Finance -> Financas, Manufacturing -> Manufatura, Energy -> Energia, Retail -> Varejo, Real Estate -> Imobiliario, Other -> Outro, Agribusiness -> Agronegocio, Logistics -> Logistica, Telecom -> Telecom, Education -> Educacao
- Traduzir tamanhos: Small -> Pequena, Medium -> Media, Large -> Grande, Enterprise -> Corporacao (mantendo as faixas de receita em R$)
- Corrigir `formatCurrency` em todos os arquivos para usar `R$` em vez de `$`
- Corrigir `formatVal` no Valuation.tsx

### Fase 2: Limpeza de Tipos (Rapido)

**Arquivos: Companies.tsx, Matching.tsx**

- Remover todos os `as any` desnecessarios onde os tipos ja cobrem os campos (`state`, `city`, `latitude`, `longitude`, `cnpj`)
- O `types.ts` ja tem esses campos no Row/Insert/Update das tabelas `companies` e `match_criteria`
- Para o `insert` no match_criteria, usar tipagem correta em vez de `as any`

### Fase 3: Indicador de Completude de Dados

**Arquivo: Matching.tsx**

- Adicionar um badge no pre-filtro mostrando a qualidade dos dados das empresas filtradas
- Calcular % de campos preenchidos (receita, EBITDA, CNPJ, localizacao, setor) para cada empresa
- Mostrar no card de resultados do matching: "Dados: 80% completo" ou "Dados: 40% - analise limitada"
- Avisar no Deep Dive quantas empresas tem CNPJ preenchido antes de iniciar

### Fase 4: Perfil do Investidor

**Arquivo: Matching.tsx**

- Adicionar selector no topo dos criterios: Perfil de Investimento (Agressivo, Moderado, Conservador)
- Cada perfil ajusta os pesos das dimensoes enviadas para a IA:
  - **Agressivo**: prioriza crescimento (sector_fit e size_fit com peso maior)
  - **Moderado**: equilibrado (pesos iguais)
  - **Conservador**: prioriza seguranca (financial_fit e risk_fit com peso maior)
- Passar o perfil como contexto adicional no prompt da IA no ai-analyze

**Arquivo: supabase/functions/ai-analyze/index.ts**

- Incluir perfil do investidor no prompt de matching
- Ajustar instrucoes para a IA ponderar dimensoes com base no perfil

### Fase 5: Transparencia e Explicabilidade

**Arquivo: Matching.tsx (secao expandida do resultado)**

- No radar chart de dimensoes, adicionar tooltip explicativo em cada dimensao
- Mostrar texto curto explicando por que cada dimensao recebeu determinado score
- Pedir para a IA retornar um campo `dimension_explanations` com explicacao breve de cada score

**Arquivo: supabase/functions/ai-analyze/index.ts**

- Atualizar prompt de matching para pedir `dimension_explanations`: objeto com uma frase para cada dimensao explicando o score

### Fase 6: Cache do Deep Dive

**Migracao SQL:**
```text
CREATE TABLE deep_dive_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  result jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE deep_dive_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own deep dive results" 
  ON deep_dive_results FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

**Arquivo: DeepDiveDialog.tsx**

- Antes de chamar a edge function, verificar se ja existe resultado recente (< 24h) no cache
- Apos receber resultado, salvar no `deep_dive_results`
- Botao "Reexecutar" força nova consulta ignorando cache
- Mostrar "Ultimo aprofundamento: ha 2 horas" quando usando cache

---

## Resumo de Arquivos

### Modificar
- `src/pages/Companies.tsx` -- setores em PT, tamanhos em PT, moeda R$, remover `as any`
- `src/pages/Matching.tsx` -- setores em PT, moeda R$, remover `as any`, perfil investidor, completude de dados
- `src/pages/Valuation.tsx` -- moeda R$
- `src/components/DeepDiveDialog.tsx` -- cache de resultados
- `supabase/functions/ai-analyze/index.ts` -- perfil investidor no prompt, dimension_explanations

### Criar (migracao)
- Tabela `deep_dive_results` com RLS

## Ordem de Execucao

1. Traducao + moeda (impacto visual imediato)
2. Limpeza de tipos
3. Indicador de completude
4. Perfil do investidor
5. Transparencia da IA
6. Cache do Deep Dive
