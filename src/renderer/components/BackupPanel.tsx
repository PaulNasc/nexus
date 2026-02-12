import React, { useState } from 'react';
import { Button } from './ui/Button';
import { ImportExportModal } from './ImportExportModal';
import { 
  Download, 
  Upload, 
  AlertCircle,
  Database
} from 'lucide-react';

import { useTasks } from '../contexts/TasksContext';
import { useNotes } from '../contexts/NotesContext';
import { useStorageMode } from '../hooks/useStorageMode';
import type { ImportResult, RestorePreview } from '../../shared/types/backup';
import type { ElectronAPI } from '../../main/preload';

type ImportExportModalProps = React.ComponentProps<typeof ImportExportModal>;
type ImportIntent = Parameters<ImportExportModalProps['onImportPreview']>[0];
type ExportFormat = Parameters<ImportExportModalProps['onExport']>[0];

const getElectron = (): ElectronAPI => {
  return (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
};

const BackupPanel: React.FC = () => {
  const { createTask } = useTasks();
  const { createNote, fetchNotes } = useNotes();
  const { useCloud } = useStorageMode();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');
  const [initialImportIntent, setInitialImportIntent] = useState<ImportIntent | null>(null);

  const handleImportExport = (mode: 'import' | 'export') => {
    setError(null);
    setImportExportMode(mode);
    setInitialImportIntent(null);
    setImportExportModalOpen(true);
  };

  const handleImportExportPreview = async (intent: ImportIntent): Promise<RestorePreview | null> => {
    try {
      const electron = getElectron();
      if (intent?.kind === 'zip') {
        return await electron.backup.importZipPreview({ source: 'external', filePath: intent.filePath });
      }
      if (intent?.kind === 'zip-backup') {
        return await electron.backup.importZipPreview({ source: 'backupId', backupId: intent.backupId });
      }
      if (intent?.kind === 'json') {
        return await electron.backup.importJsonPreview({ filePath: intent.filePath });
      }
      if (intent?.kind === 'csv') {
        return await electron.backup.importCsvPreview({ filePath: intent.filePath });
      }
      if (intent?.kind === 'enex') {
        return await electron.backup.importEnexPreview({ filePath: intent.filePath });
      }
      if (intent?.kind === 'html-file') {
        return await electron.invoke('import:html-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'pdf-file') {
        return await electron.invoke('import:pdf-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'txt-file') {
        return await electron.invoke('import:txt-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'md-file') {
        return await electron.invoke('import:md-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'mp4-file') {
        return await electron.invoke('import:mp4-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'folder') {
        return await electron.invoke('import:folder-preview', { folderPath: intent.folderPath }) as RestorePreview;
      }
      return null;
    } catch (err) {
      console.error('Erro ao gerar preview do import:', err);
      setError('Erro ao gerar preview do import');
      return null;
    }
  };

  const handleImportExportApply = async (intent: ImportIntent, options?: { color?: string }): Promise<ImportResult | null> => {
    try {
      const electron = getElectron();
      let result: ImportResult | null = null;
      if (intent?.kind === 'zip') {
        result = await electron.backup.importZipApply({ source: 'external', filePath: intent.filePath });
      } else if (intent?.kind === 'zip-backup') {
        result = await electron.backup.importZipApply({ source: 'backupId', backupId: intent.backupId });
      } else if (intent?.kind === 'json') {
        result = await electron.backup.importJsonApply({ filePath: intent.filePath });
      } else if (intent?.kind === 'csv') {
        result = await electron.backup.importCsvApply({ filePath: intent.filePath });
      } else if (intent?.kind === 'enex') {
        result = await electron.backup.importEnexApply({ filePath: intent.filePath });
      } else if (intent?.kind === 'html-file') {
        result = await electron.invoke('import:html-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'pdf-file') {
        result = await electron.invoke('import:pdf-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'txt-file') {
        result = await electron.invoke('import:txt-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'md-file') {
        result = await electron.invoke('import:md-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'mp4-file') {
        result = await electron.invoke('import:mp4-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'folder') {
        result = await electron.invoke('import:folder-apply', { folderPath: intent.folderPath }) as ImportResult;
      }

      // Capitalize first letter of all imported note titles
      if (result?.importedNotes) {
        result.importedNotes = result.importedNotes.map(n => ({
          ...n,
          title: n.title ? n.title.charAt(0).toUpperCase() + n.title.slice(1) : n.title,
        }));
      }

      if (result?.success) {
        // Sync imported data to cloud when storage mode uses cloud
        // IPC import already wrote to local MemoryDB, so only cloud sync is needed
        if (useCloud) {
          if (result.importedNotes && result.importedNotes.length > 0) {
            for (const note of result.importedNotes) {
              try {
                await createNote({
                  title: note.title,
                  content: note.content,
                  format: note.format || 'text',
                  tags: note.tags,
                  attachedImages: note.attachedImages,
                  attachedVideos: note.attachedVideos,
                  linkedTaskIds: note.linkedTaskIds,
                  color: options?.color || note.color,
                });
              } catch (e) {
                console.error('Failed to sync imported note to cloud:', e);
              }
            }
            await fetchNotes();
          }

          if (result.importedTasks && result.importedTasks.length > 0) {
            for (const task of result.importedTasks) {
              try {
                await createTask({
                  title: task.title,
                  description: task.description,
                  status: (task.status as 'backlog' | 'esta_semana' | 'hoje' | 'concluido') || 'backlog',
                  priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
                });
              } catch (e) {
                console.error('Failed to sync imported task to cloud:', e);
              }
            }
          }
        }

        window.dispatchEvent(new Event('tasksUpdated'));
        window.dispatchEvent(new Event('categoriesUpdated'));
        window.dispatchEvent(new Event('notesUpdated'));

        // Always refresh notes from store after import (local or cloud)
        await fetchNotes();
      }

      return result;
    } catch (err) {
      console.error('Erro ao aplicar import:', err);
      setError('Erro ao aplicar importação');
      return null;
    }
  };

  const handleImportExportExport = async (format: ExportFormat) => {
    try {
      setIsLoading(true);
      setError(null);

      const electron = getElectron();

      if (format === 'zip') {
        const res = await electron.backup.exportZip({ source: 'current' });
        if (res?.success) alert('ZIP exportado com sucesso!');
        return;
      }
      if (format === 'json') {
        const res = await electron.backup.exportJson();
        if (res?.success) alert('JSON exportado com sucesso!');
        return;
      }
      if (format === 'csv') {
        const res = await electron.backup.exportCsv();
        if (res?.success) alert('CSV exportado com sucesso!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sectionStyle = {
    background: 'var(--gradient-card)',
    border: '1px solid var(--color-border-primary)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  };

  return (
    <div style={{ padding: '24px' }}>
      {error && (
        <div style={{
          backgroundColor: 'var(--error-bg)',
          border: '1px solid var(--error-border)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--error-color)'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Info: Dados armazenados no Supabase */}
      <div style={{
        ...sectionStyle,
        borderColor: 'rgba(0, 212, 170, 0.3)',
        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05), rgba(123, 63, 242, 0.05))'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <Database size={20} style={{ color: '#00D4AA' }} />
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}>
            Armazenamento em Nuvem
          </h3>
        </div>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: '1.6'
        }}>
          Seus dados (tarefas, notas, categorias e configurações) são armazenados automaticamente no Supabase.
          Não é necessário criar backups manuais — seus dados estão sincronizados com a nuvem.
        </p>
      </div>

      {/* Seção: Importar/Exportar */}
      <div style={sectionStyle}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Upload size={20} />
          Importar / Exportar
        </h3>

        <p style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          lineHeight: '1.5'
        }}>
          Importe dados de arquivos externos (ZIP, JSON, CSV, ENEX, HTML, PDF) ou exporte seus dados atuais.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            onClick={() => handleImportExport('import')}
            leftIcon={<Upload size={16} />}
            disabled={isLoading}
          >
            Importar
          </Button>
          <Button
            onClick={() => handleImportExport('export')}
            variant="secondary"
            leftIcon={<Download size={16} />}
            disabled={isLoading}
          >
            Exportar
          </Button>
        </div>
      </div>

      <ImportExportModal
        mode={importExportMode}
        open={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        onExport={handleImportExportExport}
        onImportPreview={handleImportExportPreview}
        onImportApply={handleImportExportApply}
        initialImportIntent={initialImportIntent}
      />
    </div>
  );
};

export default BackupPanel;
