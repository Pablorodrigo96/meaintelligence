

## Diagnostico

A backend function `google-search-validate` ainda usa a **chave antiga** armazenada no secret `GOOGLE_CSE_API_KEY`. A nova chave que voce criou (`AIzaSyAocbj9Lo6_Au_xq9IihYmI2H0u_guHeV0`) precisa ser atualizada no backend.

O erro continua identico: `"This project does not have the access to Custom Search JSON API."` -- porque a function ainda le a chave antiga do secret.

## Plano

1. **Atualizar o secret `GOOGLE_CSE_API_KEY`** com o novo valor `AIzaSyAocbj9Lo6_Au_xq9IihYmI2H0u_guHeV0`
2. **Testar a function `google-search-validate`** com setor Telecom e estado RS
3. **Confirmar que retorna empresas** em vez de erro 403

## Detalhes tecnicos

- O secret `GOOGLE_CSE_API_KEY` ja existe no backend e sera sobrescrito com o novo valor
- Nenhuma alteracao de codigo e necessaria -- apenas a atualizacao do secret
- Apos a atualizacao, a function usara automaticamente a nova chave na proxima chamada

