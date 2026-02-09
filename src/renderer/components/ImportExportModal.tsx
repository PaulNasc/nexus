import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Download, Upload } from 'lucide-react';
import type { ImportResult, RestorePreview } from '../../shared/types/backup';
import type { ElectronAPI, ImportSourceSelectionResult } from '../../main/preload';

type ExportFormat = 'zip' | 'json' | 'csv';

type ImportIntent = {
  kind: 'zip';
  filePath: string;
} | {
  kind: 'zip-backup';
  backupId: string;
} | {
  kind: 'json';
  filePath: string;
} | {
  kind: 'csv';
  filePath: string;
} | {
  kind: 'enex';
  filePath: string;
} | {
  kind: 'html-file';
  filePath: string;
} | {
  kind: 'pdf-file';
  filePath: string;
} | {
  kind: 'folder';
  folderPath: string;
} | {
  kind: 'unsupported';
  reason: string;
};

export interface ImportExportModalProps {
  mode: 'import' | 'export';
  open: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  onImportPreview: (intent: ImportIntent) => Promise<RestorePreview | null>;
  onImportApply: (intent: ImportIntent) => Promise<ImportResult | null>;
  initialImportIntent?: ImportIntent | null;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  mode,
  open,
  onClose,
  onExport,
  onImportPreview,
  onImportApply,
  initialImportIntent,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('zip');
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [intent, setIntent] = useState<ImportIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const applyInFlightRef = useRef(false);

  const title = useMemo(() => {
    return mode === 'import' ? 'Importar' : 'Exportar';
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    if (mode !== 'import') return;
    if (!initialImportIntent) return;

    let cancelled = false;
    const run = async () => {
      setIsBusy(true);
      setError(null);
      setResult(null);
      setPreview(null);
      setIntent(initialImportIntent);
      try {
        const p = await onImportPreview(initialImportIntent);
        if (cancelled) return;
        setPreview(p);
      } finally {
        if (!cancelled) setIsBusy(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, mode, initialImportIntent, onImportPreview]);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setIntent(null);
    setError(null);
    setHasApplied(false);
    applyInFlightRef.current = false;
  };

  const close = () => {
    if (isBusy) return;
    reset();
    onClose();
  };

  const getElectron = (): ElectronAPI | null => {
    return (window as unknown as { electronAPI?: ElectronAPI }).electronAPI || null;
  };

  const detectIntentFromSelection = (selection: ImportSourceSelectionResult): ImportIntent => {
    if (selection.canceled || !selection.path || !selection.kind) {
      return { kind: 'unsupported', reason: 'Nenhum arquivo selecionado' };
    }

    if (selection.kind === 'folder') {
      return { kind: 'folder', folderPath: selection.path };
    }

    const ext = (selection.extension || '').toLowerCase();
    if (ext === '.zip' || ext === '.rar') return { kind: 'zip', filePath: selection.path };
    if (ext === '.json') return { kind: 'json', filePath: selection.path };
    if (ext === '.csv') return { kind: 'csv', filePath: selection.path };
    if (ext === '.enex') return { kind: 'enex', filePath: selection.path };
    if (ext === '.html' || ext === '.htm') return { kind: 'html-file', filePath: selection.path };
    if (ext === '.pdf') return { kind: 'pdf-file', filePath: selection.path };

    return { kind: 'unsupported', reason: 'Formato ainda não suportado neste MVP' };
  };

  const handleSelectImportFile = async () => {
    try {
      setError(null);
      setResult(null);
      setPreview(null);
      setHasApplied(false);
      applyInFlightRef.current = false;

      const electron = getElectron();
      if (!electron?.system?.selectImportFile) {
        setError('Seleção de arquivo indisponível');
        return;
      }

      const selection = await electron.system.selectImportFile({
        title: 'Selecionar arquivo para importação',
        buttonLabel: 'Selecionar',
      });

      if (selection.canceled || !selection.path) {
        return;
      }

      setIsBusy(true);
      try {
        const nextIntent = detectIntentFromSelection(selection);
        setIntent(nextIntent);

        if (nextIntent.kind === 'unsupported') {
          setError(nextIntent.reason);
          return;
        }

        const p = await onImportPreview(nextIntent);
        if (!p) {
          if (nextIntent.kind === 'html-file' || nextIntent.kind === 'pdf-file') {
            setError('Importação deste formato ainda não foi implementada');
          } else {
            setError('Erro ao gerar preview do import');
          }
          return;
        }
        setPreview(p);
      } finally {
        setIsBusy(false);
      }
    } catch (e) {
      console.error('Erro ao selecionar arquivo:', e);
      setError(e instanceof Error ? e.message : 'Erro ao selecionar arquivo');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isBusy) return;

    setError(null);
    setResult(null);
    setPreview(null);
    setHasApplied(false);
    applyInFlightRef.current = false;

    try {
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) {
        setError('Nenhum arquivo foi arrastado');
        return;
      }

      const file = files[0];
      const filePath = file.path;
      
      if (!filePath) {
        setError('Não foi possível obter o caminho do arquivo');
        return;
      }

      // Detect file type from extension
      const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
      
      let nextIntent: ImportIntent;
      
      if (ext === '.zip' || ext === '.rar') {
        nextIntent = { kind: 'zip', filePath };
      } else if (ext === '.json') {
        nextIntent = { kind: 'json', filePath };
      } else if (ext === '.csv') {
        nextIntent = { kind: 'csv', filePath };
      } else if (ext === '.enex') {
        nextIntent = { kind: 'enex', filePath };
      } else if (ext === '.html' || ext === '.htm') {
        nextIntent = { kind: 'html-file', filePath };
      } else if (ext === '.pdf') {
        nextIntent = { kind: 'pdf-file', filePath };
      } else {
        setError(`Formato de arquivo não suportado: ${ext}`);
        return;
      }

      setIsBusy(true);
      setIntent(nextIntent);

      const p = await onImportPreview(nextIntent);
      if (!p) {
        setError('Erro ao gerar preview do import');
        return;
      }
      setPreview(p);
    } catch (err) {
      console.error('Erro ao processar arquivo arrastado:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo arrastado');
    } finally {
      setIsBusy(false);
    }
  };

  const handleApply = async () => {
    if (!intent || intent.kind === 'unsupported') return;
    if (applyInFlightRef.current) return;
    if (hasApplied) return;
    applyInFlightRef.current = true;
    setIsBusy(true);
    try {
      const r = await onImportApply(intent);
      setResult(r);
      if (r?.success) {
        setHasApplied(true);
      }
    } catch (err) {
      console.error('Erro ao aplicar import:', err);
      setError(err instanceof Error ? err.message : 'Erro ao aplicar importação');
    } finally {
      setIsBusy(false);
      applyInFlightRef.current = false;
    }
  };

  const handleExport = async () => {
    setIsBusy(true);
    try {
      await onExport(exportFormat);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      setError('Erro ao exportar');
    } finally {
      setIsBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '720px', width: '92%' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-btn" onClick={close} aria-label="Fechar">×</button>
        </div>

        {mode === 'export' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Formato</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                disabled={isBusy}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                }}
              >
                <option value="zip">ZIP</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-error)' }}>
                <span style={{ fontSize: '13px' }}>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="ghost" onClick={close} disabled={isBusy}>Cancelar</Button>
              <Button variant="primary" onClick={handleExport} disabled={isBusy} leftIcon={<Download size={16} />}>
                Exportar
              </Button>
            </div>
          </div>
        )}

        {mode === 'import' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '1px dashed var(--color-border-primary)',
                borderRadius: '12px',
                padding: '18px',
                backgroundColor: 'var(--color-bg-secondary)',
                display: 'grid',
                gap: '10px',
              }}
            >
              <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '14px' }}>
                Arraste um arquivo aqui
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Selecione um arquivo para importar.
              </div>
              <div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={handleSelectImportFile} disabled={isBusy} leftIcon={<Upload size={16} />}>
                    Selecionar arquivo...
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-error)' }}>
                <span style={{ fontSize: '13px' }}>{error}</span>
              </div>
            )}

            {preview && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  {preview.tasks} tarefas • {preview.notes} notas • {preview.categories} categorias
                </div>

                {preview.warnings?.length > 0 && (
                  <div style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: '8px', padding: '12px', color: 'var(--warning-color)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Avisos</div>
                    <div style={{ display: 'grid', gap: '4px' }}>
                      {preview.warnings.map((w, i) => (
                        <div key={i}>{w}</div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.conflicts?.length > 0 && (
                  <div style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: '8px', padding: '12px', color: 'var(--info-color)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Conflitos (IDs)</div>
                    <div style={{ display: 'grid', gap: '4px', maxHeight: '140px', overflow: 'auto' }}>
                      {preview.conflicts.map((c, i) => (
                        <div key={i}>{c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div style={{ backgroundColor: result.success ? 'var(--success-bg)' : 'var(--error-bg)', border: `1px solid ${result.success ? 'var(--success-border)' : 'var(--error-border)'}`, borderRadius: '8px', padding: '12px', color: result.success ? 'var(--success-color)' : 'var(--error-color)' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Resultado</div>
                <div>
                  Importados: {result.imported.tasks} tarefas • {result.imported.notes} notas
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="ghost" onClick={close} disabled={isBusy}>Cancelar</Button>
              <Button variant="primary" onClick={handleApply} disabled={isBusy || !preview || hasApplied} leftIcon={<Upload size={16} />}>
                Aplicar (Mesclar)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
