# Nexus (Krigzis)

> Gerenciador de tarefas desktop com IA integrada, foco em produtividade e privacidade.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6.svg)]()
[![Electron](https://img.shields.io/badge/Electron-28-47848F.svg)]()
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)]()

---

## Visão Geral

**Nexus** é uma aplicação desktop para gerenciamento de tarefas e notas, construída com Electron + React + TypeScript. Oferece fluxo Kanban (Backlog → Esta Semana → Hoje → Concluído), notas vinculadas a tarefas, timer Pomodoro, relatórios de produtividade e assistente IA local.

### Principais Funcionalidades

- **Kanban de Tarefas** — Backlog, Esta Semana, Hoje, Concluído com drag & drop
- **Notas Vinculadas** — Markdown/texto com imagens, vinculação bidirecional a tarefas
- **Timer Pomodoro** — Sessões focadas com estatísticas e streaks
- **Relatórios** — Insights de produtividade e análise de desempenho
- **Backup & Importação** — ZIP, JSON, CSV, ENEX (Evernote), HTML, PDF com preview
- **Armazenamento Configurável** — Cloud (Supabase), Local (MemoryDB) ou Híbrido
- **IA Local** — Sugestões proativas e assistente de produtividade (privacidade máxima)
- **Temas** — Dark/Light/System com personalização de cores e densidade
- **i18n** — Português (BR) e Inglês
- **Atualizações Automáticas** — Via GitHub Releases

---

## Pré-requisitos

- **Node.js** >= 18 LTS
- **npm** >= 9
- **Git**
- **Windows** 10/11 (build principal; macOS/Linux experimental)

---

## Instalação

```bash
# Clonar o repositório
git clone https://github.com/PauloHYBEX/krigzis.git
cd krigzis

# Instalar dependências
npm install
```

---

## Desenvolvimento

```bash
# Iniciar em modo desenvolvimento (renderer + main + electron)
npm run dev
```

O renderer sobe em `http://localhost:3000` via webpack-dev-server. O Electron inicia automaticamente quando os artefatos estão prontos.

### Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev completo (renderer + main + electron) |
| `npm run build` | Build de produção (main + preload + renderer) |
| `npm run lint` | Verificar código com ESLint |
| `npm run lint:fix` | Corrigir problemas de lint automaticamente |
| `npm run format` | Formatar código com Prettier |
| `npm test` | Executar testes |
| `npm run package:win` | Gerar instalador Windows |

---

## Estrutura do Projeto

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Entry point, IPC handlers, lifecycle
│   ├── preload.ts           # contextBridge API segura
│   ├── database-manager.ts  # Gerenciador do MemoryDatabase
│   ├── backup/              # Sistema de backup (ZIP, JSON, CSV, ENEX)
│   ├── cloud/               # Integração cloud (Supabase sync)
│   ├── logging/             # Logger estruturado + audit + crash reporter
│   └── version/             # Auto-update via GitHub Releases
│
├── renderer/                # React UI
│   ├── App.tsx              # Root component com roteamento
│   ├── components/          # Componentes visuais
│   │   ├── Dashboard.tsx    # Tela principal com cards e quick actions
│   │   ├── TaskList.tsx     # Lista de tarefas por status
│   │   ├── TaskModal.tsx    # Modal de criação/edição de tarefa
│   │   ├── Notes.tsx        # Painel de notas
│   │   ├── NoteEditor.tsx   # Editor de notas (Markdown/texto)
│   │   ├── Settings.tsx     # Configurações completas
│   │   ├── Timer.tsx        # Timer Pomodoro
│   │   ├── Reports.tsx      # Relatórios de produtividade
│   │   └── ui/              # Componentes base (Button, Card, Badge, etc.)
│   ├── contexts/            # React Contexts (Notes, Tasks, Categories, Auth)
│   ├── hooks/               # Hooks customizados (useSettings, useTheme, etc.)
│   ├── lib/                 # Bibliotecas (Supabase client)
│   └── styles/              # CSS global, tokens, animações
│
├── shared/                  # Código compartilhado (main + renderer)
│   ├── database/            # MemoryDatabase (persistência JSON)
│   ├── types/               # Interfaces TypeScript (Task, Note, Timer, etc.)
│   └── config/              # Configurações de ambiente
│
assets/                      # Ícones e recursos visuais
scripts/                     # Scripts de build, release e distribuição
supabase/                    # Migrations SQL para Supabase
docs/                        # Documentação legada (consolidada neste README)
```

---

## Arquitetura

### Processos do Electron

| Processo | Entry Point | Responsabilidade |
|----------|-------------|------------------|
| **Main** | `src/main/index.ts` | Janela, IPC handlers, DB, logging, updates |
| **Preload** | `src/main/preload.ts` | Bridge segura (`electronAPI`) via `contextBridge` |
| **Renderer** | `src/renderer/index.tsx` | React app, UI, hooks, contexts |

### Persistência

- **Local**: `MemoryDatabase` → JSON em `%APPDATA%/Nexus/data/memory-data.json`
- **Cloud**: Supabase (PostgreSQL) com RLS por `user_id`
- **Modo Configurável**: Cloud / Local / Híbrido (selecionável nas Configurações)

### Comunicação IPC

```
Renderer  →  window.electronAPI.namespace.action(args)
              ↓ (ipcRenderer.invoke)
Preload   →  contextBridge.exposeInMainWorld
              ↓
Main      →  ipcMain.handle('namespace:action', handler)
```

### Canais IPC Principais

- **Tarefas**: `tasks:getAll`, `tasks:create`, `tasks:update`, `tasks:delete`, `tasks:getStats`
- **Notas**: `database:getAllNotes`, `database:createNote`, `database:updateNote`, `database:deleteNote`
- **Backup**: `backup:exportZip`, `backup:importZipApply`, `backup:importJsonApply`, etc.
- **Logging**: `logging:getLogs`, `logging:exportLogs`, `logging:clearLogs`
- **Sistema**: `system:selectFolder`, `app:getVersion`

---

## Modelo de Dados

### Task
```typescript
{
  id: number;
  title: string;
  description?: string;
  status: 'backlog' | 'esta_semana' | 'hoje' | 'concluido';
  priority: 'low' | 'medium' | 'high';
  category_id?: number;
  linkedNoteId?: number;
  created_at: string;
  updated_at: string;
}
```

### Note
```typescript
{
  id: number;
  title: string;
  content: string;
  format: 'text' | 'markdown';
  tags?: string[];
  attachedImages?: string[];
  linkedTaskIds?: number[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Configurações (Storage Mode)

O sistema suporta três modos de armazenamento:

| Modo | Descrição |
|------|-----------|
| **Cloud** | Dados em Supabase (requer autenticação) |
| **Local** | Dados em MemoryDB local (offline, máxima privacidade) |
| **Híbrido** | Escrita em ambos; leitura prioriza cloud com fallback local |

Configurável em **Configurações → Dados & Armazenamento**.

---

## Build e Distribuição

### Build de Produção

```bash
npm run build
```

### Empacotamento Windows

```bash
# Instalador NSIS
npm run package:win

# Portable
npm run package:win:portable
```

### Release via GitHub Actions

O workflow `.github/workflows/release.yml` automatiza:
1. Build do renderer, main e preload
2. Empacotamento com electron-builder
3. Upload de artefatos para GitHub Releases

---

## Supabase (Cloud)

### Configuração

1. Criar projeto no [Supabase](https://supabase.com)
2. Executar o migration SQL em `supabase/migrations/001_create_all_tables.sql`
3. Configurar variáveis de ambiente ou `src/renderer/lib/supabase.ts`

### Tabelas

- `notes` — Notas do usuário
- `tasks` — Tarefas do usuário
- `categories` — Categorias customizadas
- `note_task_links` — Vínculos nota ↔ tarefa
- `user_settings` — Configurações sincronizadas
- `timer_stats` — Estatísticas do timer

Todas as tabelas possuem **Row Level Security (RLS)** habilitado.

---

## Contribuição

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para instruções detalhadas.

### Resumo Rápido

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça suas alterações e commite: `git commit -m "feat: descrição"`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

**Copyright (c) 2025 Paulo Riccardo Nascimento dos Santos**

---

## Autor

**Paulo Riccardo Nascimento dos Santos**
- GitHub: [@PauloHYBEX](https://github.com/PauloHYBEX)
