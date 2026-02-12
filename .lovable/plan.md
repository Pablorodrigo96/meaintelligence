

# Simplificar Pagina de Valuation

## O que muda

Remover todo o calculador basico (selecao de empresa, sliders, botao "Calcular Valuation" e resultados) e deixar apenas o iframe do vcedealflow como ferramenta principal de valuation.

## Limitacao tecnica: Login automatico

Como os dois sites sao projetos separados com bancos de dados independentes, **nao e possivel fazer login automatico** no iframe. O navegador bloqueia interacoes de autenticacao entre dominios diferentes (politica de same-origin). O usuario precisara fazer login manualmente uma vez dentro do iframe -- apos isso a sessao fica salva no navegador.

## Arquivo modificado

**src/pages/Valuation.tsx**

### Remover
- Todos os states (selectedCompany, growthRate, discountRate, ebitdaMultiple, result)
- Queries de companies e valuations
- Mutation de valuation
- Funcao formatVal
- Card "Parametros de Valuation" inteiro (select, sliders, botao)
- Card de resultados (DCF, EBITDA, sensibilidade)
- Imports nao utilizados (useState, useQuery, useMutation, Slider, Select, Label, LineChart, etc.)

### Manter
- Titulo e descricao da pagina
- Card com iframe do vcedealflow (agora como conteudo principal)
- Atualizar titulo do Card para "Valuation" (remover "Ferramenta Adicional")

### Resultado final
Pagina limpa com:
1. Titulo "Valuation de Empresa"
2. Subtitulo descritivo
3. Card unico com iframe em tela cheia (`height="800"`)

