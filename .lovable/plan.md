

# Dashboard com Metricas Reais + Teste End-to-End

## O que sera feito

### 1. Dashboard com metricas reais
Atualizar `src/pages/Dashboard.tsx` para exibir metricas do banco de dados usando `@tanstack/react-query`:

**Cards de metricas no topo:**
- Total de Empresas (query na tabela `companies`)
- Matches Ativos (query na tabela `matches` com status != 'dismissed')
- Valuations Realizadas (query na tabela `valuations`)
- Contratos Gerados (query na tabela `contracts`)
- Due Diligence em Andamento (query na tabela `due_diligence_reports`)
- Risk Assessments (query na tabela `risk_assessments`)

**Layout:**
- Linha superior com 4 cards de metricas numericas (com icones e cores)
- Abaixo, os cards de modulos ja existentes (links de navegacao)

### 2. Habilitar auto-confirm de email
Para facilitar os testes, habilitar auto-confirm de email na configuracao de auth do projeto. Isso permite criar contas e fazer login imediatamente sem verificar email.

### 3. Teste end-to-end
Apos implementar, testar o fluxo completo:
- Criar conta no `/auth`
- Verificar redirecionamento para `/dashboard`
- Confirmar que metricas aparecem (inicialmente zeradas)
- Navegar para `/companies` e criar uma empresa
- Voltar ao dashboard e verificar que o contador atualizou

## Detalhes tecnicos

### Dashboard.tsx
- Importar `useQuery` do `@tanstack/react-query` e `supabase`
- 6 queries paralelas usando `useQuery` com `select('*', { count: 'exact', head: true })` para buscar apenas contagens
- Cards de metricas com animacao de loading (skeleton) enquanto carregam
- Manter os cards de modulos existentes abaixo das metricas

### Auth
- Usar a ferramenta `configure-auth` para habilitar auto-confirm de email

