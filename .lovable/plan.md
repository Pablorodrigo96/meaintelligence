

# Plano: Traduzir Toda a Plataforma para Português

## Escopo

A plataforma M&A Intelligence está atualmente em **inglês**. Vamos traduzir toda a interface para **português brasileiro**. Identificamos textos em 7 arquivos principais:

### Arquivos a traduzir:

1. **src/pages/Auth.tsx** - Formulário de login/signup
2. **src/pages/Dashboard.tsx** - Dashboard com métricas
3. **src/pages/Companies.tsx** - Gestão de empresas
4. **src/components/layout/AppSidebar.tsx** - Navegação lateral
5. **src/pages/Matching.tsx** - Módulo de matching (parcialmente, já tem alguns textos em PT)
6. **src/pages/DueDiligence.tsx** - Due diligence
7. **src/pages/Valuation.tsx** - Valuation
8. **src/pages/Contracts.tsx** - Geração de contratos
9. **src/pages/Risk.tsx** - Análise de risco
10. **src/pages/AdminUsers.tsx** - Gestão de usuários (admin)

## Tradução de Strings-Chave

### Auth.tsx
- "Sign In" → "Entrar"
- "Create Account" → "Criar Conta"
- "Enter your credentials to access the platform" → "Digite suas credenciais para acessar a plataforma"
- "Set up your account to get started" → "Configure sua conta para começar"
- "Full Name" → "Nome Completo"
- "Password" → "Senha"
- "I am a" → "Sou um(a)"
- "Buyer" → "Comprador"
- "Seller" → "Vendedor"
- "Advisor" → "Consultor"
- "Don't have an account? Sign up" → "Não tem conta? Cadastre-se"
- "Already have an account? Sign in" → "Já tem conta? Faça login"
- "Account created!" → "Conta criada!"
- "Please check your email to verify your account before signing in." → "Verifique seu email para confirmar sua conta antes de entrar."
- "Please wait..." → "Aguarde..."
- "Error" → "Erro"

### Dashboard.tsx
- "Dashboard" → "Painel"
- "Welcome back{...}. Role: {...}" → "Bem-vindo(a) de volta{...}. Cargo: {...}"
- "Companies" → "Empresas"
- "Manage company profiles and financials" → "Gerencie perfis de empresas e dados financeiros"
- "Find compatible buyers and sellers" → "Encontre compradores e vendedores compatíveis"
- "Automated document review" → "Análise automática de documentos"
- "DCF and EBITDA analysis" → "Análise de DCF e EBITDA"
- "Transaction predictions" → "Previsões de transações"
- "Generate legal documents" → "Gere documentos legais"
- "Comprehensive risk scoring" → "Pontuação de risco abrangente"

### Companies.tsx
- "Add Company" → "Adicionar Empresa"
- "Edit Company" → "Editar Empresa"
- "New Company" → "Nova Empresa"
- "Name *" → "Nome *"
- "Sector" → "Setor"
- "Location" → "Localização"
- "Size" → "Tamanho"
- "Revenue ($)" → "Receita ($)"
- "EBITDA ($)" → "EBITDA ($)"
- "Cash Flow ($)" → "Fluxo de Caixa ($)"
- "Debt ($)" → "Dívida ($)"
- "Risk Level" → "Nível de Risco"
- "Low" → "Baixo"
- "Medium" → "Médio"
- "High" → "Alto"
- "Description" → "Descrição"
- "Save..." / "Create" / "Update" → "Salvar..." / "Criar" / "Atualizar"
- "Search companies..." → "Pesquisar empresas..."
- "All Sectors" → "Todos os Setores"
- "No companies found. Add your first company to get started." → "Nenhuma empresa encontrada. Adicione sua primeira empresa para começar."
- "Edit" → "Editar"
- "Delete" → "Deletar"
- "Company created" / "Company updated" / "Company deleted" → "Empresa criada" / "Empresa atualizada" / "Empresa deletada"

### AppSidebar.tsx
- "Dashboard" → "Painel"
- "Companies" → "Empresas"
- "Matching" → "Matching"
- "Due Diligence" → "Due Diligence"
- "Valuation" → "Valuation"
- "Strategy" → "Estratégia"
- "Contracts" → "Contratos"
- "Risk Analysis" → "Análise de Risco"
- "Admin" → "Admin"
- "User Management" → "Gestão de Usuários"
- "Settings" → "Configurações"
- "Sign Out" → "Sair"

### Matching.tsx
- "Buyer-Seller Matching" → "Matching Comprador-Vendedor"
- "AI-powered acquisition matching engine with multi-dimensional analysis" → "Motor de matching de aquisições com inteligência artificial e análise multidimensional"
- "Strategic Criteria" → "Critérios Estratégicos"
- "Define the profile of your ideal acquisition target" → "Defina o perfil do seu alvo de aquisição ideal"
- "Target Sector" → "Setor Alvo"
- "Region" → "Região"
- "Company Size" → "Tamanho da Empresa"
- "Risk Tolerance" → "Tolerância ao Risco"
- "Strategic Notes" → "Notas Estratégicas"
- "Financial Parameters" → "Parâmetros Financeiros"
- "Set revenue and profitability thresholds" → "Defina limites de receita e lucratividade"
- "Min Revenue ($)" / "Max Revenue ($)" → "Receita Mín. ($)" / "Receita Máx. ($)"
- "Min EBITDA ($)" / "Max EBITDA ($)" → "EBITDA Mín. ($)" / "EBITDA Máx. ($)"
- "Pre-filter Preview" → "Pré-visualização de Filtro"
- "companies match your criteria" → "empresas correspondem aos seus critérios"
- "Run AI Matching" / "Analyzing..." → "Executar Matching IA" / "Analisando..."
- Tabuladores: "Critérios & Busca" / "Resultados" / "Analytics"
- "Análise Completa!" → "Matching completo!"
- etc.

### DueDiligence.tsx
- "Due Diligence" → "Due Diligence"
- "Automated legal and financial document analysis" → "Análise automática de documentos legais e financeiros"
- "New Analysis" → "Nova Análise"
- "Select Company" → "Selecionar Empresa"
- "Upload Document (optional)" → "Enviar Documento (opcional)"
- "Document uploaded" → "Documento enviado"
- "Analysis complete" → "Análise concluída"

### Valuation.tsx
- "Company Valuation" → "Valuation de Empresa"
- "DCF and EBITDA-based valuation models with sensitivity analysis" → "Modelos de valuation baseados em DCF e EBITDA com análise de sensibilidade"
- "Valuation Parameters" → "Parâmetros de Valuation"
- "Growth Rate:" → "Taxa de Crescimento:"
- "Discount Rate:" → "Taxa de Desconto:"
- "EBITDA Multiple:" → "Múltiplo de EBITDA:"
- "Calculate Valuation" → "Calcular Valuation"
- "Valuation complete" → "Valuation concluído"

### Contracts.tsx
- "Contract Generation" → "Geração de Contratos"
- "AI-generated legal documents and contract templates" → "Documentos legais gerados por IA e modelos de contrato"
- "Generate Contract" → "Gerar Contrato"
- "Contract Type" → "Tipo de Contrato"
- "Non-Disclosure Agreement (NDA)" → "Acordo de Não-Divulgação (NDA)"
- "Purchase Agreement" → "Acordo de Compra"
- "Shareholder Agreement" → "Acordo de Acionistas"
- "Party A" / "Party B" → "Parte A" / "Parte B"
- "Deal Value ($)" → "Valor do Acordo ($)"
- "Effective Date" → "Data de Início"
- "Additional Terms" → "Termos Adicionais"
- "Contract Preview" → "Pré-visualização do Contrato"
- "Download" → "Baixar"
- "Contract generated" → "Contrato gerado"

### Risk.tsx
- "Risk Analysis" → "Análise de Risco"
- "Consolidated risk dashboard across financial, legal, and operational dimensions" → "Painel consolidado de risco nas dimensões financeira, legal e operacional"
- "Run Risk Analysis" → "Executar Análise de Risco"
- "Analyze Risk" → "Analisar Risco"
- "Risk Matrix" → "Matriz de Risco"
- "Financial Risk" → "Risco Financeiro"
- "Operational Risk" → "Risco Operacional"
- "Risk Analysis complete" → "Análise de risco concluída"

### AdminUsers.tsx
- "User Management" → "Gestão de Usuários"
- "Manage platform users and roles" → "Gerencie usuários e cargos da plataforma"
- "All Users ({count})" → "Todos os Usuários ({count})"
- "Name" → "Nome"
- "Company" → "Empresa"
- "Role" → "Cargo"
- "Joined" → "Aderido em"
- "Actions" → "Ações"
- "You need admin access to view this page." → "Você precisa de acesso de administrador para ver esta página."
- "Role updated" → "Cargo atualizado"

## Detalhes Técnicos

### Estratégia de tradução

1. **Textos estáticos**: Strings em português diretamente no código
2. **Labels e placeholders**: Tradução em cada campo de input
3. **Mensagens de toast**: Tradução de títulos e descrições
4. **Card titles e descriptions**: Tradução mantendo hierarquia
5. **Tabs e filtros**: Nomes de abas e rótulos de botões traduzidos

### Arquivos a modificar (todos em src/pages/)

- Auth.tsx
- Dashboard.tsx
- Companies.tsx
- Matching.tsx
- DueDiligence.tsx
- Valuation.tsx
- Contracts.tsx
- Risk.tsx
- AdminUsers.tsx
- AppSidebar.tsx

### Escala de trabalho

Total de ~150+ strings em inglês a traduzir para português. A tradução é direta, preservando toda a lógica e estrutura do código.

