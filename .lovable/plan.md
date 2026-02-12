
## Plano: Adicionar Embed de Valuation Externo

### Contexto Atual
A página `Valuation.tsx` apresenta:
- Um formulário de seleção de empresa com parâmetros (taxa de crescimento, taxa de desconto, múltiplo EBITDA)
- Cálculo de valuation via edge function `ai-analyze`
- Exibição de resultados (DCF e EBITDA) com análise de sensibilidade

### Solução Proposta
Adicionar um iframe que embeda o site `https://vcedealflow.lovable.app/valuation` como complemento à ferramenta atual. O embed será colocado abaixo dos resultados (ou em uma aba separada) para não interferir com o fluxo existente.

### Abordagem
1. **Localização do Embed**: Adicionar após a seção de resultados (linha 134)
2. **Estrutura HTML**: Um `<iframe>` com:
   - `src="https://vcedealflow.lovable.app/valuation"`
   - `title="Valuation External Tool"`
   - `width="100%"` e `height="800px"` (responsivo)
   - `border="0"` e classes Tailwind para estilo consistente
   - `allowFullScreen` para permitir modo tela cheia se necessário

3. **Estilo e Responsividade**:
   - Envolver o iframe em um `Card` (consistente com design)
   - Adicionar título "Ferramenta Adicional de Valuation"
   - Ajustar altura para mobile (ex: `min-h-[600px]` em mobile, `min-h-[800px]` em desktop)
   - Aplicar border e rounded corners do design system

4. **Segurança**:
   - Usar `sandbox="allow-same-origin allow-scripts allow-popups allow-forms"` se necessário interatividade completa
   - O site é seu (`vcedealflow.lovable.app`), então é seguro

### Arquivo a Modificar
- `src/pages/Valuation.tsx` -- inserir Card com iframe após os resultados

### Código Adicionado (aproximadamente linhas 134-142)
```jsx
<Card>
  <CardHeader>
    <CardTitle className="font-display flex items-center gap-2">
      <Calculator className="w-5 h-5 text-primary" />
      Ferramenta Adicional de Valuation
    </CardTitle>
  </CardHeader>
  <CardContent>
    <iframe
      src="https://vcedealflow.lovable.app/valuation"
      title="Valuation Tool"
      width="100%"
      height="800"
      frameBorder="0"
      className="rounded-lg border border-border"
    />
  </CardContent>
</Card>
```

### Vantagens
- Não interfere com a ferramenta existente
- Usuário pode usar ambas as ferramentas na mesma página
- Design consistente com o resto da plataforma
- Simples de implementar e manter

