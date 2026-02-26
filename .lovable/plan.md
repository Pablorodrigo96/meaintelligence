

## Plano: Shortlist Dedicada + Enriquecimento Lusha para Decisores

### Visão geral

Criar uma aba "Shortlist" separada no Matching, onde o assessor vê apenas as empresas que marcou como "Shortlist" (status `saved`). Nessa aba, cada empresa terá um botão de enriquecimento Lusha que busca dados de contato direto dos decisores (telefone pessoal, email corporativo/pessoal) usando os dados já coletados pelo Apollo (nomes e cargos dos decisores).

### Arquitetura do fluxo

```text
Resultados → Assessor clica "Shortlist" → Empresa vai para aba Shortlist
                                              ↓
                                    Botão "Enriquecer Lusha"
                                              ↓
                              Edge Function lusha-enrich
                                              ↓
                          GET https://api.lusha.com/v2/person
                          (firstName + lastName + companyName)
                                              ↓
                          Telefone direto, email, redes sociais
                                              ↓
                          Persistido no ai_analysis do match
```

### Alterações

#### 1. Novo secret: `LUSHA_API_KEY`
Solicitar a API key da Lusha ao usuário.

#### 2. Nova Edge Function: `supabase/functions/lusha-enrich/index.ts`

- **Endpoint**: `GET https://api.lusha.com/v2/person`
- **Autenticação**: Header `api_key: LUSHA_API_KEY`
- **Entrada**: Lista de decisores (do Apollo) com `firstName`, `lastName`, `companyName`, e opcionalmente `linkedinUrl`
- **Saída por decisor**:
  - `phoneNumbers` (direto, móvel)
  - `emailAddresses` (corporativo e pessoal)
  - `linkedinUrl` confirmado
- **Rate limiting**: Processar sequencialmente com delay de 300ms entre chamadas (Lusha tem limite diário)
- **Retorno**: Lista de decisores enriquecidos com dados de contato Lusha

```typescript
// Para cada decisor da shortlist
const res = await fetch(
  `https://api.lusha.com/v2/person?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&companyName=${encodeURIComponent(companyName)}`,
  {
    method: "GET",
    headers: { "api_key": LUSHA_API_KEY },
  }
);
```

#### 3. `supabase/config.toml`
Adicionar `[functions.lusha-enrich] verify_jwt = false`

#### 4. `src/pages/Matching.tsx` — Nova aba "Shortlist"

**Tabs**: Mudar de 3 para 4 colunas (`grid-cols-4`):
- Critérios | Resultados | **Shortlist** | Analytics

**Conteúdo da aba Shortlist**:
- Filtra matches com `status === "saved"`
- Cards maiores, com todas as informações já disponíveis:
  - Dados RF (CNPJ, capital social, CNAE)
  - Dados Apollo (funcionários, setor, decisores)
  - Dados de enriquecimento IA (análise, sinergias)
  - Dados Perplexity (validação web)
  - **Nova seção**: Dados Lusha (contato direto dos decisores)
- Botão "Enriquecer com Lusha" por empresa — chama `lusha-enrich` passando os `decision_makers` do Apollo
- Badge "Lusha" (verde) quando enriquecida
- Exibição dos decisores com telefone, email e LinkedIn clicáveis

**Persistência**: Dados Lusha salvos em `ai_analysis.lusha_contacts` no match.

**Contador na aba**: Badge mostrando quantas empresas estão na shortlist.

#### 5. Lógica de enriquecimento Lusha no frontend

```typescript
const enrichWithLusha = async (match: MatchResult) => {
  const currentAnalysis = JSON.parse(match.ai_analysis || "{}");
  const decisionMakers = currentAnalysis.decision_makers || [];
  
  const { data } = await supabase.functions.invoke("lusha-enrich", {
    body: {
      company_name: match.companies?.name,
      decision_makers: decisionMakers.map(dm => ({
        first_name: dm.name.split(" ")[0],
        last_name: dm.name.split(" ").slice(1).join(" "),
        company_name: match.companies?.name,
        linkedin_url: dm.linkedin_url,
      })),
    },
  });

  // Merge Lusha data back
  const enriched = {
    ...currentAnalysis,
    lusha_contacts: data.contacts,
    lusha_enriched: true,
  };
  await supabase.from("matches").update({
    ai_analysis: JSON.stringify(enriched),
  }).eq("id", match.id);
};
```

### Detalhes técnicos

**Edge Function `lusha-enrich/index.ts`:**

| Campo | Valor |
|-------|-------|
| Endpoint | `GET https://api.lusha.com/v2/person` |
| Auth Header | `api_key: ${LUSHA_API_KEY}` |
| Query Params | `firstName`, `lastName`, `companyName`, `linkedinUrl` (opcional) |
| Rate limit | 300ms delay entre chamadas |
| Resposta capturada | `phoneNumbers`, `emailAddresses`, `company`, `socialNetworks` |

**Renderização do card Shortlist:**

Para cada decisor encontrado pelo Lusha:
```
┌──────────────────────────────────────────┐
│ 👤 João Silva — CEO                      │
│ 📱 +55 11 99999-0000 (mobile)           │
│ ✉️  joao@empresa.com.br                  │
│ 🔗 linkedin.com/in/joaosilva            │
└──────────────────────────────────────────┘
```

### Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| **Novo secret** | `LUSHA_API_KEY` |
| **Nova função** `lusha-enrich/index.ts` | Busca contato direto dos decisores via Lusha API |
| `supabase/config.toml` | Adicionar `[functions.lusha-enrich]` |
| `src/pages/Matching.tsx` | Nova aba "Shortlist" com cards detalhados, botão "Enriquecer com Lusha", badges Lusha, exibição de contatos dos decisores |

