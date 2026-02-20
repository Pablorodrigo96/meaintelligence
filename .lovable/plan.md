
## Finalizar a Integração do Mapeamento Completo de Municípios

### Estado Atual

O arquivo `rf-municipios.ts` já foi criado com os ~5.570 municípios e o `import { RF_MUNICIPIOS }` já está no topo do `index.ts`. Porém, o `index.ts` ainda tem código legado que precisa ser removido:

- **Linhas 62-77**: Objeto `RF_MUNICIPIO_MAP` antigo com apenas ~20 cidades (com bug de chave duplicada `"6001"`)
- **Linhas 142-160**: Bloco `try/catch` que faz 2 queries extras ao banco externo verificando se existe tabela `municipios`
- **Linha 143**: `let municipioMap = { ...RF_MUNICIPIO_MAP }` — variável que usa o mapa antigo
- **Linha 195**: `municipioMap[municipioCod]` — lookup usando a variável antiga

### Alterações no `supabase/functions/national-search/index.ts`

1. **Remover** o objeto `RF_MUNICIPIO_MAP` (linhas 62-77)

2. **Remover** o bloco de checagem da tabela `municipios` (linhas 142-160), eliminando 2 queries extras por chamada

3. **Simplificar** o lookup do município na linha 195:
   ```typescript
   // Antes
   let municipioMap: Record<string, string> = { ...RF_MUNICIPIO_MAP };
   // ... bloco try/catch com queries extras ...
   const cityName = municipioMap[municipioCod] || municipioCod;

   // Depois (direto, sem variável intermediária)
   const cityName = RF_MUNICIPIOS[municipioCod] || municipioCod;
   ```

### Após as Alterações: Teste Direto

Após o deploy automático, será chamada a edge function `national-search` com `target_state: "SP"` para verificar que os municípios retornam com nomes corretos (ex: "Campinas", "Ribeirão Preto", "Santos") ao invés de códigos numéricos brutos.

### Impacto

- 100% dos ~5.570 municípios brasileiros resolvidos corretamente
- Latência reduzida: eliminamos 2 queries SQL extras ao banco externo por chamada
- Correção do bug de duplicata na chave `"6001"` (era mapeada para "Porto Alegre" e depois sobrescrita por "Rio de Janeiro" no mesmo objeto)
