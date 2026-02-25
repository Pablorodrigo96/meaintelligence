

## Plano: Corrigir colapso do card ao clicar em elementos internos

### Diagnostico

O problema esta na linha 2207 do `src/pages/Matching.tsx`:

```tsx
<Card onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
```

O `onClick` esta no `<Card>` inteiro. Qualquer clique dentro do card expandido (texto, espaco vazio, badges, labels) faz o evento "borbulhar" (bubble) ate o Card e dispara o toggle de expandir/colapsar.

Alguns botoes ja tem `e.stopPropagation()` (Shortlist, Contatado, Ignorar, IA, Enriquecer, links de contato), mas:
1. O **conteudo expandido** inteiro (linhas 2434-2670) nao tem `stopPropagation` -- qualquer clique em texto, cards internos, badges, listas, ou espaco vazio colapsa o card
2. Os links `<a>` dentro dos owners tem `stopPropagation`, mas clicar no **nome** do socio ou no **role** nao tem -- e colapsa

### Solucao

A correcao mais limpa e robusta e:

1. **Remover o `onClick` do `<Card>`** (linha 2207)
2. **Criar uma zona clicavel dedicada** apenas no header compacto (nome, score, badges) que controla o expand/collapse
3. **Adicionar `onClick={e => e.stopPropagation()}` no `<div>` do conteudo expandido** (linha 2434) como seguranca adicional

Concretamente:
- Envolver o header (linhas 2215-2307) em um `<div onClick={toggle} className="cursor-pointer">` 
- Mover o `cursor-pointer` do Card para esse div
- Adicionar `onClick={(e) => e.stopPropagation()}` no div expandido (linha 2434)
- Manter os `e.stopPropagation()` existentes nos botoes de acao

### Resultado esperado

- Clicar no **header** do card (nome, score, badges, dados resumidos) continua expandindo/colapsando
- Clicar em **qualquer elemento dentro** do conteudo expandido (socios, telefone, email, analise IA, links, botoes) **nao** colapsa o card
- Botoes Shortlist, Contatado, Ignorar, IA, Enriquecer continuam funcionando normalmente
- Links de LinkedIn, Instagram, email, website abrem em nova aba sem colapsar

