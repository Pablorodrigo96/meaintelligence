

## Plano: Abandonar Google CSE e tornar o sistema funcional sem ele

O sistema atual usa três fontes para busca de empresas: **Perplexity**, **Google CSE** e **Base Nacional**. Como o Google CSE continua com problemas de permissão, vamos removê-lo do fluxo ativo para que o sistema funcione de forma estável com as duas fontes restantes.

### Escopo das alterações

**Passo 1** -- Identificar onde o `google-search-validate` é chamado no frontend e garantir que o fluxo de matching/busca funcione sem ele (tratando a ausência de resultados do Google como cenário normal, não como erro).

**Passo 2** -- Revisar a lógica de orquestração (provavelmente em `national-search` ou nas páginas `Matching`/`Companies`) para que o Google CSE seja ignorado ou desativado, sem quebrar o pipeline.

**Passo 3** -- Manter o código da edge function `google-search-validate` intacto (apenas não chamá-lo), para facilitar a reativação futura quando as credenciais estiverem corretas.

### Resultado esperado

O sistema de busca e validação de empresas funcionará exclusivamente com **Perplexity + Base Nacional**, sem erros ou dependência do Google CSE.

Preciso explorar o código do frontend para identificar exatamente onde o Google CSE é referenciado antes de implementar.

