
## Atualizar a Connection String e Testar a Conexão

Recebi a connection string completa. Aqui está o que vou fazer:

### 1. Atualizar o Secret EXTERNAL_DB_URL

Vou atualizar o secret `EXTERNAL_DB_URL` com a string correta:
```
postgresql://postgres:uHEZgMiTpNGohUYB@db.oyarjshdqeaatlmlzvbx.supabase.co:5432/postgres
```

### 2. Testar a conexão imediatamente

Após atualizar, vou chamar a edge function `national-search` diretamente para verificar se a conexão com o banco externo funciona. O teste vai buscar empresas em SP para confirmar que os dados chegam corretamente.

### 3. Verificar o schema das tabelas

A edge function já está configurada com os nomes padrão da Receita Federal:
- Tabela: `estabelecimentos`
- Colunas: `cnpj`, `razao_social`, `nome_fantasia`, `cnae_fiscal`, `uf`, `municipio`, `porte`, `capital_social`, `situacao_cadastral`

Se o seu banco tiver nomes diferentes, ajusto o código na hora.

### 4. Confirmar o Matching Base Nacional

Depois da conexão verificada, o botão "Base Nacional" na tela de Matching estará funcionando — consultando os 5M+ registros do seu banco externo, filtrando pelos critérios da busca, e passando os candidatos para a IA pontuar.

---

**Nota de segurança**: A senha ficará armazenada de forma criptografada no cofre de secrets — nunca aparece no código ou nos logs.
