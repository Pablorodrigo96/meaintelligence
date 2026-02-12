

# Filtro Geografico Brasil + Raio de Proximidade

## Contexto

Atualmente o matching usa regioes globais (Brazil, Latin America, Europe, etc.) e o campo `location` das empresas e texto livre. Vamos transformar isso em um sistema geografico focado 100% no Brasil, com filtro por estado, cidade e raio de proximidade em km.

## O que muda

### 1. Banco de dados
Adicionar colunas `state` (text) e `city` (text) na tabela `companies` para dados estruturados. Adicionar `latitude` e `longitude` (numeric) para calculo de distancia. Adicionar `geo_radius_km` e `geo_reference_city` na tabela `match_criteria`.

### 2. Cadastro de Empresas (Companies.tsx)
- Substituir o campo livre "Localizacao" por dois selects: **Estado** (lista dos 26 estados + DF) e **Cidade** (input de texto)
- Manter o campo `location` preenchido automaticamente como "Cidade, UF" para retrocompatibilidade
- Adicionar um dicionario interno com coordenadas das ~100 maiores cidades brasileiras para auto-preencher lat/lng ao digitar a cidade

### 3. Matching (Matching.tsx)
- Remover as regioes globais
- Substituir por:
  - **Estado**: filtro por estado brasileiro (ou "Todos")
  - **Cidade de Referencia**: input para digitar a cidade base do usuario (ex: "Gravatai")
  - **Raio de Busca**: slider de 10km a 500km (com opcao "Sem limite")
- Pre-filtragem local usando formula de Haversine para calcular distancia entre a cidade de referencia e cada empresa
- Empresas sem coordenadas sao incluidas com aviso

### 4. Dicionario de cidades brasileiras
Criar um arquivo `src/data/brazilian-cities.ts` com as ~150 principais cidades do Brasil, cada uma com nome, estado (UF) e coordenadas (lat/lng). Esse dicionario sera usado tanto no cadastro de empresas quanto no filtro de matching.

Cidades incluem todas as capitais + cidades com mais de 200k habitantes, cobrindo regioes como:
- RS: Porto Alegre, Caxias do Sul, Pelotas, Canoas, Santa Maria, Gravatai, Novo Hamburgo...
- SP: Sao Paulo, Campinas, Santos, Ribeirao Preto, Sorocaba...
- RJ, MG, PR, SC, BA, PE, CE, etc.

### 5. Edge function (ai-analyze)
Atualizar o prompt de matching para informar a IA que todas as empresas sao brasileiras e incluir a distancia geografica como fator de avaliacao na dimensao `location_fit`.

## Fluxo do usuario

1. Cadastra empresa em "Empresas" com estado + cidade (coordenadas auto-preenchidas)
2. No Matching, define criterios incluindo cidade de referencia + raio
3. Pre-filtragem mostra quantas empresas estao dentro do raio
4. IA avalia considerando proximidade geografica como fator

## Detalhes tecnicos

### Migracao SQL
```text
ALTER TABLE companies ADD COLUMN state text;
ALTER TABLE companies ADD COLUMN city text;
ALTER TABLE companies ADD COLUMN latitude numeric;
ALTER TABLE companies ADD COLUMN longitude numeric;

ALTER TABLE match_criteria ADD COLUMN geo_reference_city text;
ALTER TABLE match_criteria ADD COLUMN geo_radius_km numeric;
ALTER TABLE match_criteria ADD COLUMN geo_latitude numeric;
ALTER TABLE match_criteria ADD COLUMN geo_longitude numeric;
```

### Formula de Haversine (TypeScript)
Calculo de distancia entre dois pontos (lat/lng) em km, implementado como funcao utilitaria em `src/lib/geo.ts`. Usado no `useMemo` de pre-filtragem do Matching.

### Arquivos a criar
- `src/data/brazilian-cities.ts` -- dicionario com ~150 cidades + coordenadas
- `src/lib/geo.ts` -- funcao haversineDistance

### Arquivos a modificar
- `src/pages/Companies.tsx` -- estado + cidade + auto-coordenadas
- `src/pages/Matching.tsx` -- filtro geografico com raio
- `supabase/functions/ai-analyze/index.ts` -- contexto Brasil no prompt

### Estados brasileiros (27)
AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO

