# Nexus

> Gerenciador de tarefas desktop com IA integrada, foco em produtividade e privacidade.

[![Version](https://img.shields.io/badge/Versão-1.3.1-6366f1.svg)](https://github.com/PaulNasc/nexus/releases/latest)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6.svg)]()

---

## Download

Baixe sempre a versão mais recente em **[Releases](https://github.com/PaulNasc/nexus/releases/latest)**.

| Arquivo | Descrição |
|---|---|
| `Nexus-Setup-x.x.x.exe` | Instalador — recomendado para a maioria dos usuários |
| `Nexus-x.x.x-x64.exe` | Portátil — executa sem instalação |

---

## Instalação

### Instalador (recomendado)

1. Baixe `Nexus-Setup-x.x.x.exe`
2. Execute e siga o assistente de instalação
3. O Nexus iniciará automaticamente ao final

### Versão Portátil

1. Baixe `Nexus-x.x.x-x64.exe`
2. Execute diretamente — nenhuma instalação necessária
3. Os dados ficam na pasta `%APPDATA%\Nexus`

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Kanban de Tarefas** | Quadro com colunas Backlog → Esta Semana → Hoje → Concluído |
| **Notas Vinculadas** | Editor Markdown com imagens, vinculação bidirecional a tarefas |
| **Timer Pomodoro** | Sessões focadas com estatísticas e streaks |
| **Relatórios** | Insights de produtividade e análise de desempenho |
| **Backup & Importação** | Exportar/importar ZIP, JSON, CSV, ENEX (Evernote), HTML, PDF |
| **Armazenamento** | Cloud (Supabase), Local ou Híbrido — configurável |
| **IA Local** | Sugestões proativas e assistente de produtividade |
| **Temas** | Dark / Light / System com personalização de cores |
| **Atualizações Automáticas** | Notificação e atualização via GitHub Releases |

---

## Armazenamento de Dados

O Nexus suporta três modos de armazenamento, configuráveis em **Configurações → Dados & Armazenamento**:

| Modo | Descrição |
|---|---|
| **Cloud** | Dados sincronizados via Supabase (requer autenticação) |
| **Local** | Dados salvos localmente em `%APPDATA%\Nexus\data\` (offline, máxima privacidade) |
| **Híbrido** | Escrita em ambos; leitura prioriza cloud com fallback local |

### Localização dos dados locais

```
%APPDATA%\Nexus\data\memory-data.json
```

---

## Atualizações

O Nexus verifica atualizações automaticamente ao iniciar.

- **Instalador**: a atualização é aplicada automaticamente em background
- **Portátil**: uma notificação é exibida com o link para download da nova versão

Para verificar manualmente: **Configurações → Sobre → Verificar Atualizações**

---

## Requisitos do Sistema

| Requisito | Mínimo |
|---|---|
| **Sistema Operacional** | Windows 10 / 11 (64-bit) |
| **Memória RAM** | 4 GB |
| **Espaço em Disco** | 300 MB |
| **Conexão** | Opcional (somente para modo Cloud) |

---

## Changelog

Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico completo de versões.

---

## Autor

**Paulo Riccardo Nascimento dos Santos** — [@PaulNasc](https://github.com/PaulNasc)
