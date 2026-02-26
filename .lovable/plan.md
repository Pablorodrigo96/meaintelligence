

## Atualizar cargo de pablo@vispe.com.br para Admin

### Dados confirmados
- **User ID**: `05934919-c524-4e37-b9b6-8255508f1b01`
- **Role atual**: `advisor`
- **Role desejada**: `admin`
- **ID do registro**: `ffb2b870-3aa2-4392-9c94-f4778ee96e01`

### Alteração

Executar um UPDATE na tabela `user_roles` para mudar o role de `advisor` para `admin`:

```sql
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '05934919-c524-4e37-b9b6-8255508f1b01';
```

Após a mudança, o usuário terá acesso completo às páginas de administração (Gestão de Usuários, Consumo de APIs).

