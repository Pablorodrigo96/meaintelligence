
## Objetivo
Substituir todas as 227 ocorrências de "Desktop" por "Compradora" no arquivo `src/data/pmi-playbook.ts`, tornando o playbook agnóstico à empresa específica.

## Contexto
- Arquivo: `src/data/pmi-playbook.ts`
- Total de ocorrências: 227
- Padrão: "Desktop" aparece em descritivo das atividades (exemplos: "modelo Desktop", "processos da Desktop", "escritório Desktop", "time interno de integrações Desktop", etc.)

## Estratégia de Substituição
Usar a ferramenta de line-replace para fazer uma substituição global eficiente:
1. Ler o arquivo completo
2. Fazer substituição regex global de todas as instâncias de "Desktop" → "Compradora"
3. Manter a estrutura e formatação do arquivo intacta
4. Preservar a capitalização: "Desktop" → "Compradora"

## Exemplos de mudanças
- "Padronizar fluxo de caixa ao modelo Desktop" → "Padronizar fluxo de caixa ao modelo Compradora"
- "Apresentar ao time interno de integrações Desktop..." → "Apresentar ao time interno de integrações Compradora..."
- "Transferência para escritório Desktop" → "Transferência para escritório Compradora"
- "Processos da Desktop e adquirida" → "Processos da Compradora e adquirida"

## Impacto
- Torna o playbook reutilizável para qualquer empresa compradora
- Mantém a consistência semântica (Desktop = empresa compradora)
- Não afeta nenhum outro arquivo ou funcionalidade
- O banco de dados refletirá essas mudanças quando o playbook for inicializado

## Implementação
Uma única operação de substituição global no arquivo que irá:
1. Substituir todas as 227 ocorrências de "Desktop" por "Compradora"
2. Preservar a formatação TypeScript e a estrutura de dados
3. Manter todos os outros conteúdos idênticos
