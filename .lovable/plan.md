

# Correção dos Erros de Build

O preview está quebrado porque o `App.tsx` importa módulos de uma pasta `@/features/` que não existe. Além disso, outros arquivos referenciam bibliotecas e módulos inexistentes. Nenhuma funcionalidade será perdida -- apenas os caminhos de importação serão corrigidos.

---

## Erros Identificados

1. **`src/App.tsx`**: 16 imports apontam para `@/features/...` -- a pasta não existe. Os arquivos reais estão em `src/pages/`, `src/components/layout/`, `src/components/ProtectedRoute.tsx`, e `src/contexts/AuthContext.tsx`.
2. **`src/App.tsx`**: `RoleProtectedRoute` não existe em nenhum lugar do projeto -- precisa ser criado ou substituído por lógica inline.
3. **`src/components/layout/AppSidebar.tsx`**: importa `@/types` (não existe) e `framer-motion` (não instalado).
4. **`src/contexts/AuthContext.tsx`**: importa `@/services/api` (não existe).
5. **`src/components/dd/DDDataRoom.tsx`**: importa `@tanstack/react-virtual` (não instalado).

## Correções Planejadas

### 1. Corrigir `src/App.tsx` -- imports
Trocar todos os imports `@/features/...` pelos caminhos reais:
- `@/contexts/AuthContext` em vez de `@/features/auth/contexts/AuthContext`
- `@/components/ProtectedRoute` em vez de `@/features/auth/components/ProtectedRoute`
- `@/components/layout/AppLayout` em vez de `@/features/shared/components/layout/AppLayout`
- `@/pages/Auth`, `@/pages/Dashboard`, etc. em vez dos caminhos `@/features/...`

### 2. Criar `RoleProtectedRoute`
Criar um componente simples em `src/components/RoleProtectedRoute.tsx` que verifica o role do usuário via `useAuth()` e redireciona se não tiver permissão.

### 3. Corrigir `src/components/layout/AppSidebar.tsx`
- Remover import de `@/types` e usar tipo inline (`string` para `UserRole`)
- Remover import de `framer-motion` e substituir as animações por transições CSS simples (ou instalar `framer-motion`)

### 4. Corrigir `src/contexts/AuthContext.tsx`
- Remover import de `@/services/api` e usar o cliente Supabase diretamente (`supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`, etc.)

### 5. Corrigir `src/components/dd/DDDataRoom.tsx`
- Remover ou substituir o uso de `@tanstack/react-virtual` por renderização padrão, ou instalar a dependência

---

## Detalhes Técnicos

### Arquivos a modificar
- `src/App.tsx` -- corrigir 16 imports + importar RoleProtectedRoute
- `src/components/layout/AppSidebar.tsx` -- remover dependências inexistentes
- `src/contexts/AuthContext.tsx` -- usar supabase client diretamente
- `src/components/dd/DDDataRoom.tsx` -- remover react-virtual

### Arquivo a criar
- `src/components/RoleProtectedRoute.tsx` -- componente de proteção por role

### Resultado
Todos os erros de build serão resolvidos e o preview voltará a funcionar normalmente sem perda de funcionalidade.
