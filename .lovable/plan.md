

## Plano: Enriquecimento de empresas com dados de contato e perfis sociais

### Objetivo
Quando o usuário clicar em "Enriquecer", o sistema buscará informações reais sobre a empresa em 3 fontes, nesta ordem:

### Fontes de dados (3 camadas)

**Camada 1 -- Banco de dados nacional (Receita Federal)**
O banco externo (`estabelecimentos`) já possui os campos:
- `ddd_1` + `telefone_1` -- Telefone principal
- `ddd_2` + `telefone_2` -- Telefone secundário
- `correio_eletronico` -- E-mail cadastrado na RF
- `tipo_logradouro` + `logradouro` + `numero` + `complemento` + `bairro` + `cep` -- Endereço completo

A Edge Function fará uma query direta ao banco usando o `cnpj_basico` da empresa para buscar esses dados. Isso é instantaneo e gratuito.

**Camada 2 -- BrasilAPI (CNPJ)**
Se a empresa tem CNPJ completo, chamar `brasilapi.com.br/api/cnpj/v1/{cnpj}` para obter:
- QSA (Quadro Societario) -- nomes dos socios, qualificacao
- Telefone e e-mail (confirma/complementa o banco)

**Camada 3 -- Perplexity (Web Search)**
Usar o modelo `sonar` para buscar na web:
- LinkedIn dos socios (usando nome + empresa + cidade)
- Instagram da empresa e dos socios
- Website oficial
- Outras informacoes de contato publicas

### Alteracoes por arquivo

**Novo arquivo: `supabase/functions/company-enrich/index.ts`**

Edge Function que recebe `{ company_name, cnpj, cnpj_basico, sector, state, city }` e executa as 3 camadas em sequencia:

1. Query ao banco externo (`EXTERNAL_DB_URL`):
```sql
SELECT ddd_1, telefone_1, ddd_2, telefone_2, correio_eletronico,
       tipo_logradouro, logradouro, numero, complemento, bairro, cep
FROM estabelecimentos
WHERE cnpj_basico = $1 AND situacao_cadastral = '02'
ORDER BY identificador_matriz_filial ASC  -- matriz primeiro
LIMIT 1
```

2. BrasilAPI: `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj_completo}`
   - Extrair `qsa[]` (socios), telefone, email

3. Perplexity: prompt pedindo LinkedIn/Instagram dos socios e da empresa

Retorna:
```json
{
  "owners": [
    { "name": "Joao Silva", "role": "Socio-Administrador", "linkedin": "...", "instagram": "..." }
  ],
  "contact": {
    "phones": ["(11) 3456-7890", "(11) 9876-5432"],
    "email": "contato@empresa.com.br",
    "website": "www.empresa.com.br",
    "address": "Rua X, 123 - Bairro Y - CEP 01234-567",
    "instagram": "@empresa",
    "linkedin_company": "..."
  },
  "sources": ["banco_nacional", "brasilapi", "perplexity"],
  "citations": ["..."]
}
```

**Arquivo: `supabase/config.toml`**
- Adicionar `[functions.company-enrich]` com `verify_jwt = false`

**Arquivo: `src/pages/Matching.tsx`**
- Adicionar botao "Enriquecer" (icone `UserCheck` ou `Search`) no card de cada empresa
- Criar funcao `enrichOneCompany(match)` que chama a Edge Function
- Salvar resultado no campo `ai_analysis` do match como `contact_info`
- Exibir nova secao "Dados de Contato" no card expandido com:
  - Lista de socios com links clicaveis para LinkedIn/Instagram
  - Telefones e e-mail com icones
  - Endereco completo
  - Website
  - Badge mostrando as fontes utilizadas

### Estrutura visual do card expandido (apos enriquecimento)

```text
+---------------------------------------------+
| Empresa XYZ           Score: 78  [IA] [Enr]  |
+---------------------------------------------+
| Analise da IA (existente)                    |
| ...texto estrategico...                      |
+---------------------------------------------+
| Socios e Contato                             |
| +--------------------------------------+    |
| | Joao Silva - Socio-Administrador     |    |
| | LinkedIn  Instagram                  |    |
| +--------------------------------------+    |
| | Maria Santos - Socia                 |    |
| | LinkedIn                             |    |
| +--------------------------------------+    |
| Tel: (11) 3456-7890 | (11) 9876-5432       |
| Email: contato@xyz.com.br                    |
| Site: www.xyz.com.br                         |
| End: Rua X, 123 - Centro - 01234-567        |
| Instagram: @xyz_oficial                      |
|                                              |
| Fontes: Banco Nacional + BrasilAPI + Web     |
+---------------------------------------------+
```

### Dependencias
- `EXTERNAL_DB_URL` -- ja configurada (banco nacional)
- `PERPLEXITY_API_KEY` -- ja configurada
- BrasilAPI -- publica, sem chave

