
# Due Diligence - Reformulacao Completa do Modulo

## Situacao Atual
O modulo atual e extremamente basico: permite apenas selecionar uma empresa, fazer upload de um documento e executar uma analise IA generica que retorna um texto e itens de risco. Nao tem organizacao por categorias, nao tem checklist, nao tem acompanhamento de progresso, nao tem data room, nao tem timeline.

---

## Nova Arquitetura do Modulo

O modulo sera reorganizado com **4 abas principais**:

### Aba 1 - Dashboard de DD
Visao geral do processo de due diligence para a empresa selecionada:

- **Seletor de empresa** no topo (persistente entre abas)
- **Barra de progresso geral** (% de itens verificados)
- **4 cards de resumo**: Total de itens | Verificados | Pendentes | Alertas criticos
- **Grafico radar** (Recharts) mostrando score por categoria: Financeiro, Legal, Trabalhista, Tributario, Ambiental, Regulatorio, Tecnologico, Operacional
- **Timeline** com historico de acoes realizadas na DD (uploads, analises, checklist updates)

### Aba 2 - Checklist de Verificacao
Checklist interativo organizado por **8 categorias de due diligence**:

1. **Financeiro** - Demonstracoes financeiras, auditoria, projecoes, endividamento, capital de giro
2. **Legal/Societario** - Contrato social, acordos de acionistas, procuracoes, litigios pendentes
3. **Trabalhista** - Passivos trabalhistas, acordos coletivos, beneficios, rotatividade
4. **Tributario/Fiscal** - Certidoes negativas, debitos fiscais, regimes tributarios, contingencias
5. **Ambiental** - Licencas ambientais, passivos, conformidade, riscos
6. **Regulatorio** - Licencas operacionais, autorizacoes, compliance setorial
7. **Tecnologico/PI** - Patentes, marcas, sistemas, cybersecurity, LGPD
8. **Operacional** - Contratos com clientes/fornecedores, ativos, capacidade produtiva

Cada item do checklist tera:
- Status: Pendente | Em Analise | Aprovado | Alerta | N/A
- Responsavel (campo texto)
- Data limite
- Notas/observacoes
- Anexo de documento (link para Data Room)
- Severidade: Baixa | Media | Alta | Critica

Os itens virao pre-carregados de um playbook padrao (similar ao PMI), com possibilidade de adicionar, editar e excluir itens.

### Aba 3 - Data Room (Documentos)
Repositorio organizado de documentos:

- Upload de multiplos arquivos por categoria
- Lista de documentos com nome, categoria, data de upload, tamanho
- Possibilidade de associar documento a um item do checklist
- Botao para executar analise IA sobre o documento
- Visualizacao do status: Enviado | Analisado | Pendente de Revisao

### Aba 4 - Relatorios e Analise IA
Secao de analise inteligente e relatorio final:

- Botao "Executar Analise Completa" que analisa todos os dados coletados
- Relatorio formatado com secoes por categoria
- Lista de **red flags** com severidade e recomendacoes
- **Parecer final** (Go / No-Go / Condicional) com justificativa
- Historico de relatorios anteriores
- Possibilidade de exportar (futuro)

---

## Alteracoes no Banco de Dados

### Nova tabela: `dd_checklist_items`
Armazena os itens do checklist de due diligence:

```text
- id (uuid, PK)
- company_id (uuid, FK -> companies)
- user_id (uuid, FK)
- category (text) -- financeiro, legal, trabalhista, etc.
- item_name (text)
- description (text, nullable)
- status (text, default 'pending') -- pending, in_review, approved, alert, na
- severity (text, default 'medium') -- low, medium, high, critical
- responsible (text, nullable)
- due_date (date, nullable)
- notes (text, nullable)
- document_url (text, nullable)
- sort_order (integer, default 0)
- created_at (timestamptz)
- updated_at (timestamptz)
```

RLS: usuarios podem gerenciar apenas seus proprios itens (`auth.uid() = user_id`).

### Nova tabela: `dd_documents`
Armazena documentos do data room:

```text
- id (uuid, PK)
- company_id (uuid, FK -> companies)
- user_id (uuid, FK)
- file_name (text)
- file_url (text)
- file_size (bigint, nullable)
- category (text) -- mesmas categorias do checklist
- checklist_item_id (uuid, nullable, FK -> dd_checklist_items)
- ai_analysis (text, nullable)
- status (text, default 'uploaded') -- uploaded, analyzed, pending_review
- created_at (timestamptz)
```

RLS: usuarios podem gerenciar apenas seus proprios documentos.

### Tabela existente: `due_diligence_reports`
Continua sendo usada para armazenar os relatorios de analise IA. Sem alteracoes de schema.

---

## Dados do Playbook (Checklist Padrao)

Um arquivo `src/data/dd-checklist-playbook.ts` com aproximadamente 60-80 itens pre-definidos distribuidos nas 8 categorias. Exemplos:

- **Financeiro**: Balanco patrimonial dos ultimos 3 anos, DRE auditada, Fluxo de caixa projetado, Analise de endividamento, Capital de giro...
- **Legal**: Contrato social atualizado, Ata de assembleia, Certidoes de distribuicao judicial, Acordos de acionistas...
- **Trabalhista**: Folha de pagamento, Acordo coletivo vigente, Reclamatorias trabalhistas, FGTS em dia...
- **Tributario**: CND Federal, CND Estadual, CND Municipal, FGTS - CRF, Parcelamentos ativos...
- **Ambiental**: Licenca ambiental, EIA/RIMA, Passivos ambientais, Auto de infracao...
- **Regulatorio**: Alvara de funcionamento, Licencas setoriais, Registro em orgaos reguladores...
- **Tecnologico**: Registro de marcas (INPI), Patentes, Contratos de software, Politica de privacidade LGPD...
- **Operacional**: Contratos com top 10 clientes, Contratos com fornecedores-chave, Lista de ativos fixos...

O usuario pode inicializar o checklist para uma empresa (similar ao botao "Inicializar Playbook" do PMI) e depois customizar livremente.

---

## Componentes Novos

### Arquivos a criar:
- `src/data/dd-checklist-playbook.ts` -- dados estaticos do checklist padrao
- `src/components/dd/DDDashboard.tsx` -- dashboard com cards, grafico radar, timeline
- `src/components/dd/DDChecklist.tsx` -- checklist interativo por categoria com CRUD
- `src/components/dd/DDChecklistItemDialog.tsx` -- modal para criar/editar item do checklist
- `src/components/dd/DDDataRoom.tsx` -- gerenciamento de documentos
- `src/components/dd/DDReports.tsx` -- relatorios e analise IA

### Arquivo modificado:
- `src/pages/DueDiligence.tsx` -- reescrito completamente com Tabs e os novos componentes

---

## Prompt de IA Aprimorado

O prompt de due diligence na edge function `ai-analyze` sera atualizado para:
- Receber os dados da empresa + dados do checklist + informacoes dos documentos
- Retornar analise estruturada por categoria com scores (0-100)
- Gerar red flags com severidade e recomendacao
- Emitir parecer final (go/no-go/condicional)
- Formato JSON estruturado com campos especificos

---

## Resumo das Entregas

| Item | Descricao |
|------|-----------|
| Dashboard | Cards de progresso, grafico radar por categoria, timeline |
| Checklist | 8 categorias, ~70 itens pre-definidos, CRUD completo, status/responsavel/prazo |
| Data Room | Upload multiplo, organizacao por categoria, link com checklist |
| Relatorios | Analise IA completa, red flags, parecer go/no-go, historico |
| Banco de Dados | 2 novas tabelas (dd_checklist_items, dd_documents) com RLS |
| Edge Function | Prompt aprimorado para analise estruturada por categoria |

---

## Detalhes Tecnicos

### Migracao SQL

```sql
CREATE TABLE public.dd_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL,
  item_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  severity text NOT NULL DEFAULT 'medium',
  responsible text,
  due_date date,
  notes text,
  document_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dd_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dd checklist items"
  ON public.dd_checklist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.dd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  category text NOT NULL,
  checklist_item_id uuid,
  ai_analysis text,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dd_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dd documents"
  ON public.dd_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_dd_checklist_items_updated_at
  BEFORE UPDATE ON public.dd_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Bibliotecas utilizadas
Todas ja estao instaladas: Recharts (RadarChart), Radix UI (Tabs, Dialog, Select, Popover), Lucide icons, TanStack Query, date-fns.
