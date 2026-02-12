export interface DDPlaybookItem {
  category: string;
  item_name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export const DD_CATEGORIES = [
  { key: "financeiro", label: "Financeiro", icon: "DollarSign" },
  { key: "legal", label: "Legal/Societário", icon: "Scale" },
  { key: "trabalhista", label: "Trabalhista", icon: "Users" },
  { key: "tributario", label: "Tributário/Fiscal", icon: "Receipt" },
  { key: "ambiental", label: "Ambiental", icon: "Leaf" },
  { key: "regulatorio", label: "Regulatório", icon: "ShieldCheck" },
  { key: "tecnologico", label: "Tecnológico/PI", icon: "Cpu" },
  { key: "operacional", label: "Operacional", icon: "Settings" },
] as const;

export type DDCategoryKey = (typeof DD_CATEGORIES)[number]["key"];

export const DD_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente", color: "text-muted-foreground" },
  { value: "in_review", label: "Em Análise", color: "text-warning" },
  { value: "approved", label: "Aprovado", color: "text-success" },
  { value: "alert", label: "Alerta", color: "text-destructive" },
  { value: "na", label: "N/A", color: "text-muted-foreground" },
] as const;

export const DD_SEVERITY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
] as const;

export const DD_PLAYBOOK: DDPlaybookItem[] = [
  // Financeiro
  { category: "financeiro", item_name: "Balanço patrimonial dos últimos 3 anos", description: "Verificar consistência e evolução patrimonial", severity: "high" },
  { category: "financeiro", item_name: "DRE auditada", description: "Demonstração de resultado do exercício com parecer de auditoria", severity: "high" },
  { category: "financeiro", item_name: "Fluxo de caixa projetado", description: "Projeções de fluxo de caixa para os próximos 5 anos", severity: "high" },
  { category: "financeiro", item_name: "Análise de endividamento", description: "Levantamento completo de dívidas, financiamentos e garantias", severity: "critical" },
  { category: "financeiro", item_name: "Capital de giro", description: "Análise da necessidade de capital de giro e ciclo financeiro", severity: "medium" },
  { category: "financeiro", item_name: "Contas a receber aging", description: "Análise de aging das contas a receber e provisão para devedores duvidosos", severity: "medium" },
  { category: "financeiro", item_name: "Contas a pagar detalhado", description: "Levantamento de fornecedores, prazos e condições", severity: "medium" },
  { category: "financeiro", item_name: "Relatório de auditoria independente", description: "Último parecer de auditoria externa", severity: "high" },
  { category: "financeiro", item_name: "Contratos de financiamento vigentes", description: "Detalhes de todos os financiamentos ativos", severity: "high" },
  { category: "financeiro", item_name: "Garantias e avais prestados", description: "Levantamento de todas as garantias concedidas", severity: "critical" },

  // Legal/Societário
  { category: "legal", item_name: "Contrato social atualizado", description: "Última alteração contratual consolidada", severity: "critical" },
  { category: "legal", item_name: "Ata de assembleia de sócios/acionistas", description: "Últimas 3 assembleias com deliberações", severity: "high" },
  { category: "legal", item_name: "Certidões de distribuição judicial", description: "Federal, estadual e trabalhista dos sócios e empresa", severity: "critical" },
  { category: "legal", item_name: "Acordo de acionistas", description: "Verificar existência de acordo e cláusulas restritivas", severity: "high" },
  { category: "legal", item_name: "Procurações vigentes", description: "Levantamento de todas as procurações ativas", severity: "medium" },
  { category: "legal", item_name: "Litígios pendentes", description: "Lista de processos judiciais ativos com valores estimados", severity: "critical" },
  { category: "legal", item_name: "Propriedade de imóveis", description: "Certidões de matrícula e ônus reais", severity: "high" },
  { category: "legal", item_name: "Contratos relevantes com terceiros", description: "Contratos com cláusulas de change of control", severity: "high" },
  { category: "legal", item_name: "Registro na Junta Comercial", description: "Ficha cadastral atualizada", severity: "medium" },

  // Trabalhista
  { category: "trabalhista", item_name: "Folha de pagamento detalhada", description: "Últimos 12 meses com encargos", severity: "high" },
  { category: "trabalhista", item_name: "Acordo/convenção coletiva vigente", description: "Termos do acordo coletivo atual", severity: "high" },
  { category: "trabalhista", item_name: "Reclamatórias trabalhistas ativas", description: "Levantamento de processos trabalhistas com provisões", severity: "critical" },
  { category: "trabalhista", item_name: "FGTS em dia", description: "CRF - Certificado de Regularidade do FGTS", severity: "high" },
  { category: "trabalhista", item_name: "Quadro de funcionários", description: "Organograma com cargos, salários e tempo de casa", severity: "medium" },
  { category: "trabalhista", item_name: "Benefícios e planos de saúde", description: "Detalhes dos benefícios oferecidos e custos", severity: "medium" },
  { category: "trabalhista", item_name: "Rotatividade (turnover)", description: "Índices de turnover dos últimos 24 meses", severity: "medium" },
  { category: "trabalhista", item_name: "Pessoas-chave e non-compete", description: "Identificação de key-persons e cláusulas de não-competição", severity: "high" },

  // Tributário/Fiscal
  { category: "tributario", item_name: "CND Federal (RFB e PGFN)", description: "Certidão Negativa de Débitos federais", severity: "critical" },
  { category: "tributario", item_name: "CND Estadual (ICMS)", description: "Certidão Negativa de Débitos estaduais", severity: "critical" },
  { category: "tributario", item_name: "CND Municipal (ISS/IPTU)", description: "Certidão Negativa de Débitos municipais", severity: "high" },
  { category: "tributario", item_name: "FGTS - CRF", description: "Certificado de Regularidade do FGTS", severity: "high" },
  { category: "tributario", item_name: "Parcelamentos ativos", description: "Detalhes de todos os parcelamentos tributários em andamento", severity: "high" },
  { category: "tributario", item_name: "Regime tributário atual", description: "Lucro Real, Presumido ou Simples Nacional - análise de adequação", severity: "medium" },
  { category: "tributario", item_name: "Contingências fiscais", description: "Processos administrativos e judiciais tributários", severity: "critical" },
  { category: "tributario", item_name: "Últimas 5 declarações de IRPJ", description: "Imposto de Renda Pessoa Jurídica com recibos", severity: "medium" },
  { category: "tributario", item_name: "Análise de créditos tributários", description: "Créditos de PIS/COFINS, ICMS e outros", severity: "medium" },

  // Ambiental
  { category: "ambiental", item_name: "Licença ambiental vigente", description: "LO - Licença de Operação e validade", severity: "critical" },
  { category: "ambiental", item_name: "EIA/RIMA", description: "Estudo de Impacto Ambiental se aplicável", severity: "high" },
  { category: "ambiental", item_name: "Passivos ambientais identificados", description: "Levantamento de contaminações e remediações necessárias", severity: "critical" },
  { category: "ambiental", item_name: "Autos de infração ambiental", description: "Histórico de multas e notificações ambientais", severity: "high" },
  { category: "ambiental", item_name: "Gestão de resíduos", description: "Plano de gerenciamento de resíduos sólidos", severity: "medium" },
  { category: "ambiental", item_name: "Outorga de uso de água", description: "Se aplicável ao setor de atuação", severity: "medium" },
  { category: "ambiental", item_name: "Conformidade com CONAMA", description: "Adequação às resoluções aplicáveis", severity: "medium" },

  // Regulatório
  { category: "regulatorio", item_name: "Alvará de funcionamento", description: "Alvará municipal válido para todas as unidades", severity: "high" },
  { category: "regulatorio", item_name: "Licenças setoriais", description: "ANVISA, ANP, ANATEL ou outras conforme o setor", severity: "critical" },
  { category: "regulatorio", item_name: "Registro em órgãos reguladores", description: "CVM, BACEN, SUSEP conforme aplicável", severity: "high" },
  { category: "regulatorio", item_name: "Certificações obrigatórias", description: "ISO, INMETRO e outras certificações requeridas", severity: "medium" },
  { category: "regulatorio", item_name: "Auto de Vistoria do Corpo de Bombeiros", description: "AVCB válido para todas as unidades", severity: "medium" },
  { category: "regulatorio", item_name: "Compliance anticorrupção", description: "Programa de compliance e Lei Anticorrupção (12.846/2013)", severity: "high" },

  // Tecnológico/PI
  { category: "tecnologico", item_name: "Registro de marcas (INPI)", description: "Marcas registradas e pedidos em andamento", severity: "high" },
  { category: "tecnologico", item_name: "Patentes e propriedade intelectual", description: "Patentes registradas, trade secrets e know-how", severity: "high" },
  { category: "tecnologico", item_name: "Contratos de licença de software", description: "Licenças de sistemas críticos e validade", severity: "medium" },
  { category: "tecnologico", item_name: "Política de privacidade (LGPD)", description: "Adequação à Lei Geral de Proteção de Dados", severity: "high" },
  { category: "tecnologico", item_name: "Infraestrutura de TI", description: "Servidores, cloud, disaster recovery", severity: "medium" },
  { category: "tecnologico", item_name: "Segurança cibernética", description: "Políticas de segurança, incidentes anteriores, pentests", severity: "high" },
  { category: "tecnologico", item_name: "Domínios e ativos digitais", description: "Registro de domínios, redes sociais, apps", severity: "low" },
  { category: "tecnologico", item_name: "Contratos com fornecedores de TI", description: "SLAs e dependências tecnológicas críticas", severity: "medium" },

  // Operacional
  { category: "operacional", item_name: "Contratos com top 10 clientes", description: "Termos, prazos e concentração de receita", severity: "critical" },
  { category: "operacional", item_name: "Contratos com fornecedores-chave", description: "Dependência de fornecedores e condições comerciais", severity: "high" },
  { category: "operacional", item_name: "Lista de ativos fixos", description: "Inventário de máquinas, equipamentos e imóveis", severity: "medium" },
  { category: "operacional", item_name: "Capacidade produtiva instalada", description: "Utilização atual vs capacidade máxima", severity: "medium" },
  { category: "operacional", item_name: "Contratos de locação", description: "Imóveis alugados com termos e vencimentos", severity: "high" },
  { category: "operacional", item_name: "Seguros vigentes", description: "Apólices de seguro com coberturas e valores", severity: "medium" },
  { category: "operacional", item_name: "Plano de continuidade de negócios", description: "BCP e plano de contingência operacional", severity: "medium" },
  { category: "operacional", item_name: "Pipeline comercial", description: "Carteira de pedidos e perspectivas de receita", severity: "medium" },
];
