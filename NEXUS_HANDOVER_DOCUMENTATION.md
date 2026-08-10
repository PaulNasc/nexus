# Documento de Transição e Referência Técnica Completa — Nexus (v1.4.0)

> Este documento contém todos os detalhes arquiteturais, convenções de desenvolvimento, instruções de build/release, detalhes da migração para Tauri v2 e soluções de segurança/LGPD implementadas no projeto **Nexus**.

---

## 📌 1. Visão Geral do Projeto e Arquitetura

O **Nexus** é uma aplicação desktop de alta performance para gerenciamento de notas em Markdown/Texto, tarefas, quadros de progresso, tags de sistema, anexos de mídia (vídeos, PDFs, imagens) e sincronização híbrida em nuvem.

### Tech Stack Principal
- **Frontend Layer:** React, TypeScript, Webpack, Tailwind CSS, Lucide Icons.
- **Desktop Engine:** **Tauri v2** (Rust backend com WebView2 no Windows, suporte a macOS e Linux).
- **Cloud Infrastructure:**
  - **Supabase:** Autenticação (OAuth Google & Discord, email/senha), PostgreSQL DB com Row Level Security (RLS) e Realtime WebSocket subscriptions.
  - **Cloudflare R2:** Armazenamento seguro de objetos (vídeos, PDFs) acessados via URLs temporárias assinadas (Signed URLs).
- **Arquitetura Desktop Adaptativa (`desktopAdapter.ts`):**
  Abstrai as chamadas nativas do sistema em uma interface unificada (`isTauri()`, `isElectron()`, `fetchBlob()`, `openExternal()`). Isso garante que o mesmo código frontend funcione perfeitamente no Tauri, no Electron (legado) e na Web.

---

## 🌿 2. Fluxo de Trabalho com Git e Estratégia de Branches

### ⚠️ Regra de Ouro (MANDATÓRIA)
> **NUNCA realizar commit direto ou merge na branch `master` sem autorização prévia e explícita do usuário.**

### Trabalhando com Branches
1. **Criação de Branchs Isoladas por Feature/Fix:**
   Todo trabalho novo (funcionalidade ou correção) deve ser isolado em sua própria branch:
   ```bash
   git checkout -b feature/nome-da-feature
   # ou para correções:
   git checkout -b fix/nome-da-correcao
   ```

2. **Convenção de Commits (Conventional Commits):**
   - `feat(...)`: nova funcionalidade (ex: `feat(tauri): add video lightbox modal`).
   - `fix(...)`: correção de bug (ex: `fix(privacy): resolve multi-user data leak`).
   - `perf(...)`: otimização de performance.
   - `refactor(...)`: refatoração de código sem mudança comportamental.
   - `docs(...)`: atualizações de documentação.

3. **Checklist de Validação Pré-Commit:**
   Antes de commitar, execute a verificação completa:
   ```bash
   # 1. Validar tipos TypeScript
   npx tsc --noEmit

   # 2. Validar backend Rust
   cd src-tauri && cargo check && cd ..

   # 3. Executar testes unitários
   npx jest --env=node
   ```

4. **Entrega para Teste do Usuário:**
   - Commit os arquivos na branch de trabalho.
   - Notifique o usuário que a branch está pronta para testes.
   - Aguarde o **"De acordo / Autorização de Merge"** do usuário para mesclar na branch `master`.

---

## 🛠️ 3. Processo de Build e Empacotamento de Releases

### Pré-requisitos do Ambiente
- **Node.js:** v14.21.3 ou superior (recomendado v18+ / v20+).
- **Rust Toolchain:** `stable-x86_64-pc-windows-msvc`.
- **Ferramentas de Empacotamento Windows:**
  - WiX Toolchain v3.11 (para geração dos instaladores `.msi`).
  - NSIS (para geração do instalador executável `.exe`).

### Passo a Passo para Gerar a Release Final

#### 1. Encerrar Processos Antigos Bloqueados no Windows (MANDATÓRIO)
No Windows, se o binário `nexus.exe` estiver rodando em segundo plano, o compilador falhará por permissão negada (`EPERM`). Execute no PowerShell:
```powershell
Stop-Process -Name "nexus" -Force -ErrorAction SilentlyContinue
```

#### 2. Compilação do Frontend (Webpack)
```bash
npm run build
```
Esse comando compila o código React/TypeScript em arquivos estáticos minificados na pasta `dist/renderer`.

#### 3. Build de Release Oficial do Tauri
```bash
npx @tauri-apps/cli build
```
> ⚠️ **IMPORTANTE:** Nunca execute apenas `cargo build --release` no diretório `src-tauri` sem o CLI do Tauri! O CLI injeta as variáveis de ambiente necessárias para embutir os arquivos frontend (`dist/renderer`) dentro do executável compilado `.exe`. Sem isso, o app compilará apontando para `http://localhost:3000` e exibirá o erro "Hum... Não consigo chegar a esta página".

### Localização dos Artefatos Gerados
Após a conclusão do build, os artefatos de distribuição estarão disponíveis em:
- **Executável Portátil / Standalone:** `src-tauri/target/release/nexus.exe`
- **Instalador MSI:** `src-tauri/target/release/bundle/msi/Nexus_1.4.0_x64_en-US.msi`
- **Instalador Setup EXE:** `src-tauri/target/release/bundle/nsis/Nexus_1.4.0_x64-setup.exe`

---

## 🏷️ 4. Versionamento e Lançamento de Próximas Versões

Ao lançar uma nova versão da aplicação (exemplo: atualizar da `v1.4.0` para a `v1.5.0`), você deve atualizar obrigatoriamente a versão nos 3 arquivos de configuração do projeto:

1. **`package.json`**:
   ```json
   "version": "1.5.0"
   ```
2. **`src-tauri/tauri.conf.json`**:
   ```json
   "version": "1.5.0"
   ```
3. **`src-tauri/Cargo.toml`**:
   ```toml
   [package]
   version = "1.5.0"
   ```

---

## ⚡ 5. Detalhes Técnicos Minuciosos da Migração Electron → Tauri v2

### 🔐 A. Deep Links & Autenticação OAuth (Google & Discord)
- **Desafio:** No executável release, a autenticação via Google/Discord redirecionava o callback para a URL customizada (`nexus://` ou `krigzis://`), mas o aplicativo abria uma nova janela em branco com erro de conexão.
- **Causa Raiz:** O executável Rust no Tauri v2 precisava registrar nativamente o protocolo do esquema no Registro do Windows durante a inicialização do app.
- **Solução Implementada (`src-tauri/src/lib.rs`):**
  ```rust
  .setup(|app| {
      #[cfg(desktop)]
      {
          let _ = app.deep_link().register_all();
      }
      Ok(())
  })
  ```
  Além disso, o plugin `tauri_plugin_single_instance` foi reposicionado como o primeiro plugin no construtor do Tauri para garantir que a segunda instância intercepte o callback OAuth e passe os parâmetros para a janela já aberta, fechando o processo duplicado imediatamente.

---

### 🎥 B. Reprodução de Mídia (Vídeos e PDFs) no WebView2 do Windows
- **Desafio:** O protocolo de ativos do Tauri (`convertFileSrc` / `asset.localhost`) não responde adequadamente a requisições de intervalo de bytes HTTP 206 Partial Content (Range Requests) feitas pelo player de vídeo HTML5 no WebView2 (Windows), fazendo com que o vídeo travasse em `0:00`.
- **Solução Arquitetural Implementada:**
  1. Criado o comando Rust `read_file_bytes` em `src-tauri/src/commands/download.rs` que lê os bytes do arquivo em disco e retorna um vetor de bytes (`Vec<u8>`).
  2. No componente React ([NoteViewerModal.tsx](file:///c:/Users/paulo.ricardo/Documents/nexus/src/renderer/components/NoteViewerModal.tsx)), baixamos os bytes para o cache local via Rust e os convertemos em um `Blob` URL:
     ```typescript
     const fileBytes = await invoke<number[]>('read_file_bytes', { path: localPath });
     const byteArray = new Uint8Array(fileBytes);
     const pdfBlob = new Blob([byteArray], { type: 'video/mp4' });
     const blobUrl = URL.createObjectURL(pdfBlob);
     ```
  3. `Blob` URLs possuem 100% de suporte a busca (seeking), avanço rápido e alteração de volume no Chromium WebView2.

---

### 📂 C. Migração Nativa de Drag and Drop de Arquivos
- **Desafio:** No Electron, a API HTML5 `File.path` retornava o caminho absoluto do arquivo no disco. No WebView2 do Tauri v2, `File.path` retorna `undefined` por restrições de sandbox do navegador.
- **Solução Implementada ([tauriDragDrop.ts](file:///c:/Users/paulo.ricardo/Documents/nexus/src/renderer/lib/tauriDragDrop.ts)):**
  1. Interceptamos o evento nativo de arrastar arquivos da janela do Tauri:
     ```typescript
     const { getCurrentWindow } = await import('@tauri-apps/api/window');
     getCurrentWindow().onDragDropEvent((event) => {
       if (event.payload.type === 'drop') {
         const paths = event.payload.paths;
         window.dispatchEvent(new CustomEvent('tauriNativeFileDrop', { detail: { paths } }));
       }
     });
     ```
  2. No [Settings.tsx](file:///c:/Users/paulo.ricardo/Documents/nexus/src/renderer/components/Settings.tsx) e no [ImportExportModal.tsx](file:///c:/Users/paulo.ricardo/Documents/nexus/src/renderer/components/ImportExportModal.tsx), escutamos o evento `tauriNativeFileDrop` para abrir instantaneamente o modal de importação quando o usuário solta qualquer arquivo (.zip, .pdf, .json, .csv) na janela.

---

### 🎬 D. Modal de Visualização de Vídeos (Lightbox, Player do Sistema e Downloads)
Em [NoteViewerModal.tsx](file:///c:/Users/paulo.ricardo/Documents/nexus/src/renderer/components/NoteViewerModal.tsx), equipamos os vídeos com os seguintes recursos:
- **Expandir (Lightbox):** Modal em tela cheia (`85vw x 80vh`) com backdrop blur, atalho para fechar via tecla `Esc`, suporte a clique fora do vídeo para fechar e botão "Fechar" posicionado com `zIndex: 100001` fixo no canto superior direito.
- **Abrir no Player Padrão:** Invocação do comando Rust `open_file_externally` (`cmd /C start "" "C:\caminho\video.mp4"` no Windows), abrindo o arquivo no VLC ou player associado do sistema operacional.
- **Baixar:** Salva o arquivo no computador com notificação visual Toast (`showToast('Download do vídeo iniciado!', 'success')`).

---

### 🧹 E. Gerenciamento de Cache Local & Política Cloud-First
- **Comando Rust `clear_video_cache` (`src-tauri/src/commands/download.rs`):**
  Apaga todos os arquivos temporários salvos na pasta `app_data_dir()/nexus-videos`.
- **Limpeza Automática:**
  - **Ao fechar o modal da nota:** Revoga os `Blob` URLs da memória RAM (`URL.revokeObjectURL`) e invoca `clear_video_cache` no Rust.
  - **Ao realizar Logout:** Esvazia completamente a pasta de mídia do disco local.

---

### 🛡️ F. Isolamento Multiusuário e Conformidade LGPD
- **Desafio:** Ao trocar de conta (logout de uma conta e login em outra), dados de notas, categorias, tarefas e configurações locais vazavam entre usuários.
- **Solução Implementada:**
  1. **Purga Completa no Logout (`purgeAllUserDataAndStorage` em `AuthContext.tsx`):**
     Ao deslogar ou detectar mudança de `user.id`, executa:
     - `localStorage.clear()`
     - `sessionStorage.clear()`
     - `clear_video_cache` (Rust)
     - Disparo do evento `nexus:auth-logout`.
  2. **Escopo Dinâmico por ID de Usuário:**
     - `getActiveOrgKey(userId)` -> `nexus-active-org-id:${userId}`
     - `getSettingsKey(userId)` -> `nexus-user-settings:${userId}`
     - `getSettingsUpdatedKey(userId)` -> `nexus-settings-updated-at:${userId}`
  3. **Reset nos React Contexts:**
     Adicionado `useEffect` em `NotesContext.tsx`, `OrganizationContext.tsx`, `TasksContext.tsx`, `CategoriesContext.tsx` e `SystemTagsContext.tsx` zerando todos os arrays em memória React imediatamente quando `user?.id` muda ou se torna nulo.

---

## 🧪 6. Comandos de Validação e Testes Locais

```bash
# 1. Verificação de Tipos TypeScript (deve retornar 0 erros)
npx tsc --noEmit

# 2. Verificação de Compilação do Backend Rust
cd src-tauri && cargo check && cd ..

# 3. Execução da Suíte de Testes Unitários
npx jest --env=node

# 4. Execução em Modo de Desenvolvimento (Tauri + Webpack Dev Server)
npm run dev

# 5. Geração de Compilação de Produção
npx @tauri-apps/cli build
```

---
*Documentação gerada e validada em 10/08/2026 para o projeto Nexus v1.4.0.*
