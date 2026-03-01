## Changelog

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