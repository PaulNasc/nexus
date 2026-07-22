## Changelog

### v1.3.4
- Ping: Sistema de Ping direcionado de notas com seletor sutil de múltiplos usuários e busca rápida.
- Cooldowns: Controle de frequência com 2min de espera para o mesmo usuário/nota e liberação instantânea para outros destinatários.
- Notifications: Notificações nativas do Windows com ícone oficial do Nexus e redirecionamento de clique (Desktop e Toast) direto para a nota.
- Parameters: Parâmetros `showDesktopNotifications` e `showToastNotifications` ativados por padrão nas configurações (`DEFAULT_SETTINGS`).
- Supabase: Resolução de erro HTTP 400 em `profiles` removendo referência à coluna inexistente `name_updated_at`.
- Performance: Otimização do Webpack dev server (`transpileOnly` e `filesystem cache`) e solução do loop de reabertura involuntária da nota pingada.

### v1.3.1
- Search: Busca por número puro (`1`, `#1`, `42`) agora retorna apenas a nota com o `sequential_id` exato, eliminando falsos positivos em notas cujo conteúdo contém o dígito.
- Loading: Indicador de carregamento agora é exibido corretamente ao abrir o programa e ao trocar de organização, enquanto as notas ainda estão sendo carregadas do Supabase.
- Context: `isOrgChanged` agora é corretamente propagado via `computedIsLoading` no `NotesContext`, garantindo que a tela de carregamento persista até a fetch da nova org completar.
- Performance: Remoção de verificação redundante de `orgLoading` no `App.tsx` — já encapsulada dentro de `notesLoading`.
- Bugfix: Removidos componentes legados (`CategoryManager`, `LogViewer`, `ConfirmDeleteNoteModal`, `BackupPanel`) e código comentado sem serventia.
- Images: URLs `via.placeholder.com` agora são interceptadas e substituídas por SVG inline, eliminando o erro de rede no console.
- PDF: Indicador de carregamento exibido durante download do arquivo do R2 e renderização do iframe.
- UI: Transição suave entre abas com animação `screenFadeInSlide`; aba ativa com indicador teal animado.

### v1.1.8
- Updater (Portable): Improved relaunch reliability after update by switching to Electron relaunch flow.
- Updater (Portable): Expanded shortcut retargeting to Desktop, Start Menu, and pinned shortcuts.
- Release: GitHub publish configuration now forces non-draft releases.

### v1.1.7
- Notes: Header actions/filters aligned with the bottom separator line for cleaner visual consistency.
- Organizations: Reduced redundant realtime refresh calls and improved async feedback handling in organization actions.
- Storage: Added one-time migration from legacy `krigzis-*` keys to `nexus-*` keys and removed legacy fallback reads.

### v1.1.2
- Notes: Video attachments now follow backups and can be relinked on another machine if missing.
- Backup: Include nexus-videos in export/import to keep video notes playable across devices.

### v1.1.1
- Release: Version bump to trigger update for installs already on 1.1.0.
- UI: App header can be collapsed and restored with a small toggle button.
- Notes: Click to preview, edit via pencil icon on hover, tags smaller with list layout aligned.
- Settings: App header visibility and dashboard gating applied to linked items.
- Update: Portable and installer update flows remain supported via GitHub Releases.

### v1.0.2
- UI: App header can be collapsed and restored with a small toggle button.
- Notes: Click to preview, edit via pencil icon on hover, tags smaller with list layout aligned.
- Settings: App header visibility and dashboard gating applied to linked items.
- Update: Portable and installer update flows remain supported via GitHub Releases.

### v1.0.1
- Fix: UI version now matches app.getVersion() across screens.
- Build: Windows installer generated via electron-winstaller.
- Update: Auto-update checks using GitHub Releases (latest).

### v1.0.0
- Fix: UI version alignment with app.getVersion() across all screens.
- Publish: Manual release with Windows binaries and installer.