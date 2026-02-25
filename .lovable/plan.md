

## Diagnostico atualizado

O projeto Google Cloud e o mesmo (1067714511108), a API esta ativada, e a chave foi criada sem restricoes. Mesmo assim, o erro 403 persiste com a mensagem generica "This project does not have the access to Custom Search JSON API."

Existem duas causas provaveis restantes:

1. **Faturamento (Billing) nao ativado** -- A Custom Search JSON API requer um projeto com billing ativo no Google Cloud. Sem billing, a API aparece como "ativada" mas as chamadas sao bloqueadas com 403.

2. **A chave armazenada no secret nao e a nova** -- E possivel que o secret `GOOGLE_CSE_API_KEY` nao tenha sido atualizado corretamente com o novo valor.

## Plano

### Passo 1 -- Adicionar log de debug na edge function
Modificar `google-search-validate` para logar os primeiros 10 caracteres da chave API sendo usada. Isso confirma se o secret correto esta em uso.

```text
Antes:  const GOOGLE_CSE_API_KEY = Deno.env.get("GOOGLE_CSE_API_KEY");
Depois: const GOOGLE_CSE_API_KEY = Deno.env.get("GOOGLE_CSE_API_KEY");
        console.log("Using API key starting with:", GOOGLE_CSE_API_KEY?.substring(0, 10));
```

### Passo 2 -- Testar e verificar o log
Chamar a function e verificar nos logs se a chave comeca com `AIzaSyAocb` (que e o inicio da nova chave fornecida).

### Passo 3 -- Se a chave estiver correta, o problema e billing
Se os logs confirmarem a chave correta, voce precisara ativar o faturamento no Google Cloud:
- Google Cloud Console > Billing > Link a billing account ao projeto 1067714511108

### Detalhes tecnicos

- A unica alteracao de codigo e adicionar 1 linha de `console.log` para debug na edge function `google-search-validate`
- Apos confirmar o diagnostico, a linha de debug sera removida
- A Custom Search JSON API oferece 100 consultas/dia gratuitas, mas exige billing ativo no projeto

