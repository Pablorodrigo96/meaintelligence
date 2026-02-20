
## Problema

O campo `municipio` na tabela `estabelecimentos` do banco externo usa o código numérico próprio da Receita Federal (ex: `6547`, `7181`, `4123`), que é diferente do código IBGE. O banco externo não possui tabela de municípios, e o mapeamento atual (`RF_MUNICIPIO_MAP`) só cobre ~20 cidades principais. Cidades menores aparecem como código numérico bruto na interface.

## Solução: Mapeamento Completo Embutido no Edge Function

A abordagem mais robusta é incorporar o mapeamento completo dos ~5570 municípios diretamente no código do Edge Function como um objeto estático. Isso elimina qualquer dependência de tabelas externas, zero latência adicional de consulta e resolução 100% dos códigos.

Os códigos da Receita Federal são disponibilizados publicamente no arquivo de layout dos dados abertos do CNPJ (`municipios.json`/`municipios.csv`) e seguem uma numeração sequencial de 4 dígitos.

## O que será alterado

### `supabase/functions/national-search/index.ts`

1. **Remover** o `RF_MUNICIPIO_MAP` parcial atual (que tinha apenas ~20 cidades e até uma duplicata — `"6001"` aparecia duas vezes, mapeando para Porto Alegre e Rio de Janeiro).

2. **Adicionar** o objeto `RF_MUNICIPIOS` completo com todos os ~5570 municípios brasileiros no formato `"codigo": "Nome do Município"`. Os códigos da RF vão de 1 dígito a 4 dígitos (ex: `"0001"` a `"9999"`), derivados do arquivo público da Receita Federal.

3. **Remover** a lógica de checagem da tabela `municipios` no banco externo (bloco `try/catch` com `queryObject` para `information_schema.tables`) — essa consulta extra adicionava latência e já sabemos que a tabela não existe.

4. **Simplificar** a função de resolução de município:
   ```typescript
   // Antes: consulta ao banco + fallback para mapa parcial
   // Depois: lookup direto no mapa completo
   const cityName = RF_MUNICIPIOS[municipioCod] || municipioCod;
   ```

## Impacto

- Todos os resultados do matching Base Nacional passam a exibir o nome correto da cidade
- Latência da edge function reduzida (eliminamos 2 queries extras ao banco externo por chamada)
- Zero dependência de tabela externa para resolução de municípios
- Correção do bug de duplicata na chave `"6001"` (Porto Alegre vs Rio de Janeiro)

## Técnico: Fonte dos Dados

O mapeamento completo será baseado no arquivo oficial `municipios.json` disponibilizado pela Receita Federal junto com os dados públicos do CNPJ, contendo os 5570 municípios com seus respectivos códigos RF de 4 dígitos.
