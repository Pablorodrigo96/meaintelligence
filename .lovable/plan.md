

## Diagnóstico do zero — Google CSE 403

### O que sabemos com certeza
- A chave API começa com `AIzaSyAocb` (confirmado via log de debug)
- O projeto Google Cloud é `1067714511108`
- A Custom Search API aparece como ativa no console
- O billing está ativo
- O erro é sempre: `"This project does not have the access to Custom Search JSON API."` com `PERMISSION_DENIED`

### Nova hipótese: API errada ativada

Existem **duas APIs diferentes** no Google Cloud com nomes parecidos:

```text
1. "Custom Search API"         → customsearch.googleapis.com  ← ESTA é a correta
2. "Custom Search JSON API"    → (nome que aparece no erro)
```

O Google mudou a nomenclatura ao longo do tempo. A API que precisa estar ativa é **`customsearch.googleapis.com`** (aparece como "Custom Search API" na biblioteca de APIs). Se você ativou outra variante, o erro 403 persiste.

### Plano: Testar a chave diretamente no navegador

Em vez de continuar tentando pela edge function, vamos testar a chave **diretamente** para isolar se o problema é a chave, a API, ou o Custom Search Engine (CX).

**Passo 1 — Criar uma edge function de diagnóstico (`google-cse-debug`)**

Esta função fará 3 testes independentes e retornará o resultado de cada um:

1. **Teste 1**: Chamar a API com a chave e CX atuais → registrar status + erro exato
2. **Teste 2**: Chamar a API **sem o parâmetro CX** → para diferenciar se o erro é da chave ou do CX
3. **Teste 3**: Chamar o endpoint de info do Custom Search Engine (`https://cse.google.com/cse?cx={CX}`) → verificar se o CX existe

Os resultados dos 3 testes serão retornados em um único JSON, permitindo diagnóstico completo.

**Passo 2 — Analisar resultados e agir**

| Teste 1 | Teste 2 | Teste 3 | Diagnóstico |
|---------|---------|---------|-------------|
| 403     | 403     | qualquer | Problema na chave ou API não ativada |
| 403     | 200/400 | qualquer | Problema no CX |
| 200     | —       | —       | Tudo funciona |

**Passo 3 — Corrigir baseado no diagnóstico**

- Se a chave é o problema → criar nova chave com API restrictions específicas para Custom Search API
- Se o CX é o problema → verificar/recriar o Programmable Search Engine em `programmablesearchengine.google.com`
- Se tudo funciona → remover a function de debug e o problema era transitório

### Detalhes técnicos

- Será criada uma edge function temporária `google-cse-debug` com `verify_jwt = false`
- A function faz 3 `fetch` calls e retorna os resultados em JSON
- Nenhuma alteração no código de produção (`google-search-validate` ou `Matching.tsx`)
- Após o diagnóstico, a function será removida

