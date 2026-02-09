# Settings Refactor — Crash Reports Removal, i18n, Modularization

This plan removes Crash Reports end-to-end, then completes Settings i18n, and finally modularizes the Settings UI into per-tab components without regressions.

## Scope / Order

1. Crash Reports: remove feature completely (renderer UI + preload API + main IPC + crash reporter manager).
2. i18n in Settings: replace remaining hardcoded strings with `t()` and add missing keys.
3. Restore Settings tabs: ensure Productivity and Notifications tabs render all expected settings again.
4. Settings modal: keep default size and add an “invisible” scrollbar aligned with the app layout.
5. Modularization: split `Settings.tsx` by tabs/components while preserving current save/cancel + preview behavior.

## 1) Crash Reports — Removal Plan (a3)

### Findings (current references)

- `src/main/logging/crash-reporter.ts` implements `CrashReporterManager` and uses Electron `crashReporter` + global error handlers.
- `src/main/index.ts` imports/initializes `crashReporterManager` and exposes `ipcMain.handle('logging:getCrashReports', ...)`.
- `src/main/preload.ts` exposes `electronAPI.logging.getCrashReports`.
- `src/renderer/components/CrashReportViewer.tsx` is a full UI for browsing/exporting crash reports.
- `src/renderer/components/LogViewer.tsx` still mentions “crash reports” in copy.

### Implementation steps

- Remove crash reporter initialization
  - Remove `crashReporterManager` import from `src/main/index.ts`.
  - Remove `crashReporterManager.initialize()` call.
- Remove crash reports IPC surface
  - Remove `ipcMain.handle('logging:getCrashReports', ...)` from `src/main/index.ts`.
  - Remove `getCrashReports` from the `ElectronAPI` typing and the `electronAPI.logging` object in `src/main/preload.ts`.
- Remove crash reporter implementation
  - Delete `src/main/logging/crash-reporter.ts` (and any exports/imports pointing to it).
  - Ensure no remaining references to Electron `crashReporter` exist.
- Remove renderer UI
  - Delete `src/renderer/components/CrashReportViewer.tsx`.
  - Remove any imports/exports/usage sites (if any remain) and any menu items/buttons.
- Clean up copy and dead paths
  - Update `LogViewer.tsx` copy to remove “crash reports” mention.
  - Grep for `crash`, `getCrashReports`, `CrashReportViewer`, `crashReporterManager`, `crashReporter` and remove any remaining dead code.

### Acceptance criteria

- No Crash Reports UI anywhere.
- No Crash Reports IPC channels.
- No Electron crash reporter usage.
- `npm run lint` and `npm run build` succeed.

## 2) Settings i18n Cleanup (a6)

### Implementation steps

- Grep `src/renderer/components/Settings.tsx` and related components for hardcoded user-facing strings.
- Replace with `t('...')` keys.
- Add missing keys to `src/renderer/hooks/useI18n.ts` (pt-BR + other locales already supported).
- Re-run `npm run lint` and fix any ESLint/TS warnings introduced.

### Acceptance criteria

- No hardcoded visible strings remain in Settings UI (except values/data).
- Missing keys resolved, no runtime `t()` fallbacks.

## 3) Restore Productivity + Notifications tabs (a10)

### Findings (current)

- `Settings.tsx` defines `tabs` entries for `produtividade` and `notificacoes`, but there are no `activeTab === 'produtividade'` / `activeTab === 'notificacoes'` render blocks, so these tabs show no content.
- `useSettings.tsx` already has settings for productivity insights (`showProductivityTips`, `showProgressInsights`) and AI workflow (`aiResponseMode`, `aiProactiveMode`).
- `Dashboard.tsx` renders “Insights de Produtividade” gated by `settings.showProductivityTips || settings.showProgressInsights`.
- Notifications currently exist as a web-only hook (`useNotifications.ts`) using the browser `Notification` API.

### User requirements (this iteration)

- Productivity tab should expose IA-related settings and productivity insight toggles.
- Notifications must be native on Windows (system-themed), with optional sound.
- Notification categories must be configurable in Settings:
  - task reminders
  - “tarefas do dia”
  - overdue/late tasks
  - productivity insights

### Implementation steps

- Add tab content blocks in `src/renderer/components/Settings.tsx`:
- `activeTab === 'produtividade'`:
  - Add controls for productivity insights used by Dashboard:
    - Toggle `showProductivityTips`.
    - Toggle `showProgressInsights`.
  - Add controls for AI workflow:
    - Select `aiResponseMode` (`detailed` | `balanced` | `concise`).
    - Toggle `aiProactiveMode`.
- `activeTab === 'notificacoes'`:
  - Toggle `showNotifications`.
  - Toggle `playSound`.
  - Per-category toggles:
    - `notifyTaskReminders`
    - `notifyTodayTasks`
    - `notifyOverdueTasks`
    - `notifyProductivityInsights`
  - Add “Testar notificação” action.
- Ensure all of the above write into `draftSettings` and only persist on Save.
- Ensure labels use `t()` (or add keys in `useI18n.ts`) where appropriate.

- Add/update settings model in `useSettings.tsx`:
  - Add the new boolean fields listed above with sensible defaults.

- Implement native Windows notifications:
  - Add a main-process IPC handler to show a notification using Electron `new Notification(...)`.
  - Expose a preload API method (e.g. `notifications.showNative(...)`) for renderer to request native notifications.
  - Update `useNotifications.ts`:
    - Prefer the preload native method when available.
    - Keep browser Notification as fallback.

- Implement default sound:
  - If `playSound` is enabled, play a short built-in sound from the renderer when triggering notifications.
  - Keep sound implementation simple (one default sound) and avoid adding user-selectable sound packs in this iteration.

### Notes / Design decisions

- Productivity tab is not for “Dashboard UI”; it is for toggles that control what the Dashboard shows.
- Notifications should be native on Windows (system-themed). Plan is to prefer Electron native notifications and keep a browser Notification fallback for non-Electron contexts.
- Trigger points:
  - Task completion notifications already exist (App `handleMoveTask` uses `showTaskComplete`). This will be gated by `showNotifications` and relevant per-category toggles.
  - Timer completion notifications exist in `useTimer.ts` and will be gated similarly.
  - For “tarefas do dia” and “overdue tasks”, add a periodic/background check in the renderer (using existing tasks/stats state) and only notify when transitioning into a state (avoid spam).

### Acceptance criteria

- Productivity tab shows the previously existing items (no blank tab).
- Notifications tab shows the previously existing items (no blank tab).
- Save/Cancel works: Cancel reverts and closes; Save persists.
- Toggling productivity insight settings immediately affects Dashboard visibility on next render.

## 4) Settings modal sizing + invisible scrollbar (a11)

### Requirements (from user)

- Modal should keep the current default size (as per screenshot) and not grow/shrink unexpectedly.
- Main content area should scroll when needed, using a scrollbar that is visually minimal and only shows a subtle thumb on scroll/hover.

### Implementation steps

- Stabilize modal sizing in `Settings.tsx`:
  - Keep current `maxWidth` and `maxHeight`, and avoid layout shifts by ensuring internal sections scroll rather than expanding.
- Apply a reusable scrollbar style:
  - Add a shared CSS utility/class (in renderer global styles) for a subtle scrollbar:
    - Default: transparent thumb/track.
    - On `:hover` / `:focus-within`: show a small thumb with low opacity.
    - Keep layout stable (avoid adding/removing scrollbar gutter width).
  - Apply to the modal content container (currently `overflowY: 'auto'`) and any internal scroll panes.

### Acceptance criteria

- Modal matches the intended default size.
- Scroll works with mouse wheel/trackpad.
- Scrollbar appears subtly on hover/scroll and does not cause layout shifts.

## 5) Modularize Settings (a9)

### Design constraints

- Preserve current behavior:
  - `draftSettings` editing.
  - Save/Cancel semantics and rollback.
  - Live appearance preview (DOM updates) must continue to reflect draft.
- Avoid changing styling/markup more than necessary.

### Implementation steps

- Extract tab bodies to `src/renderer/components/settings-tabs/*` (one component per tab) with clear props:
  - `draftSettings`, `updateDraft`, `settingsSnapshot`, `onSave`, `onCancel`, plus any per-tab handlers.
- Keep orchestration in `Settings.tsx`:
  - Tab selection, header/footer, save/cancel wiring, update event subscriptions.
- Ensure imports stay stable and no circular deps.
- Validate with `npm run lint` and `npm run build`.

### Acceptance criteria

- `Settings.tsx` size reduced substantially (tabs extracted).
- No regressions in save/cancel, preview, updates panel, logs viewer.

## Validation / Quality Gate

- `npm run lint`
- `npm run build`

## ESLint note (blocking quality gate)

- The current repo ESLint config originally extended `@typescript-eslint/recommended`, but ESLint expects the `plugin:` prefix.
- Fix is to use:
  - `plugin:@typescript-eslint/recommended`
- The `recommended-requiring-type-checking` config requires `parserOptions.project` and tends to surface hundreds of legacy issues; keep it disabled until the codebase is ready.

### Remaining lint errors to clear (current snapshot)

- `src/main/index.ts`
  - `@typescript-eslint/no-var-requires` due to `require('fs')` and `require('electron')` usage.
  - Plan: convert those to top-level imports (`import * as fs from 'fs'`, import `nativeImage` from `electron`) or isolate in helper with proper typing.
- `src/main/preload.ts`
  - `@typescript-eslint/ban-ts-comment` for `// @ts-ignore`.
  - Plan: switch to `// @ts-expect-error` (or fix typing so comment is unnecessary).
- `src/renderer/components/NoteEditor.tsx`
  - `prefer-const` for `html`.
  - `no-useless-escape` for regex like `^\-`.
- `src/renderer/components/NoteViewerModal.tsx`
  - `no-useless-escape` in regex.
- `src/renderer/components/TaskModal.tsx`
  - `prefer-const` for `finalCategoryId`.

## Decisions (confirmed)

1. Delete existing persisted crash report files under `%APPDATA%/Krigzis/*` (best-effort) as part of removal.
2. Remove all Crash Reports global handlers (e.g. `uncaughtException`, `unhandledRejection`, `render-process-gone`, `child-process-gone`) along with the feature.
3. Remove any menu entries/shortcuts related to Crash Reports silently (if present).
