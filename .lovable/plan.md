

## Atualizar o CX e testar o Google CSE

O novo Search Engine ID (CX) extraido do codigo que voce compartilhou e: `545444b5a8bb94bbd`

O CX antigo nos logs era `e2bfbb4ce6...`. Este novo CX pertence ao Search Engine que voce acabou de criar, o que deve resolver o problema de permissao (403) que era causado pelo CX antigo estar associado a um projeto Google Cloud diferente.

### Plano

**Passo 1** -- Atualizar o secret `GOOGLE_CSE_CX` com o novo valor `545444b5a8bb94bbd`

**Passo 2** -- Chamar a edge function `google-search-validate` com um teste real (ex: setor Telecom, estado RS) para confirmar que o 403 foi resolvido

**Passo 3** -- Se funcionar, verificar os resultados retornados. Se ainda der 403, o problema esta na chave API e nao no CX.

### Lembrete importante

Certifique-se de que a opcao **"Pesquisar em toda a web"** esta ativada nas configuracoes do seu Search Engine em `programmablesearchengine.google.com`. Caso contrario, a busca ficara restrita apenas ao dominio `google.com` que voce adicionou.

