

## Plano: Painel Admin de Consumo de APIs por Usuário

### Objetivo

Criar uma tabela `api_usage_logs` para registrar cada chamada de API externa (IA, Apollo, Lusha, Perplexity, Enriquecimento) por usuário, e um painel admin para visualizar o consumo agregado.

### Alterações

#### 1. Nova tabela `api_usage_logs` (migração SQL)

```sql
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service text NOT NULL,        -- 'ai-analyze', 'apollo', 'lusha', 'perplexity', 'company-enrich', 'national-search', 'deep-dive'
  action text,                  -- tipo específico: 'match', 'risk', 'strategy', 'contract', etc.
  tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir seus próprios logs
CREATE POLICY "Users can insert own usage logs"
  ON public.api_usage_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all usage logs"
  ON public.api_usage_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index para queries de agregação
CREATE INDEX idx_usage_logs_user_service ON public.api_usage_logs (user_id, service);
CREATE INDEX idx_usage_logs_created_at ON public.api_usage_logs (created_at);
```

#### 2. `src/pages/Matching.tsx` — Registrar uso após cada chamada

Criar helper e inserir log após cada `supabase.functions.invoke`:

```typescript
const logApiUsage = async (service: string, action?: string) => {
  if (!user?.id) return;
  await supabase.from("api_usage_logs").insert({
    user_id: user.id,
    service,
    action,
  });
};
```

Inserir chamadas após cada invoke:
- `ai-analyze` → `logApiUsage("ai-analyze", type)` (match-single, match, etc.)
- `apollo-enrich` → `logApiUsage("apollo", "enrich")`
- `lusha-enrich` → `logApiUsage("lusha", "enrich")`
- `perplexity-validate` → `logApiUsage("perplexity", "validate")`
- `company-enrich` → `logApiUsage("company-enrich", "enrich")`
- `national-search` → `logApiUsage("national-search", "search")`

Mesma lógica para `Strategy.tsx`, `Risk.tsx`, `Contracts.tsx`, `DueDiligence.tsx`, `DeepDiveDialog.tsx`.

#### 3. Nova página `src/pages/AdminUsage.tsx` — Painel de consumo

Página admin com:
- **Cards de resumo**: Total de chamadas por serviço (últimos 30 dias)
- **Tabela por usuário**: Colunas: Nome | IA | Apollo | Lusha | Perplexity | Enriquecimento | Total
- **Filtro de período**: 7d, 30d, 90d
- Query agrega `api_usage_logs` por `user_id` e `service`, faz join com `profiles` para nome

```typescript
// Query de agregação
const { data } = await supabase
  .from("api_usage_logs")
  .select("user_id, service, created_at")
  .gte("created_at", dateFilter);
// Agrupar no cliente por user_id + service
```

#### 4. `src/App.tsx` + `src/components/layout/AppSidebar.tsx` — Rota e nav

- Adicionar rota `/admin/usage` → `<AdminUsage />`
- Adicionar item no menu admin: `{ label: "Consumo de APIs", icon: BarChart3, path: "/admin/usage" }`

### Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Criar tabela `api_usage_logs` com RLS |
| `src/pages/Matching.tsx` | Adicionar `logApiUsage()` após cada invoke |
| `src/pages/Strategy.tsx` | Adicionar log para ai-analyze/strategy |
| `src/pages/Risk.tsx` | Adicionar log para ai-analyze/risk |
| `src/pages/Contracts.tsx` | Adicionar log para ai-analyze/contract |
| `src/pages/DueDiligence.tsx` | Adicionar log para ai-analyze/due-diligence |
| `src/components/DeepDiveDialog.tsx` | Adicionar log para deep-dive |
| `src/pages/AdminUsage.tsx` | Nova página com painel de consumo |
| `src/App.tsx` | Adicionar rota /admin/usage |
| `src/components/layout/AppSidebar.tsx` | Adicionar link no menu admin |

