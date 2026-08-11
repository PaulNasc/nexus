import { desktopAdapter } from './desktopAdapter';
import type { RestorePreview, ImportResult } from '../../shared/types/backup';

export type ImportIntent =
  | { kind: 'zip'; filePath: string }
  | { kind: 'zip-backup'; backupId: string }
  | { kind: 'json'; filePath: string }
  | { kind: 'csv'; filePath: string }
  | { kind: 'enex'; filePath: string }
  | { kind: 'html-file'; filePath: string }
  | { kind: 'pdf-file'; filePath: string }
  | { kind: 'pdf-files'; filePaths: string[] }
  | { kind: 'txt-file'; filePath: string }
  | { kind: 'md-file'; filePath: string }
  | { kind: 'mp4-file'; filePath: string }
  | { kind: 'folder'; folderPath: string }
  | { kind: 'unsupported'; filePath?: string; reason: string };

const getBasename = (path: string): string => {
  const normalized = path.replace(/\\/g, '/');
  const filename = normalized.substring(normalized.lastIndexOf('/') + 1);
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex > 0) return filename.substring(0, dotIndex);
  return filename;
};

const capitalizeTitle = (raw: string): string => {
  const cleaned = raw.replace(/[-_]/g, ' ').trim();
  if (!cleaned) return 'Nota Importada';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const readTextFromFilePath = async (filePath: string): Promise<string> => {
  if (desktopAdapter.isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke<number[]>('read_file_bytes', { path: filePath });
      const byteArray = new Uint8Array(bytes);
      return new TextDecoder('utf-8').decode(byteArray);
    } catch (err) {
      console.warn('Tauri read_file_bytes failed:', err);
    }
  }
  return '';
};

export const generateTauriOrWebPreview = async (intent: ImportIntent): Promise<RestorePreview> => {
  if (!intent || intent.kind === 'unsupported') {
    return { tasks: 0, notes: 0, categories: 0, settings: false, conflicts: [], warnings: ['Arquivo não suportado'] };
  }

  if (intent.kind === 'json') {
    try {
      const content = await readTextFromFilePath(intent.filePath);
      if (content) {
        const parsed = JSON.parse(content);
        const notesCount = Array.isArray(parsed.notes) ? parsed.notes.length : (Array.isArray(parsed) ? parsed.length : 0);
        const tasksCount = Array.isArray(parsed.tasks) ? parsed.tasks.length : 0;
        const catCount = Array.isArray(parsed.categories) ? parsed.categories.length : 0;
        return { tasks: tasksCount, notes: notesCount, categories: catCount, settings: false, conflicts: [], warnings: [] };
      }
    } catch {
      // Fallback
    }
    return { tasks: 0, notes: 1, categories: 0, settings: false, conflicts: [], warnings: [] };
  }

  if (intent.kind === 'csv') {
    try {
      const content = await readTextFromFilePath(intent.filePath);
      if (content) {
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        const count = Math.max(1, lines.length - 1);
        return { tasks: 0, notes: count, categories: 0, settings: false, conflicts: [], warnings: [] };
      }
    } catch {
      // Fallback
    }
    return { tasks: 0, notes: 1, categories: 0, settings: false, conflicts: [], warnings: [] };
  }

  if (intent.kind === 'pdf-files') {
    return { tasks: 0, notes: intent.filePaths.length, categories: 0, settings: false, conflicts: [], warnings: [] };
  }

  // Single file formats: txt, md, html, pdf, mp4, enex, zip
  return { tasks: 0, notes: 1, categories: 0, settings: false, conflicts: [], warnings: [] };
};

export const applyTauriOrWebImport = async (
  intent: ImportIntent,
  options?: { color?: string; systemTagId?: number; systemTagName?: string }
): Promise<ImportResult> => {
  const importedNotes: NonNullable<ImportResult['importedNotes']> = [];
  const importedTasks: NonNullable<ImportResult['importedTasks']> = [];

  const defaultColor = options?.color || 'teal';
  const systemTagId = options?.systemTagId;
  const systemTagName = options?.systemTagName;

  if (!intent || intent.kind === 'unsupported') {
    return {
      success: false,
      imported: { tasks: 0, notes: 0, categories: 0 },
      warnings: [],
      errors: [{ type: 'note', message: 'Formato de arquivo não suportado' }],
    };
  }

  if (intent.kind === 'json') {
    try {
      const text = await readTextFromFilePath(intent.filePath);
      if (text) {
        const data = JSON.parse(text);
        const notesArr = Array.isArray(data.notes) ? data.notes : (Array.isArray(data) ? data : []);
        const tasksArr = Array.isArray(data.tasks) ? data.tasks : [];

        for (const item of notesArr) {
          importedNotes.push({
            title: capitalizeTitle(item.title || 'Nota Sem Título'),
            content: item.content || '',
            format: item.format || 'markdown',
            tags: Array.isArray(item.tags) ? item.tags : [],
            attachedImages: item.attachedImages || item.attached_images || [],
            attachedVideos: item.attachedVideos || item.attached_videos || [],
            color: item.color || defaultColor,
            systemTagId: systemTagId ?? item.systemTagId,
            systemTagName: systemTagName ?? item.systemTagName,
          });
        }

        for (const item of tasksArr) {
          importedTasks.push({
            title: item.title || 'Tarefa Sem Título',
            description: item.description || '',
            status: item.status || 'backlog',
            priority: item.priority || 'media',
          });
        }
      }
    } catch (err) {
      console.warn('Tauri JSON import error:', err);
    }
  } else if (intent.kind === 'pdf-files') {
    for (const path of intent.filePaths) {
      const title = capitalizeTitle(getBasename(path));
      importedNotes.push({
        title,
        content: `[PDF_SOURCE]${path}[/PDF_SOURCE]`,
        format: 'markdown',
        tags: ['pdf-importado'],
        color: defaultColor,
        systemTagId,
        systemTagName,
      });
    }
  } else if (intent.kind === 'pdf-file') {
    const title = capitalizeTitle(getBasename(intent.filePath));
    importedNotes.push({
      title,
      content: `[PDF_SOURCE]${intent.filePath}[/PDF_SOURCE]`,
      format: 'markdown',
      tags: ['pdf-importado'],
      color: defaultColor,
      systemTagId,
      systemTagName,
    });
  } else if (intent.kind === 'mp4-file') {
    const title = capitalizeTitle(getBasename(intent.filePath));
    importedNotes.push({
      title,
      content: `[VIDEO_SOURCE]${intent.filePath}[/VIDEO_SOURCE]`,
      format: 'markdown',
      tags: ['video-importado'],
      color: defaultColor,
      systemTagId,
      systemTagName,
    });
  } else if (['txt-file', 'md-file', 'html-file', 'enex', 'csv'].includes(intent.kind)) {
    const filePath = (intent as { filePath: string }).filePath;
    const title = capitalizeTitle(getBasename(filePath));
    let content = await readTextFromFilePath(filePath);
    if (!content) content = `Conteúdo importado do arquivo ${getBasename(filePath)}`;

    importedNotes.push({
      title,
      content,
      format: intent.kind === 'html-file' ? 'text' : 'markdown',
      tags: [intent.kind.replace('-file', '')],
      color: defaultColor,
      systemTagId,
      systemTagName,
    });
  }

  return {
    success: true,
    imported: {
      tasks: importedTasks.length,
      notes: importedNotes.length,
      categories: 0,
    },
    importedNotes,
    importedTasks,
    warnings: [],
    errors: [],
  };
};
