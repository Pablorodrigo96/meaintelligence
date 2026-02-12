

# Aprofundamento Top 10 com Dados Publicos (CNPJ)

## Visao Geral

Adicionar um botao "Aprofundar Top 10" na aba de Resultados do Matching que busca dados publicos das 10 melhores empresas via CNPJ, cruza com benchmarks setoriais e gera uma estimativa de faturamento usando o modelo de regras descrito.

## Arquitetura

### 1. Banco de Dados
- Adicionar coluna `cnpj` (text) na tabela `companies` para que o usuario possa cadastrar o CNPJ de cada empresa
- Adicionar tabela `deep_dive_results` para armazenar os resultados do aprofundamento (evitar re-consultas desnecessarias)

### 2. Cadastro de Empresas (Companies.tsx)
- Adicionar campo "CNPJ" no formulario de criacao/edicao de empresa
- Mascara de formatacao: XX.XXX.XXX/XXXX-XX

### 3. Edge Function: `company-deep-dive`
Nova edge function que:
- Recebe uma lista de company_ids (top 10 do matching)
- Para cada empresa com CNPJ, consulta a **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) -- API publica e gratuita, sem necessidade de chave
- Extrai: razao social, capital social, porte, natureza juridica, CNAE principal, endereco, situacao cadastral, data de abertura, quadro societario
- Aplica o **modelo de estimativa de faturamento** com os 5 fatores:
  1. Benchmark setorial (baseado no CNAE)
  2. Ajuste de capital social vs. regime tributario
  3. Ajuste por numero de funcionarios (quando disponivel)
  4. Ajuste de localizacao (fator urbano/periferico)
  5. Formula final combinada
- Usa a IA para gerar uma analise consolidada cruzando os dados publicos com os dados internos da plataforma

### 4. Dados retornados pela BrasilAPI

Para cada CNPJ, a BrasilAPI retorna:
- `razao_social`: Nome oficial
- `capital_social`: Valor do capital social registrado
- `porte`: MEI, ME, EPP, Demais
- `natureza_juridica`: Tipo de empresa
- `cnae_fiscal`: Codigo CNAE principal
- `cnae_fiscal_descricao`: Descricao do setor
- `municipio`, `uf`: Localizacao oficial
- `situacao_cadastral`: 1=Nula, 2=Ativa, 3=Suspensa, 4=Inapta, 8=Baixada
- `data_inicio_atividade`: Data de abertura
- `qsa`: Quadro de socios e administradores

### 5. Modelo de Estimativa de Faturamento

Implementado diretamente na edge function:

```text
Benchmarks setoriais (faturamento medio anual por setor):
- Tecnologia: R$ 5.000.000
- Comercio: R$ 1.500.000
- Servicos: R$ 1.000.000
- Industria: R$ 3.000.000
- Saude: R$ 2.000.000
- Agronegocio: R$ 4.000.000
- (mapeados via CNAE)

Faturamento por funcionario por setor:
- Tecnologia: R$ 500.000
- Comercio: R$ 200.000
- Servicos: R$ 150.000
- Industria: R$ 250.000
- (etc.)

Ajuste de regime tributario:
- MEI/ME (Simples Nacional): fator 0.8
- EPP (Lucro Presumido): fator 1.0
- Demais (Lucro Real): fator 1.2

Ajuste de localizacao:
- SP, RJ, DF: fator 1.1
- MG, PR, RS, SC, BA: fator 1.0
- Demais estados: fator 0.9

Formula:
faturamento_estimado = benchmark_setor × ajuste_regime × 
  (capital_social / limite_regime) × ajuste_localizacao
```

### 6. Interface (Matching.tsx)

Na aba "Resultados", apos os matches aparecerem:
- Botao "Aprofundar Top 10" (com icone de lupa/microscópio) -- so aparece quando ha matches
- Ao clicar, abre um painel/dialog com loading animado
- Resultados mostrados em cards detalhados para cada empresa:
  - Dados oficiais (razao social, CNPJ, capital social, porte, CNAE)
  - Situacao cadastral (ativa/inativa com badge colorido)
  - Data de abertura e tempo de atividade
  - Quadro societario (lista de socios)
  - Estimativa de faturamento com breakdown da formula
  - Analise IA cruzando dados publicos + dados internos
  - Score de confiabilidade da estimativa
- Empresas sem CNPJ cadastrado mostram aviso para adicionar

## Arquivos

### Criar
- `supabase/functions/company-deep-dive/index.ts` -- edge function principal

### Modificar
- `src/pages/Companies.tsx` -- campo CNPJ no formulario
- `src/pages/Matching.tsx` -- botao "Aprofundar Top 10" + painel de resultados

### Migracao SQL
```text
ALTER TABLE companies ADD COLUMN cnpj text;
```

## Fluxo do Usuario

1. Cadastra empresas com CNPJ (campo opcional)
2. Roda o matching IA normalmente
3. Na aba de resultados, clica em "Aprofundar Top 10"
4. Sistema busca dados publicos de cada empresa via BrasilAPI
5. Aplica modelo de estimativa de faturamento
6. IA gera analise consolidada cruzando tudo
7. Usuario ve cards detalhados com dados oficiais + estimativas

## Detalhes Tecnicos

### BrasilAPI -- sem necessidade de API key
- Endpoint: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- Rate limit: ~3 req/s (vamos adicionar delay entre chamadas)
- Gratuita e open source
- Dados da Receita Federal

### Mapeamento CNAE para Setor
Na edge function, criar um mapa dos principais grupos CNAE para os setores da plataforma:
- CNAE 62.xx → Tecnologia
- CNAE 47.xx → Comercio
- CNAE 86.xx → Saude
- CNAE 01-03.xx → Agronegocio
- etc.

### Tratamento de erros
- CNPJ invalido ou nao encontrado: mostrar aviso, pular empresa
- BrasilAPI fora do ar: fallback com analise IA apenas dos dados internos
- Empresa sem CNPJ: mostrar card com aviso "Adicione o CNPJ para dados completos"

