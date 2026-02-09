# Contribuindo para o Nexus (Krigzis)

Obrigado pelo interesse em contribuir! Este documento descreve as diretrizes para contribuição no projeto.

---

## Como Contribuir

### 1. Fork e Clone

```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/SEU_USUARIO/nexus.git
cd nexus

# Adicione o upstream
git remote add upstream https://github.com/PaulNasc/nexus.git
```

### 2. Configurar o Ambiente

```bash
# Instalar dependências
npm install

# Verificar que tudo compila
npm run build

# Iniciar em modo desenvolvimento
npm run dev
```

### 3. Criar uma Branch

Use nomes descritivos seguindo o padrão:

```bash
git checkout -b feature/descricao-curta    # Nova funcionalidade
git checkout -b fix/descricao-do-bug       # Correção de bug
git checkout -b docs/o-que-mudou           # Documentação
git checkout -b refactor/o-que-mudou       # Refatoração
```

### 4. Fazer Alterações

- Siga os padrões de código existentes
- Adicione tipos TypeScript adequados (evite `any`)
- Mantenha componentes pequenos e testáveis
- Comente apenas lógica complexa

### 5. Validar

Antes de commitar, execute:

```bash
# Lint
npm run lint

# Build completo
npm run build

# Testes (quando disponíveis)
npm test
```

### 6. Commit

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar filtro de tarefas por prioridade
fix: corrigir importação de notas ENEX com imagens
docs: atualizar README com instruções de Supabase
refactor: extrair lógica de backup para módulo separado
style: ajustar espaçamento no painel de notas
chore: atualizar dependências do webpack
```

### 7. Pull Request

```bash
git push origin feature/minha-feature
```

Abra um PR no GitHub com:
- **Título** claro seguindo Conventional Commits
- **Descrição** do que foi alterado e por quê
- **Screenshots** se houver mudanças visuais
- **Checklist** de validação (lint, build, testes)

---

## Padrões de Código

### TypeScript
- Strict mode habilitado
- Tipar corretamente, evitar `any`
- Interfaces em `src/shared/types/`
- Usar `PascalCase` para tipos/interfaces, `camelCase` para variáveis/funções

### React
- Componentes funcionais com TypeScript
- Hooks customizados para lógica reutilizável
- Contexts para estado compartilhado
- Evitar prop drilling excessivo

### Electron
- IPC handlers com try-catch
- Preload como fronteira de segurança
- Nunca expor `nodeIntegration` no renderer

### Nomenclatura
- **Arquivos**: `kebab-case.ts` (ex: `backup-manager.ts`)
- **Componentes**: `PascalCase.tsx` (ex: `BackupPanel.tsx`)
- **Hooks**: `camelCase.ts` com prefixo `use` (ex: `useSettings.tsx`)
- **Constantes**: `UPPER_SNAKE_CASE`

### Estrutura de Pastas
- `src/main/` — Código do processo principal (Node.js)
- `src/renderer/` — Código da UI (React)
- `src/shared/` — Tipos e lógica compartilhada
- Novos domínios devem seguir a separação existente

---

## Reportar Bugs

Abra uma [Issue](https://github.com/PaulNasc/nexus/issues) com:

1. **Descrição** clara do problema
2. **Passos para reproduzir**
3. **Comportamento esperado** vs **comportamento atual**
4. **Screenshots** se aplicável
5. **Ambiente**: versão do app, OS, Node.js

---

## Sugerir Funcionalidades

Abra uma [Issue](https://github.com/PaulNasc/nexus/issues) com a tag `enhancement`:

1. **Descrição** da funcionalidade
2. **Motivação** — por que seria útil?
3. **Exemplos** de uso
4. **Alternativas** consideradas

---

## Código de Conduta

- Seja respeitoso e construtivo
- Foque em feedback técnico objetivo
- Contribuições de todos os níveis são bem-vindas

---

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a [MIT License](LICENSE) do projeto.
