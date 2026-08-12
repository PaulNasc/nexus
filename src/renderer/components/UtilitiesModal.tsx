import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderOpen,
  X,
  FolderPlus,
  Upload,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Folder,
  Check,
  Pencil,
  Trash2,
  FileText,
  Download,
} from 'lucide-react';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteUtilityObjectFromR2,
  downloadUtilityBlobFromR2Signed,
  listUtilityObjectsFromR2,
  moveUtilityObjectInR2,
  uploadUtilityBlobToR2Signed,
} from '../lib/r2Utilities';

export interface UtilityItem {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

export interface UtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type UtilityConfirmState =
  | { type: 'delete-file'; objectKey: string; filename: string }
  | { type: 'delete-folder'; folderPath: string; folderName: string }
  | { type: 'download-file'; objectKey: string; filename: string }
  | null;

export const UtilitiesModal: React.FC<UtilitiesModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { activeOrg } = useOrganization();
  const { user } = useAuth();

  const rootPrefix = useMemo(() => {
    if (activeOrg?.id) return `org/${activeOrg.id}/utilities/`;
    if (user?.id) return `user/${user.id}/utilities/`;
    return '';
  }, [activeOrg?.id, user?.id]);

  const [utilityObjects, setUtilityObjects] = useState<UtilityItem[]>([]);
  const [utilityLoading, setUtilityLoading] = useState(false);
  const [utilitySearch, setUtilitySearch] = useState('');
  const [currentUtilityPath, setCurrentUtilityPath] = useState('');
  const [uploadingUtility, setUploadingUtility] = useState(false);
  const [uploadingUtilityName, setUploadingUtilityName] = useState<string | null>(null);
  const [utilityActionMessage, setUtilityActionMessage] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderPath, setEditingFolderPath] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [draggingUtilityObjectKey, setDraggingUtilityObjectKey] = useState<string | null>(null);
  const [utilityConfirmState, setUtilityConfirmState] = useState<UtilityConfirmState>(null);
  const [utilityConfirmLoading, setUtilityConfirmLoading] = useState(false);

  const fetchUtilityObjects = useCallback(async () => {
    if (!rootPrefix) return;
    setUtilityLoading(true);
    try {
      const items = await listUtilityObjectsFromR2(rootPrefix, 500);
      const rawFiles = items
        .filter((item) => item.objectKey.startsWith(rootPrefix))
        .map((item) => {
          const relativeKey = item.objectKey.slice(rootPrefix.length);
          return {
            key: relativeKey,
            name: relativeKey.split('/').pop() || relativeKey,
            size: item.size,
            lastModified: item.lastModified || '',
          };
        });
      setUtilityObjects(rawFiles);
    } catch (err) {
      console.error('Falha ao carregar utilitários do R2:', err);
      showToast('Erro ao carregar arquivos do R2 Cloud', 'error');
    } finally {
      setUtilityLoading(false);
    }
  }, [rootPrefix, showToast]);

  useEffect(() => {
    if (isOpen && rootPrefix) {
      void fetchUtilityObjects();
    }
  }, [isOpen, rootPrefix, fetchUtilityObjects]);

  const utilityPathSegments = useMemo(() => {
    return currentUtilityPath.split('/').filter(Boolean);
  }, [currentUtilityPath]);

  const utilityItems = useMemo(() => {
    const prefix = currentUtilityPath ? `${currentUtilityPath}/` : '';
    const foldersMap = new Map<string, { name: string; path: string }>();
    const filesList: Array<{ name: string; objectKey: string; size: number }> = [];

    utilityObjects.forEach((obj) => {
      if (prefix && !obj.key.startsWith(prefix)) return;
      const relative = prefix ? obj.key.slice(prefix.length) : obj.key;
      if (!relative) return;

      const slashIndex = relative.indexOf('/');
      if (slashIndex !== -1) {
        const folderName = relative.slice(0, slashIndex);
        const folderPath = prefix ? `${currentUtilityPath}/${folderName}` : folderName;
        if (!foldersMap.has(folderName)) {
          foldersMap.set(folderName, { name: folderName, path: folderPath });
        }
      } else {
        if (relative === '.keep') return;
        filesList.push({ name: relative, objectKey: obj.key, size: obj.size });
      }
    });

    const searchLower = utilitySearch.trim().toLowerCase();
    const filteredFolders = Array.from(foldersMap.values()).filter((f) =>
      !searchLower ? true : f.name.toLowerCase().includes(searchLower)
    );
    const filteredFiles = filesList.filter((f) =>
      !searchLower ? true : f.name.toLowerCase().includes(searchLower)
    );

    return { folders: filteredFolders, files: filteredFiles };
  }, [utilityObjects, currentUtilityPath, utilitySearch]);

  const handleUtilityUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !rootPrefix) return;
    setUploadingUtility(true);
    const subpath = currentUtilityPath ? `${currentUtilityPath}/` : '';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadingUtilityName(file.name);
        const fullObjectKey = `${rootPrefix}${subpath}${file.name}`;
        await uploadUtilityBlobToR2Signed(fullObjectKey, file, file.type || 'application/octet-stream');
      }
      showToast('Arquivo(s) enviado(s) com sucesso!', 'success');
      await fetchUtilityObjects();
    } catch (err) {
      console.error('Erro no upload de utilitários:', err);
      showToast('Erro ao realizar upload do arquivo', 'error');
    } finally {
      setUploadingUtility(false);
      setUploadingUtilityName(null);
      event.target.value = '';
    }
  };

  const handleCreateFolder = async () => {
    const cleanName = newFolderName.trim().replace(/[/\\?%*:|"<>]/g, '');
    if (!cleanName || !rootPrefix) return;
    setUtilityActionMessage(`Criando pasta "${cleanName}"...`);
    const folderPath = currentUtilityPath ? `${currentUtilityPath}/${cleanName}` : cleanName;
    const keepKey = `${rootPrefix}${folderPath}/.keep`;

    try {
      await uploadUtilityBlobToR2Signed(keepKey, new Blob([''], { type: 'text/plain' }), 'text/plain');
      showToast(`Pasta "${cleanName}" criada`, 'success');
      setIsCreatingFolder(false);
      setNewFolderName('');
      await fetchUtilityObjects();
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
      showToast('Erro ao criar pasta no R2', 'error');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleMoveUtilityObject = async (sourceKey: string, targetFolderPath: string) => {
    if (!rootPrefix) return;
    const filename = sourceKey.split('/').pop() || sourceKey;
    const destinationSubpath = targetFolderPath ? `${targetFolderPath}/${filename}` : filename;
    const fullSourceKey = `${rootPrefix}${sourceKey}`;
    const fullDestKey = `${rootPrefix}${destinationSubpath}`;

    if (fullSourceKey === fullDestKey) return;
    setUtilityActionMessage(`Movendo ${filename}...`);

    try {
      await moveUtilityObjectInR2(fullSourceKey, fullDestKey);
      showToast(`Movido para ${targetFolderPath || 'raiz'}`, 'success');
      await fetchUtilityObjects();
    } catch (err) {
      console.error('Erro ao mover arquivo:', err);
      showToast('Erro ao mover arquivo no R2', 'error');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityDownloadFile = async (objectKey: string, filename: string) => {
    if (!rootPrefix) return;
    setUtilityActionMessage(`Baixando ${filename}...`);
    const fullObjectKey = `${rootPrefix}${objectKey}`;
    try {
      const blob = await downloadUtilityBlobFromR2Signed(fullObjectKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download concluído', 'success');
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
      showToast('Erro ao baixar arquivo', 'error');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityDeleteFile = async (objectKey: string) => {
    if (!rootPrefix) return;
    setUtilityActionMessage('Excluindo arquivo...');
    const fullObjectKey = `${rootPrefix}${objectKey}`;
    try {
      await deleteUtilityObjectFromR2(fullObjectKey);
      showToast('Arquivo excluído', 'success');
      await fetchUtilityObjects();
    } catch (err) {
      console.error('Erro ao excluir arquivo:', err);
      showToast('Erro ao excluir arquivo', 'error');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityDeleteFolder = async (folderPath: string) => {
    if (!rootPrefix) return;
    setUtilityActionMessage(`Excluindo pasta ${folderPath}...`);
    const subpathPrefix = `${folderPath}/`;
    try {
      const objectsInFolder = utilityObjects.filter((o) => o.key.startsWith(subpathPrefix));
      for (const obj of objectsInFolder) {
        await deleteUtilityObjectFromR2(`${rootPrefix}${obj.key}`);
      }
      showToast('Pasta excluída com sucesso', 'success');
      await fetchUtilityObjects();
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
      showToast('Erro ao excluir pasta', 'error');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityRenameFolder = async (folderPath: string) => {
    const newNameClean = editingFolderName.trim().replace(/[/\\?%*:|"<>]/g, '');
    if (!newNameClean || !rootPrefix) return;

    const oldParentPath = folderPath.includes('/') ? folderPath.slice(0, folderPath.lastIndexOf('/')) : '';
    const newFolderPath = oldParentPath ? `${oldParentPath}/${newNameClean}` : newNameClean;

    if (folderPath === newFolderPath) {
      setEditingFolderPath(null);
      setEditingFolderName('');
      return;
    }

    setUtilityActionMessage(`Renomeando pasta para "${newNameClean}"...`);
    const subpathPrefix = `${folderPath}/`;

    try {
      const objectsInFolder = utilityObjects.filter((o) => o.key.startsWith(subpathPrefix));
      for (const obj of objectsInFolder) {
        const subRelative = obj.key.slice(subpathPrefix.length);
        const oldFullKey = `${rootPrefix}${obj.key}`;
        const newFullKey = `${rootPrefix}${newFolderPath}/${subRelative}`;
        await moveUtilityObjectInR2(oldFullKey, newFullKey);
      }
      showToast('Pasta renomeada com sucesso', 'success');
      setEditingFolderPath(null);
      setEditingFolderName('');
      await fetchUtilityObjects();
    } catch (err) {
      console.error('Erro ao renomear pasta:', err);
      showToast('Erro ao renomear pasta', 'error');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityConfirm = async () => {
    if (!utilityConfirmState) return;
    setUtilityConfirmLoading(true);
    try {
      if (utilityConfirmState.type === 'delete-file') {
        await handleUtilityDeleteFile(utilityConfirmState.objectKey);
      } else if (utilityConfirmState.type === 'delete-folder') {
        await handleUtilityDeleteFolder(utilityConfirmState.folderPath);
      } else if (utilityConfirmState.type === 'download-file') {
        await handleUtilityDownloadFile(utilityConfirmState.objectKey, utilityConfirmState.filename);
      }
    } finally {
      setUtilityConfirmLoading(false);
      setUtilityConfirmState(null);
    }
  };

  const getUtilityConfirmContent = () => {
    if (!utilityConfirmState) return null;
    if (utilityConfirmState.type === 'delete-file') {
      return {
        title: 'Excluir Arquivo',
        description: `Tem certeza de que deseja excluir o arquivo "${utilityConfirmState.filename}"? Esta ação não pode ser desfeita.`,
        confirmLabel: 'Excluir',
        confirmVariant: 'danger' as const,
      };
    }
    if (utilityConfirmState.type === 'delete-folder') {
      return {
        title: 'Excluir Pasta',
        description: `Deseja excluir a pasta "${utilityConfirmState.folderName}" e todo o seu conteúdo do R2 Cloud?`,
        confirmLabel: 'Excluir pasta',
        confirmVariant: 'danger' as const,
      };
    }
    if (utilityConfirmState.type === 'download-file') {
      return {
        title: 'Baixar Arquivo',
        description: `Confirmar o download de "${utilityConfirmState.filename}"?`,
        confirmLabel: 'Baixar',
        confirmVariant: 'primary' as const,
      };
    }
    return null;
  };

  if (!isOpen) return null;

  const isUtilityBusy = uploadingUtility || !!utilityActionMessage;
  const isLight = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'light' || document.body.classList.contains('theme-light'));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          backgroundColor: isLight ? '#ffffff' : '#121214',
          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: isLight ? '0 20px 25px -5px rgba(0, 0, 0, 0.15)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isLight ? '#f1f5f9' : '#16161a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={20} style={{ color: '#14b8a6' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: isLight ? '#0f172a' : '#f3f4f6', margin: 0 }}>
              Utilitários (R2 Cloud)
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isLight ? '#64748b' : '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Breadcrumbs */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: isLight ? '#e2e8f0' : '#141417',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <input
              type="text"
              placeholder="Buscar arquivo..."
              value={utilitySearch}
              onChange={(e) => setUtilitySearch(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                background: isLight ? '#ffffff' : '#1e1e24',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: isLight ? '#0f172a' : '#e5e7eb',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreatingFolder(true)}
                disabled={isUtilityBusy}
                title="Nova Pasta"
              >
                <FolderPlus size={16} />
              </Button>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  background: '#14b8a6',
                  color: '#ffffff',
                  cursor: isUtilityBusy ? 'not-allowed' : 'pointer',
                  opacity: isUtilityBusy ? 0.6 : 1,
                }}
              >
                <Upload size={15} /> Upload
                <input
                  type="file"
                  multiple
                  onChange={handleUtilityUpload}
                  disabled={isUtilityBusy}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Path Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isLight ? '#64748b' : '#9ca3af', overflowX: 'auto' }}>
            <button
              onClick={() => setCurrentUtilityPath('')}
              style={{
                background: currentUtilityPath === '' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)'}`,
                color: currentUtilityPath === '' ? '#14b8a6' : isLight ? '#475569' : '#9ca3af',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              raiz
            </button>
            {utilityPathSegments.map((seg, idx) => {
              const segPath = utilityPathSegments.slice(0, idx + 1).join('/');
              const isLast = idx === utilityPathSegments.length - 1;
              return (
                <React.Fragment key={segPath}>
                  <ChevronRight size={12} style={{ color: isLight ? '#94a3b8' : '#4b5563' }} />
                  <button
                    onClick={() => setCurrentUtilityPath(segPath)}
                    style={{
                      background: isLast ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: isLast ? '#14b8a6' : isLight ? '#475569' : '#9ca3af',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {seg}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', position: 'relative' }}>
          {utilityLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: isLight ? '#64748b' : '#9ca3af' }}>
              <Loader2 size={24} className="spin" />
              <span>Carregando arquivos do R2 Cloud...</span>
            </div>
          ) : utilityItems.folders.length === 0 && utilityItems.files.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: isLight ? '#94a3b8' : '#6b7280' }}>
              <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Nenhum arquivo encontrado.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Parent Back Link */}
              {currentUtilityPath && (
                <div
                  onClick={() => {
                    const parts = currentUtilityPath.split('/');
                    parts.pop();
                    setCurrentUtilityPath(parts.join('/'));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    color: isLight ? '#475569' : '#9ca3af',
                    fontSize: '13px',
                  }}
                >
                  <ArrowLeft size={16} /> Voltar para pasta anterior
                </div>
              )}

              {/* Folders */}
              {utilityItems.folders.map((folder) => {
                const isEditing = editingFolderPath === folder.path;
                return (
                  <div
                    key={folder.path}
                    onClick={() => !isEditing && setCurrentUtilityPath(folder.path)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingUtilityObjectKey) {
                        void handleMoveUtilityObject(draggingUtilityObjectKey, folder.path);
                        setDraggingUtilityObjectKey(null);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isLight ? '#f8fafc' : '#1a1a20',
                      border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}`,
                      cursor: isEditing ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <Folder size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              fontSize: '13px',
                              background: isLight ? '#ffffff' : '#121214',
                              border: '1px solid #14b8a6',
                              borderRadius: '4px',
                              color: isLight ? '#0f172a' : '#fff',
                              outline: 'none',
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleUtilityRenameFolder(folder.path)}
                            style={{ padding: '4px', background: 'rgba(20,184,166,0.2)', border: 'none', borderRadius: '4px', color: '#14b8a6', cursor: 'pointer' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingFolderPath(null)}
                            style={{ padding: '4px', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', fontWeight: 500, color: isLight ? '#0f172a' : '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {folder.name}
                        </span>
                      )}
                    </div>

                    {!isEditing && (
                      <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingFolderPath(folder.path);
                            setEditingFolderName(folder.name);
                          }}
                          style={{ padding: '6px', background: 'transparent', border: 'none', color: isLight ? '#475569' : '#9ca3af', cursor: 'pointer' }}
                          title="Renomear"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setUtilityConfirmState({
                              type: 'delete-folder',
                              folderPath: folder.path,
                              folderName: folder.name,
                            })
                          }
                          style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          title="Excluir Pasta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Files */}
              {utilityItems.files.map((file) => (
                <div
                  key={file.objectKey}
                  draggable
                  onDragStart={() => setDraggingUtilityObjectKey(file.objectKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isLight ? '#ffffff' : '#16161c',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.04)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <FileText size={18} style={{ color: '#14b8a6', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: isLight ? '#0f172a' : '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: '11px', color: isLight ? '#64748b' : '#6b7280' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() =>
                        setUtilityConfirmState({
                          type: 'download-file',
                          objectKey: file.objectKey,
                          filename: file.name,
                        })
                      }
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                      title="Baixar"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setUtilityConfirmState({
                          type: 'delete-file',
                          objectKey: file.objectKey,
                          filename: file.name,
                        })
                      }
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Nova Pasta */}
        {isCreatingFolder && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div style={{ width: '100%', maxWidth: '360px', background: '#1e1e24', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#fff' }}>Nova Pasta</h3>
              <input
                type="text"
                placeholder="Nome da pasta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{ width: '100%', padding: '8px', fontSize: '13px', background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', outline: 'none', marginBottom: '12px' }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={() => setIsCreatingFolder(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handleCreateFolder}>Criar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {utilityConfirmState && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div style={{ width: '100%', maxWidth: '380px', background: '#1e1e24', borderRadius: '10px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#fff' }}>{getUtilityConfirmContent()?.title}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                {getUtilityConfirmContent()?.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={() => setUtilityConfirmState(null)} disabled={utilityConfirmLoading}>
                  Cancelar
                </Button>
                <Button
                  variant={getUtilityConfirmContent()?.confirmVariant}
                  size="sm"
                  onClick={handleUtilityConfirm}
                  disabled={utilityConfirmLoading}
                >
                  {utilityConfirmLoading ? <Loader2 size={14} className="spin" /> : getUtilityConfirmContent()?.confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
