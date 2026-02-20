
# Conectar o Banco Externo de Empresas ao Motor de Matching

## O que vai acontecer

Vamos criar uma "ponte" segura entre esta aplicação e o seu banco Supabase externo com 5M+ empresas. A IA ja existe e funciona -- só precisamos fornecer os candidatos certos para ela analisar.

```text
[Matching.tsx - "Base Nacional"]
        |
        | chama national-search
        v
[Edge Function: national-search]  <-- NOVA
        |
        | connection string segura (secret EXTERNAL_DB_URL)
        v
[Seu Supabase Externo - 5M+ empresas]
        |
        | retorna ate 150 empresas filtradas
        v
[ai-analyze - ja existe]
        |
        v
[IA ranqueia e pontua com score 0-100]
```

---

## Passo a Passo Para Voce Fazer AGORA

Antes de eu implementar o codigo, voce precisa me fornecer 3 informacoes do seu banco externo. Veja onde encontrar cada uma:

### Passo 1 -- Connection String

No painel do seu Supabase externo:
- Va em **Settings** (engrenagem no menu lateral)
- Clique em **Database**
- Role ate a secao **Connection string**
- Selecione **URI** (nao Transaction pooler)
- Copie a string no formato:
  ```
  postgresql://postgres:[SUA_SENHA]@db.[PROJECT_REF].supabase.co:5432/postgres
  ```
- Guarde essa string -- vou pedir ela como um secret seguro

### Passo 2 -- Nome da tabela principal

Qual o nome exato da tabela que contem as empresas? Ex: `empresas`, `companies`, `cnpj_data`, etc.

### Passo 3 -- Colunas disponiveis

Quais colunas existem na sua tabela? Preciso saber especialmente:
- Nome da empresa (razao social / nome fantasia)
- CNPJ
- Setor / CNAE
- Estado (UF)
- Municipio / Cidade
- Porte da empresa
- Capital social (se tiver)
- Situacao cadastral (ativa, baixada, etc.)

---

## O que vou implementar (apos voce fornecer as informacoes)

### 1. Secret seguro: `EXTERNAL_DB_URL`
A connection string nunca fica visivel no codigo -- fica armazenada como variavel de ambiente criptografada, acessivel apenas pela edge function.

### 2. Nova Edge Function: `national-search`
- Conecta ao banco externo usando o driver Postgres nativo do Deno
- Recebe os criterios do matching (setor, estado, porte)
- Executa query parametrizada filtrando empresas ATIVAS
- Mapeia os campos do seu schema para o formato que a IA ja espera
- Retorna ate 150 candidatos

### 3. Atualizacao no Matching.tsx
- Novo toggle: **"Minha Carteira"** (atual) vs **"Base Nacional (5M+)"**
- Quando "Base Nacional" selecionado, chama `national-search` primeiro, depois passa para a IA
- Badge indicando a fonte dos dados em cada resultado
- Todo o restante (scoring, Deep Dive, salvar favoritos) funciona igual

---

## Detalhes Tecnicos da Edge Function

```typescript
// Query parametrizada que sera executada no seu banco externo
SELECT cnpj, razao_social, nome_fantasia, 
       cnae_fiscal, uf, municipio, porte, capital_social
FROM [sua_tabela]
WHERE situacao_cadastral = 'ATIVA'  -- ou o valor equivalente no seu banco
  AND ($1::text IS NULL OR uf = $1)
  AND ($2::text IS NULL OR porte = $2)
LIMIT 150
ORDER BY capital_social DESC NULLS LAST
```

A query sera ajustada conforme o schema real da sua tabela.

### Mapeamento de campos
Os dados do banco externo serao convertidos para o formato interno:
- `razao_social` ou `nome_fantasia` -> `name`
- `uf` -> `state`
- `municipio` -> `city`
- `cnae_fiscal` -> `sector` (usando o mapeamento de CNAE ja existente)
- `porte` -> `size`
- `capital_social` -> proxy para revenue estimate
- `cnpj` -> `cnpj`

---

## Proximos Passos

1. Voce me responde com: nome da tabela + lista de colunas (pode ser o resultado de `\d nome_da_tabela` no SQL editor do Supabase)
2. Eu implemento a edge function e o toggle no Matching
3. Voce adiciona a connection string como secret quando eu pedir
4. Testamos com uma busca real
