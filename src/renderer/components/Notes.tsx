import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNotes, SortOption } from '../contexts/NotesContext';
import { useSettings } from '../hooks/useSettings';
import { useSystemTags } from '../contexts/SystemTagsContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../hooks/useI18n';
import {
  deleteUtilityObjectFromR2,
  downloadUtilityBlobFromR2Signed,
  listUtilityObjectsFromR2,
  moveUtilityObjectInR2,
  uploadUtilityBlobToR2Signed,
} from '../lib/r2Utilities';

import { Note, CreateNoteData } from '../../shared/types/note';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { NoteEditor } from './NoteEditor';
import { LinkedTasksModal } from './LinkedTasksModal';
import { StickyNote, Search, Grid3X3, List, Plus, Pin, Trash2, Link, Pencil, CheckSquare, Square, Filter, X, ArrowUpDown, Users, FolderOpen, FileText, Upload, Download, FolderPlus, Folder, ArrowLeft, ChevronRight, Check, Loader2, ArrowUp } from 'lucide-react';

import { NoteViewerModal } from './NoteViewerModal';

export interface NotesProps {
  initialNoteId?: number;
}

export const Notes: React.FC<NotesProps> = ({ initialNoteId }) => {
  const {
    notes,
    totalNotesCount,
    isLoading,
    error,
    fetchNotes,
    deleteNote,
    createNote,
    updateNote,
    hasMore,
    isFetchingMore,
    loadMoreNotes,
    searchTerm,
    setSearchTerm,
    filterColor,
    setFilterColor,
    filterPinned,
    setFilterPinned,
    filterTags,
    setFilterTags,
    filterSystemTagIds,
    setFilterSystemTagIds,
    sortBy,
    setSortBy,
    useCloud,
  } = useNotes();
  const { settings, getGreeting } = useSettings();
  const { tags: systemTags } = useSystemTags();
  const { activeOrg } = useOrganization();
  const { user } = useAuth();
  const { t } = useI18n();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const notesContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }

    // Infinite scroll pagination
    const { scrollTop, scrollHeight, clientHeight } = target;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (hasMore && !isFetchingMore) {
        loadMoreNotes();
      }
    }
  }, [hasMore, isFetchingMore, loadMoreNotes]);

  const handleScrollToTop = () => {
    if (notesContainerRef.current) {
      notesContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const [linkedTasksModal, setLinkedTasksModal] = useState<{
    isOpen: boolean;
    noteId: number;
    noteTitle: string;
    linkedTaskIds: number[];
  }>({
    isOpen: false,
    noteId: 0,
    noteTitle: '',
    linkedTaskIds: [],
  });

  const [viewer, setViewer] = useState<{ isOpen: boolean; note: Note | null }>({ isOpen: false, note: null });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  // Utilities panel state
  const [showUtilitiesPanel, setShowUtilitiesPanel] = useState(false);
  const [utilitySearch, setUtilitySearch] = useState('');
  const [utilityFiles, setUtilityFiles] = useState<Array<{ name: string; size: number; created_at: string; objectKey: string; isPlaceholder: boolean }>>([]);
  const [utilityLoading, setUtilityLoading] = useState(false);
  const [uploadingUtility, setUploadingUtility] = useState(false);
  const [uploadingUtilityName, setUploadingUtilityName] = useState('');
  const [utilityActionMessage, setUtilityActionMessage] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [currentUtilityPath, setCurrentUtilityPath] = useState('');
  const [draggingUtilityObjectKey, setDraggingUtilityObjectKey] = useState<string | null>(null);
  const [editingFolderPath, setEditingFolderPath] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [utilityConfirmLoading, setUtilityConfirmLoading] = useState(false);
  const [utilityConfirmState, setUtilityConfirmState] = useState<
    | { type: 'download-file'; objectKey: string; filename: string }
    | { type: 'delete-file'; objectKey: string; filename: string }
    | { type: 'delete-folder'; folderPath: string; folderName: string }
    | null
  >(null);

  const [showSortMenu, setShowSortMenu] = useState(false);

  const activeSystemTags = useMemo(
    () => systemTags.filter((tag) => tag.is_active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [systemTags],
  );

  const systemTagById = useMemo(() => {
    return new Map(activeSystemTags.map((tag) => [tag.id, tag]));
  }, [activeSystemTags]);

  const systemTagByName = useMemo(() => {
    return new Map(activeSystemTags.map((tag) => [tag.name.toLowerCase(), tag]));
  }, [activeSystemTags]);

  const resolveEffectiveNoteColor = useCallback((note: Note): string | undefined => {
    if (note.system_tag_id !== undefined) {
      const byIdColor = systemTagById.get(note.system_tag_id)?.color;
      if (byIdColor) return byIdColor;
    }

    if (note.tags && note.tags.length > 0) {
      const noteTagNames = new Set(note.tags.map((tag) => tag.toLowerCase()));
      const matchingSystemTag = activeSystemTags.find((tag) => noteTagNames.has(tag.name.toLowerCase()));
      if (matchingSystemTag?.color) return matchingSystemTag.color;
    }

    if (note.color) return note.color;
    return undefined;
  }, [systemTagById, activeSystemTags]);

  const organizationColorOptions = useMemo(() => {
    const byColor = new Map<string, { value: string; label: string }>();
    for (const note of notes) {
      const color = (resolveEffectiveNoteColor(note) || '').trim();
      if (!color) continue;

      const key = color.toLowerCase();
      if (byColor.has(key)) continue;

      const sourceTag = activeSystemTags.find((tag) => (tag.color || '').trim().toLowerCase() === key);
      byColor.set(key, { value: color, label: sourceTag?.name || color });
    }

    return Array.from(byColor.values());
  }, [notes, resolveEffectiveNoteColor, activeSystemTags]);

  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const note = notes.find((n) => n.id === initialNoteId);
      if (note) {
        setViewer({ isOpen: true, note });
      }
    }
  }, [initialNoteId, notes]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = () => setShowSortMenu(false);
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [showSortMenu]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map((n) => n.id)));
    }
  };

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await deleteNote(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, deleteNote]);

  const handleNoteClick = useCallback((note: Note) => {
    setViewer({ isOpen: true, note });
  }, []);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setIsEditing(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditing(false);
    setSelectedNote(null);
  }, []);

  const handleSaveNote = useCallback(async (noteData: CreateNoteData) => {
    try {
      if (selectedNote) {
        await updateNote(selectedNote.id, noteData);
      } else {
        await createNote(noteData);
      }
      handleCloseEditor();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }, [selectedNote, createNote, updateNote, handleCloseEditor]);

  const showLinkedTasks = useCallback((note: Note) => {
    setLinkedTasksModal({
      isOpen: true,
      noteId: note.id,
      noteTitle: note.title,
      linkedTaskIds: note.linkedTaskIds || [],
    });
  }, []);

  const closeLinkedTasksModal = useCallback(() => {
    setLinkedTasksModal({
      isOpen: false,
      noteId: 0,
      noteTitle: '',
      linkedTaskIds: [],
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  const getColorClass = useCallback((color?: string) => {
    switch (color) {
      case 'teal': return 'var(--color-accent-teal)';
      case 'blue': return 'var(--color-accent-blue)';
      case 'green': return 'var(--color-accent-emerald)';
      case 'yellow': return 'var(--color-accent-amber)';
      case 'red': return 'var(--color-accent-rose)';
      case 'purple': return 'var(--color-accent-purple)';
      case 'violet': return 'var(--color-accent-violet)';
      case 'orange': return 'var(--color-accent-orange)';
      case 'pink': return 'var(--color-accent-rose)';
      case 'cyan': return '#06B6D4';
      case 'lime': return '#84CC16';
      case 'turquoise': return '#14B8A6';
      case 'lavender': return '#A78BFA';
      case 'gold': return '#FBBF24';
      default: return 'var(--color-text-muted)';
    }
  }, []);

  const truncateContent = useCallback((content?: string | null, maxLength: number = 100) => {
    const safeContent = typeof content === 'string' ? content : '';
    if (safeContent.length <= maxLength) return safeContent;
    return safeContent.slice(0, maxLength) + '...';
  }, []);

  const getNotePreviewContent = useCallback((note: Note): string => {
    const raw = typeof note.content === 'string' ? note.content : '';
    const trimmed = raw.trim();

    if (!trimmed) return '';

    // Legacy imported PDF payloads can start with encoded [PDF_SOURCE] data.
    // Show a clean, readable preview instead of encoded URLs/metadata.
    if (trimmed.startsWith('[PDF_SOURCE]')) {
      return 'Documento PDF importado. Abra a nota para ver os detalhes.';
    }

    return trimmed;
  }, []);

  const filteredNotes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    // Pure numeric query: digits only or prefixed with # (e.g. "1", "#1", "42")
    const isPureNumeric = /^[#]?\d+$/.test(term);
    const numVal = isPureNumeric ? parseInt(term.replace('#', ''), 10) : null;

    let result = notes.filter((note) => {
      if (!term) return true;

      if (isPureNumeric && numVal !== null) {
        // When the user types a plain number, match ONLY by sequential_id.
        // This prevents notes whose titles or content happen to contain that
        // digit from showing up (e.g. searching "1" should NOT match note #211).
        return note.sequential_id === numVal;
      }

      // Full-text fallback for non-numeric queries
      if (note.title.toLowerCase().includes(term)) return true;
      if (note.content.toLowerCase().includes(term)) return true;
      if (note.tags && note.tags.some((tag) => tag.toLowerCase().includes(term))) return true;
      if (note.sequential_id != null) {
        const idStr = String(note.sequential_id);
        if (idStr === term || `#${idStr}` === term) return true;
      }
      if (note.creator_display_name && note.creator_display_name.toLowerCase().includes(term)) return true;
      const dateStr = new Date(note.updated_at).toLocaleDateString('pt-BR');
      if (dateStr.includes(term)) return true;
      return false;
    });

    if (filterColor) {
      const selectedColor = filterColor.toLowerCase();
      result = result.filter((note) => {
        const effectiveColor = resolveEffectiveNoteColor(note);
        return (effectiveColor || '').toLowerCase() === selectedColor;
      });
    }

    if (filterPinned) {
      result = result.filter((n) => n.is_pinned);
    }
    if (filterTags.length > 0) {
      result = result.filter((n) =>
        Array.isArray(n.tags) && n.tags.some((tag) => filterTags.includes(tag))
      );
    }
    if (filterSystemTagIds.length > 0) {
      result = result.filter((note) => {
        const noteTagNames = new Set((note.tags || []).map((tag) => tag.toLowerCase()));
        return filterSystemTagIds.some((id) => {
          if (note.system_tag_id === id) return true;
          const systemTag = systemTagById.get(id);
          if (!systemTag) return false;
          return noteTagNames.has(systemTag.name.toLowerCase());
        });
      });
    }

    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      switch (sortBy) {
        case 'alpha_asc': return a.title.localeCompare(b.title, 'pt-BR');
        case 'alpha_desc': return b.title.localeCompare(a.title, 'pt-BR');
        case 'id_asc': return (a.sequential_id ?? 0) - (b.sequential_id ?? 0);
        case 'id_desc': return (b.sequential_id ?? 0) - (a.sequential_id ?? 0);
        case 'date_asc': return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'date_desc':
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [notes, searchTerm, filterColor, filterPinned, filterTags, filterSystemTagIds, sortBy, systemTagById, resolveEffectiveNoteColor]);

  const isFilteringActive = useMemo(() => {
    return Boolean(
      searchTerm.trim() ||
      filterColor ||
      filterPinned ||
      filterTags.length > 0 ||
      filterSystemTagIds.length > 0
    );
  }, [searchTerm, filterColor, filterPinned, filterTags, filterSystemTagIds]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          if (!systemTagByName.has(tag.toLowerCase())) {
            set.add(tag);
          }
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [notes, systemTagByName]);

  const utilityItems = useMemo(() => {
    const currentPrefix = currentUtilityPath ? `${currentUtilityPath}/` : '';
    const term = utilitySearch.toLowerCase().trim();

    const folders = new Map<string, { path: string; name: string }>();
    const files: Array<{ name: string; size: number; created_at: string; objectKey: string }> = [];

    for (const file of utilityFiles) {
      if (!file.name) continue;

      if (file.isPlaceholder) {
        const folderPath = file.name.replace(/\/\.placeholder$/, '');
        if (!folderPath || !folderPath.startsWith(currentPrefix)) continue;
        const rest = folderPath.slice(currentPrefix.length);
        if (!rest) continue;
        const [firstSegment] = rest.split('/');
        if (!firstSegment) continue;
        if (term && !firstSegment.toLowerCase().includes(term)) continue;

        const path = `${currentPrefix}${firstSegment}`;
        folders.set(path, { path, name: firstSegment });
        continue;
      }

      if (!file.name.startsWith(currentPrefix)) continue;
      const rest = file.name.slice(currentPrefix.length);
      if (!rest) continue;

      const slashIndex = rest.indexOf('/');
      if (slashIndex >= 0) {
        const folderName = rest.slice(0, slashIndex);
        if (!folderName) continue;
        if (term && !folderName.toLowerCase().includes(term)) continue;

        const path = `${currentPrefix}${folderName}`;
        folders.set(path, { path, name: folderName });
      } else {
        if (term && !rest.toLowerCase().includes(term)) continue;
        files.push({
          name: rest,
          size: file.size,
          created_at: file.created_at,
          objectKey: file.objectKey,
        });
      }
    }

    const folderItems = Array.from(folders.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const fileItems = files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { folders: folderItems, files: fileItems };
  }, [utilityFiles, utilitySearch, currentUtilityPath]);

  const utilityPathSegments = useMemo(() => {
    if (!currentUtilityPath) return [] as string[];
    return currentUtilityPath.split('/').filter(Boolean);
  }, [currentUtilityPath]);

  const isUtilityBusy = uploadingUtility || !!utilityActionMessage;

  const loadUtilityFiles = useCallback(async () => {
    if (!activeOrg) return;
    setUtilityLoading(true);
    try {
      const prefix = `org/${activeOrg.id}/utilities/`;
      const items = await listUtilityObjectsFromR2(prefix, 500);

      const files = items
        .filter((item) => item.objectKey.startsWith(prefix))
        .map((item) => ({
          name: item.objectKey.slice(prefix.length),
          size: item.size,
          created_at: item.lastModified || '',
          objectKey: item.objectKey,
          isPlaceholder: item.objectKey.endsWith('/.placeholder'),
        }))
        .filter((item) => !!item.name)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUtilityFiles(files);
    } catch (error) {
      console.error('Erro ao carregar arquivos de utilitários:', error);
    } finally {
      setUtilityLoading(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    if (showUtilitiesPanel && activeOrg) {
      loadUtilityFiles();
    }
  }, [showUtilitiesPanel, activeOrg, loadUtilityFiles]);

  const handleUtilityUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0 || !activeOrg) return;

    setUploadingUtility(true);
    setUploadingUtilityName(selectedFiles.length === 1 ? selectedFiles[0]?.name || '' : `${selectedFiles.length} arquivos`);
    setUtilityActionMessage(`Enviando 0/${selectedFiles.length} arquivos...`);
    try {
      const pathPrefix = currentUtilityPath ? `${currentUtilityPath}/` : '';
      const concurrency = 4;
      let uploadedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < selectedFiles.length; i += concurrency) {
        const chunk = selectedFiles.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async (file) => {
            try {
              const objectKey = `org/${activeOrg.id}/utilities/${pathPrefix}${file.name}`;
              await uploadUtilityBlobToR2Signed(objectKey, file, file.type || 'application/octet-stream');
              uploadedCount += 1;
              setUtilityActionMessage(`Enviando ${uploadedCount}/${selectedFiles.length} arquivos...`);
            } catch (error) {
              failedCount += 1;
              console.error('Erro ao fazer upload do arquivo:', file.name, error);
            }
          }),
        );
      }

      await loadUtilityFiles();
      if (failedCount > 0) {
        alert(`${failedCount} arquivo(s) não puderam ser enviados. Verifique se já existem com o mesmo nome.`);
      }
    } catch (error) {
      console.error('Erro ao processar upload de utilitários:', error);
      alert('Erro ao fazer upload dos arquivos.');
    } finally {
      setUploadingUtility(false);
      setUploadingUtilityName('');
      setUtilityActionMessage(null);
      event.target.value = '';
    }
  };

  const handleCreateFolder = async (folderNameParam?: string) => {
    const folderName = (folderNameParam ?? newFolderName).trim();
    if (!folderName || !activeOrg) return;

    try {
      setUtilityActionMessage('Criando pasta...');
      const pathPrefix = currentUtilityPath ? `${currentUtilityPath}/` : '';
      const objectKey = `org/${activeOrg.id}/utilities/${pathPrefix}${folderName}/.placeholder`;
      await uploadUtilityBlobToR2Signed(objectKey, new Blob([''], { type: 'text/plain' }), 'text/plain');
      await loadUtilityFiles();
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      alert('Erro ao criar pasta.');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleMoveUtilityObject = async (sourceObjectKey: string, destinationFolderPath: string) => {
    if (!activeOrg || !sourceObjectKey) return;

    const basePrefix = `org/${activeOrg.id}/utilities/`;
    if (!sourceObjectKey.startsWith(basePrefix)) return;

    const fileName = sourceObjectKey.slice(basePrefix.length).split('/').pop();
    if (!fileName) return;

    const destinationPathPrefix = destinationFolderPath ? `${destinationFolderPath}/` : '';
    const destinationObjectKey = `${basePrefix}${destinationPathPrefix}${fileName}`;
    if (destinationObjectKey === sourceObjectKey) return;

    try {
      setUtilityActionMessage('Movendo arquivo...');
      await moveUtilityObjectInR2(sourceObjectKey, destinationObjectKey);
      await loadUtilityFiles();
    } catch (error) {
      console.error('Erro ao mover arquivo:', error);
      alert('Erro ao mover arquivo.');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const executeUtilityDownload = async (objectKey: string, filename: string) => {
    try {
      const blob = await downloadUtilityBlobFromR2Signed(objectKey);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo.');
    }
  };

  const handleUtilityDelete = async (objectKey: string) => {
    if (!activeOrg) return;

    try {
      await deleteUtilityObjectFromR2(objectKey);
      await loadUtilityFiles();
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      alert('Erro ao excluir arquivo.');
    }
  };

  const handleUtilityDeleteFolder = async (folderPath: string) => {
    if (!activeOrg || !folderPath) return;

    const prefix = `org/${activeOrg.id}/utilities/${folderPath}/`;
    const objectKeys = utilityFiles
      .filter((item) => item.objectKey.startsWith(prefix))
      .map((item) => item.objectKey);

    try {
      setUtilityActionMessage(`Excluindo pasta ${folderPath.split('/').pop() || folderPath}...`);
      for (const objectKey of objectKeys) {
        await deleteUtilityObjectFromR2(objectKey);
      }

      if (currentUtilityPath === folderPath || currentUtilityPath.startsWith(`${folderPath}/`)) {
        const parentPath = folderPath.split('/').slice(0, -1).join('/');
        setCurrentUtilityPath(parentPath);
      }

      await loadUtilityFiles();
    } catch (error) {
      console.error('Erro ao excluir pasta:', error);
      alert('Erro ao excluir pasta.');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityRenameFolder = async (folderPath: string, targetFolderNameParam?: string) => {
    if (!activeOrg || !folderPath) return;

    const targetFolderName = (targetFolderNameParam ?? editingFolderName).trim();
    if (!targetFolderName || targetFolderName.includes('/') || targetFolderName.includes('\\')) {
      alert('Nome de pasta invalido.');
      return;
    }

    const pathSegments = folderPath.split('/').filter(Boolean);
    const currentFolderName = pathSegments[pathSegments.length - 1] || '';
    if (!currentFolderName) return;
    if (targetFolderName === currentFolderName) {
      setEditingFolderPath(null);
      setEditingFolderName('');
      return;
    }

    const parentPath = pathSegments.slice(0, -1).join('/');
    const destinationFolderPath = parentPath ? `${parentPath}/${targetFolderName}` : targetFolderName;
    const sourcePrefix = `org/${activeOrg.id}/utilities/${folderPath}/`;
    const destinationPrefix = `org/${activeOrg.id}/utilities/${destinationFolderPath}/`;

    const objectKeys = utilityFiles
      .filter((item) => item.objectKey.startsWith(sourcePrefix))
      .map((item) => item.objectKey);

    try {
      setUtilityActionMessage(`Renomeando pasta para ${targetFolderName}...`);
      for (const sourceObjectKey of objectKeys) {
        const suffix = sourceObjectKey.slice(sourcePrefix.length);
        const destinationObjectKey = `${destinationPrefix}${suffix}`;
        await moveUtilityObjectInR2(sourceObjectKey, destinationObjectKey);
      }

      if (currentUtilityPath === folderPath || currentUtilityPath.startsWith(`${folderPath}/`)) {
        const suffix = currentUtilityPath.slice(folderPath.length);
        setCurrentUtilityPath(`${destinationFolderPath}${suffix}`);
      }

      setEditingFolderPath(null);
      setEditingFolderName('');
      await loadUtilityFiles();
    } catch (error) {
      console.error('Erro ao renomear pasta:', error);
      alert('Erro ao renomear pasta.');
    } finally {
      setUtilityActionMessage(null);
    }
  };

  const handleUtilityConfirm = async () => {
    if (!utilityConfirmState || utilityConfirmLoading) return;

    setUtilityConfirmLoading(true);
    try {
      if (utilityConfirmState.type === 'download-file') {
        setUtilityActionMessage(`Preparando download de ${utilityConfirmState.filename}...`);
        await executeUtilityDownload(utilityConfirmState.objectKey, utilityConfirmState.filename);
      }

      if (utilityConfirmState.type === 'delete-file') {
        await handleUtilityDelete(utilityConfirmState.objectKey);
      }

      if (utilityConfirmState.type === 'delete-folder') {
        await handleUtilityDeleteFolder(utilityConfirmState.folderPath);
      }

      setUtilityConfirmState(null);
    } finally {
      setUtilityConfirmLoading(false);
      setUtilityActionMessage(null);
    }
  };

  const getUtilityConfirmContent = () => {
    if (!utilityConfirmState) return null;

    if (utilityConfirmState.type === 'download-file') {
      return {
        title: 'Confirmar download',
        description: `Deseja baixar o arquivo ${utilityConfirmState.filename}?`,
        confirmLabel: 'Baixar',
        confirmVariant: 'primary' as const,
      };
    }

    if (utilityConfirmState.type === 'delete-folder') {
      return {
        title: 'Excluir pasta',
        description: `Deseja excluir a pasta ${utilityConfirmState.folderName} e todo o seu conteudo?`,
        confirmLabel: 'Excluir',
        confirmVariant: 'danger' as const,
      };
    }

    return {
      title: 'Excluir arquivo',
      description: `Deseja excluir o arquivo ${utilityConfirmState.filename}?`,
      confirmLabel: 'Excluir',
      confirmVariant: 'danger' as const,
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const sortLabels: Record<SortOption, string> = {
    date_desc: 'Data ↓ (recente)',
    date_asc: 'Data ↑ (antigo)',
    alpha_asc: 'A → Z',
    alpha_desc: 'Z → A',
    id_asc: 'ID ↑ (crescente)',
    id_desc: 'ID ↓ (decrescente)',
  };

  const getSystemTagForNote = useCallback((note: Note) => {
    if (note.system_tag_id !== undefined) {
      const byId = systemTagById.get(note.system_tag_id);
      if (byId) return byId;
    }

    if (note.tags && note.tags.length > 0) {
      for (const noteTag of note.tags) {
        const byName = systemTagByName.get(noteTag.toLowerCase());
        if (byName) return byName;
      }
    }

    return undefined;
  }, [systemTagById, systemTagByName]);

  const getNoteAccentColor = useCallback((note: Note) => {
    const systemTag = getSystemTagForNote(note);
    if (systemTag?.color) return systemTag.color;
    return getColorClass(note.color);
  }, [getColorClass, getSystemTagForNote]);

  const greetingText = useMemo(() => {
    const greetingKey = getGreeting();
    const displayName = settings.userName?.trim() || 'Usuario';
    return t(greetingKey, { name: displayName });
  }, [getGreeting, settings.userName, t]);

  const renderTagBadges = useCallback((note: Note) => {
    if (!note.tags || note.tags.length === 0) return null;

    const visibleTags = note.tags.slice(0, 3);
    const hiddenTags = note.tags.slice(3);

    return (
      <>
        {visibleTags.map((tag) => {
          const systemTag = systemTagByName.get(tag.toLowerCase());
          const style = systemTag
            ? {
              backgroundColor: `${systemTag.color}1F`,
              borderColor: `${systemTag.color}99`,
              color: systemTag.color,
            }
            : undefined;

          return (
            <Badge key={`${note.id}-${tag}`} variant="secondary" className="tag-badge" style={style}>
              {tag}
            </Badge>
          );
        })}
        {hiddenTags.length > 0 && (
          <Badge
            variant="secondary"
            className="tag-badge"
            title={hiddenTags.join(', ')}
          >
            +{hiddenTags.length}
          </Badge>
        )}
      </>
    );
  }, [systemTagByName]);

  if (isEditing) {
    return (
      <NoteEditor
        note={selectedNote}
        onClose={handleCloseEditor}
        onSave={handleSaveNote}
      />
    );
  }

  return (
    <div className="notes-container">
      <div className="notes-header">
        <div className="notes-title-section">
          <p className="notes-greeting">{greetingText}</p>
          <div className="notes-title-group">
            <StickyNote size={28} className="notes-icon" />
            <h1 className="notes-title">Notas</h1>
            {activeOrg && (
              <span className="notes-org-tag">
                <Users size={12} /> {activeOrg.name}
              </span>
            )}
            <Badge variant="secondary" className="notes-count">
              {useCloud ? totalNotesCount : (isFilteringActive ? filteredNotes.length : totalNotesCount)}
            </Badge>
          </div>
        </div>

        {settings.showNotesMenu && (
          <div className="notes-actions">
            <div className="search-container">
              <Input type="text" placeholder="Buscar por #ID, nome, data, autor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              <Search size={16} className="search-icon" />
            </div>
            <div className="view-toggle">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                title="Visualização em grade"
              >
                <Grid3X3 size={15} />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                title="Visualização em lista"
              >
                <List size={15} />
              </button>
            </div>
            <button 
              onClick={() => setShowUtilitiesPanel(!showUtilitiesPanel)} 
              className={`notes-toolbar-btn ${showUtilitiesPanel ? 'active' : ''}`}
              title={showUtilitiesPanel ? 'Fechar utilitários' : 'Abrir utilitários'}
            >
              <FolderOpen size={15} />
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`notes-toolbar-btn ${showFilters ? 'active' : ''}`}
              title="Filtros"
            >
              <Filter size={15} />
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowSortMenu(!showSortMenu)} 
                className={`notes-toolbar-btn ${showSortMenu ? 'active' : ''}`}
                title="Ordenar"
              >
                <ArrowUpDown size={15} />
              </button>
              {showSortMenu && (
                <div className="notes-sort-dropdown">
                  {(Object.keys(sortLabels) as SortOption[]).map(key => (
                    <button 
                      key={key} 
                      onClick={() => { setSortBy(key); setShowSortMenu(false); }} 
                      className={`notes-sort-item ${sortBy === key ? 'active' : ''}`}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectionMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  onClick={toggleSelectAll} 
                  className="notes-toolbar-btn"
                  title="Selecionar todas"
                >
                  {selectedIds.size === filteredNotes.length ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>
                {selectedIds.size > 0 && (
                  <button onClick={handleBatchDelete} className="notes-batch-delete-btn">
                    <Trash2 size={13} /> {selectedIds.size}
                  </button>
                )}
                <button 
                  onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} 
                  className="notes-toolbar-btn"
                  title="Sair"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSelectionMode(true)} 
                className="notes-toolbar-btn"
                title="Modo seleção"
              >
                <CheckSquare size={15} />
              </button>
            )}
            <button
              onClick={handleNewNote}
              className="notes-add-btn"
              title="Nova nota"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {settings.showNotesMenu && showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--color-border-primary)', position: 'relative', zIndex: 80, overflow: 'visible', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '4px', flexShrink: 0 }}>Cor:</span>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', maxWidth: '460px', padding: '2px 0', scrollbarWidth: 'thin', cursor: 'grab', flexShrink: 0 }}>
            {organizationColorOptions.map((opt) => {
              const normalizedColor = opt.value.toLowerCase();
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilterColor(filterColor === normalizedColor ? null : normalizedColor)}
                  title={opt.label}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: filterColor === normalizedColor ? '2px solid #fff' : '2px solid transparent',
                    background: (opt.value.startsWith('#') || opt.value.startsWith('rgb') || opt.value.startsWith('hsl') || opt.value.startsWith('var(')) ? opt.value : getColorClass(opt.value),
                    cursor: 'pointer',
                    boxShadow: filterColor === normalizedColor ? '0 0 0 2px var(--color-primary-teal)' : 'none',
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px', flexShrink: 0 }} />
          <button onClick={() => setFilterPinned(!filterPinned)} title="Apenas fixadas" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: filterPinned ? 'rgba(0, 212, 170, 0.15)' : 'transparent', border: '1px solid var(--color-border-primary)', borderRadius: '6px', color: filterPinned ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
            <Pin size={12} /> Fixadas
          </button>

          {availableTags.length > 0 && (
            <>
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '2px' }}>Tags:</span>
              <details style={{ position: 'relative' }}>
                <summary style={{ listStyle: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 8px', border: '1px solid var(--color-border-primary)', borderRadius: '6px' }}>
                  {filterTags.length > 0 ? `${filterTags.length} selecionada(s)` : 'Selecionar tags'}
                </summary>
                <div style={{ position: 'absolute', top: '110%', left: 0, minWidth: '220px', maxHeight: '240px', overflowY: 'auto', padding: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: '8px', zIndex: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                  {availableTags.map((tag) => {
                    const active = filterTags.includes(tag);
                    return (
                      <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 2px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setFilterTags((prev) => (active ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                        />
                        <span>{tag}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </>
          )}

          {activeSystemTags.length > 0 && (
            <>
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '2px' }}>Sistema:</span>
              <details style={{ position: 'relative' }}>
                <summary style={{ listStyle: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 8px', border: '1px solid var(--color-border-primary)', borderRadius: '6px' }}>
                  {filterSystemTagIds.length > 0 ? `${filterSystemTagIds.length} selecionada(s)` : 'Selecionar sistema'}
                </summary>
                <div style={{ position: 'absolute', top: '110%', left: 0, minWidth: '220px', maxHeight: '240px', overflowY: 'auto', padding: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: '8px', zIndex: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                  {activeSystemTags.map((tag) => {
                    const active = filterSystemTagIds.includes(tag.id);
                    return (
                      <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 2px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setFilterSystemTagIds((prev) => (active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))}
                        />
                        <span style={{ width: 8, height: 8, borderRadius: '999px', backgroundColor: tag.color, display: 'inline-block', flexShrink: 0 }} />
                        <span>{tag.name}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </>
          )}

          <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
          {(filterColor || filterPinned || filterTags.length > 0 || filterSystemTagIds.length > 0) && (
            <button onClick={() => { setFilterColor(null); setFilterPinned(false); setFilterTags([]); setFilterSystemTagIds([]); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '11px' }}>
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      )}

      <div className="notes-content">
        {showUtilitiesPanel && (
          <div
            className="notes-utilities-backdrop"
            onClick={() => setShowUtilitiesPanel(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                setShowUtilitiesPanel(false);
              }
            }}
          />
        )}

        {showUtilitiesPanel && (
          <aside className="notes-utilities-drawer">
            <div className="notes-utilities-header">
              <div className="notes-utilities-title-wrap">
                <FolderOpen size={16} />
                <h3 className="notes-utilities-title">Utilitários</h3>
              </div>
              <button
                onClick={() => setShowUtilitiesPanel(false)}
                title="Fechar utilitários"
                className="notes-utilities-close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="notes-utilities-toolbar">
              <Input
                className="notes-utilities-search"
                type="text"
                value={utilitySearch}
                onChange={(e) => setUtilitySearch(e.target.value)}
                placeholder="Buscar arquivo..."
              />
              <Button
                variant="ghost"
                size="sm"
                className="notes-utilities-icon-btn"
                onClick={() => {
                  if (isCreatingFolder) {
                    void handleCreateFolder();
                    return;
                  }
                  setIsCreatingFolder(true);
                }}
                title={isCreatingFolder ? 'Confirmar pasta' : 'Nova pasta'}
              >
                <FolderPlus size={16} />
              </Button>
              <label
                htmlFor="utility-upload-input"
                title={uploadingUtility ? 'Enviando...' : `Upload de arquivo${currentUtilityPath ? ` em ${currentUtilityPath}` : ' na raiz'}`}
                className={`btn btn-primary btn-sm notes-utilities-icon-btn notes-utilities-upload-btn${uploadingUtility ? ' is-uploading' : ''}`}
              >
                {uploadingUtility ? <Loader2 size={16} className="notes-utilities-spin" /> : <Upload size={16} />}
              </label>

              <input
                id="utility-upload-input"
                type="file"
                multiple
                onChange={handleUtilityUpload}
                disabled={isUtilityBusy}
                style={{ display: 'none' }}
              />
            </div>

            {isUtilityBusy && (
              <div className="notes-utilities-status" role="status" aria-live="polite">
                <Loader2 size={13} className="notes-utilities-spin" />
                <span>{utilityActionMessage || (uploadingUtilityName ? `Enviando ${uploadingUtilityName}...` : 'Processando...')}</span>
              </div>
            )}

            <div className="notes-utilities-path">
              <button
                className="notes-utilities-path-back"
                onClick={() => {
                  if (!currentUtilityPath) return;
                  const parts = currentUtilityPath.split('/').filter(Boolean);
                  setCurrentUtilityPath(parts.slice(0, -1).join('/'));
                }}
                disabled={!currentUtilityPath}
                title="Voltar nível"
              >
                <ArrowLeft size={14} />
              </button>
              <button
                className={`notes-utilities-path-segment${currentUtilityPath ? '' : ' active'}`}
                onClick={() => setCurrentUtilityPath('')}
              >
                raiz
              </button>
              {utilityPathSegments.map((segment, index) => {
                const path = utilityPathSegments.slice(0, index + 1).join('/');
                const active = path === currentUtilityPath;
                return (
                  <React.Fragment key={`path-${path}`}>
                    <ChevronRight size={12} className="notes-utilities-path-separator" />
                    <button
                      className={`notes-utilities-path-segment${active ? ' active' : ''}`}
                      onClick={() => setCurrentUtilityPath(path)}
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {isCreatingFolder && (
              <div className="notes-utilities-folder-form">
                <Input
                  className="notes-utilities-search"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreateFolder();
                    }
                    if (e.key === 'Escape') {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  autoFocus
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleCreateFolder()}
                  disabled={!newFolderName.trim() || isUtilityBusy}
                >
                  Criar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  disabled={isUtilityBusy}
                >
                  Cancelar
                </Button>
              </div>
            )}

            <div className="notes-utilities-list">
              {draggingUtilityObjectKey && currentUtilityPath && (
                <div
                  className="notes-utilities-drop-root"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggingUtilityObjectKey) {
                      void handleMoveUtilityObject(draggingUtilityObjectKey, '');
                    }
                    setDraggingUtilityObjectKey(null);
                  }}
                >
                  Solte aqui para mover para a raiz
                </div>
              )}

              {utilityLoading ? (
                <div className="notes-utilities-empty">
                  <FileText size={18} />
                  <span>Carregando arquivos...</span>
                </div>
              ) : utilityItems.folders.length === 0 && utilityItems.files.length === 0 ? (
                <div className="notes-utilities-empty">
                  <FileText size={18} />
                  <span>Nenhum arquivo encontrado.</span>
                </div>
              ) : (
                <>
                  {utilityItems.folders.map((folderItem) => (
                    <div
                      key={`folder-${folderItem.path}`}
                      className="notes-utility-item notes-utility-item--folder"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (editingFolderPath === folderItem.path) return;
                        setCurrentUtilityPath(folderItem.path);
                      }}
                      onKeyDown={(event) => {
                        if (editingFolderPath === folderItem.path) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          setCurrentUtilityPath(folderItem.path);
                        }
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingUtilityObjectKey) {
                          void handleMoveUtilityObject(draggingUtilityObjectKey, folderItem.path);
                        }
                        setDraggingUtilityObjectKey(null);
                      }}
                    >
                      <div className="notes-utility-item-main">
                        <Folder size={14} className="notes-utility-item-icon" />
                        <div className="notes-utility-item-meta">
                          {editingFolderPath === folderItem.path ? (
                            <input
                              className="notes-utility-folder-rename-input"
                              value={editingFolderName}
                              onChange={(event) => setEditingFolderName(event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleUtilityRenameFolder(folderItem.path);
                                }
                                if (event.key === 'Escape') {
                                  setEditingFolderPath(null);
                                  setEditingFolderName('');
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="notes-utility-item-name">{folderItem.name}</span>
                              <span className="notes-utility-item-size">Pasta</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="notes-utility-item-actions">
                        {editingFolderPath === folderItem.path ? (
                          <>
                            <button
                              className="notes-utility-action-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleUtilityRenameFolder(folderItem.path);
                              }}
                              title="Salvar nome"
                              disabled={!editingFolderName.trim() || isUtilityBusy}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className="notes-utility-action-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingFolderPath(null);
                                setEditingFolderName('');
                              }}
                              title="Cancelar edição"
                              disabled={isUtilityBusy}
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="notes-utility-action-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingFolderPath(folderItem.path);
                                setEditingFolderName(folderItem.name);
                              }}
                              title="Renomear pasta"
                              disabled={isUtilityBusy}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="notes-utility-action-btn notes-utility-action-btn--danger"
                              onClick={(event) => {
                                event.stopPropagation();
                                setUtilityConfirmState({
                                  type: 'delete-folder',
                                  folderPath: folderItem.path,
                                  folderName: folderItem.name,
                                });
                              }}
                              title="Excluir pasta"
                              disabled={isUtilityBusy}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {utilityItems.files.map((file) => (
                    <div
                      key={`util-${file.objectKey}`}
                      className="notes-utility-item"
                      draggable
                      onDragStart={() => setDraggingUtilityObjectKey(file.objectKey)}
                      onDragEnd={() => setDraggingUtilityObjectKey(null)}
                    >
                      <div
                        className="notes-utility-item-main"
                        style={{ cursor: 'default' }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setUtilityConfirmState({ type: 'download-file', objectKey: file.objectKey, filename: file.name });
                          }
                        }}
                      >
                        <FileText size={14} className="notes-utility-item-icon" />
                        <div className="notes-utility-item-meta">
                          <span className="notes-utility-item-name">{file.name}</span>
                          <span className="notes-utility-item-size">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          className="notes-utility-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUtilityConfirmState({ type: 'download-file', objectKey: file.objectKey, filename: file.name });
                          }}
                          title="Baixar arquivo"
                          disabled={isUtilityBusy}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="notes-utility-action-btn notes-utility-action-btn--danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUtilityConfirmState({ type: 'delete-file', objectKey: file.objectKey, filename: file.name });
                          }}
                          title="Excluir arquivo"
                          disabled={isUtilityBusy}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </aside>
        )}

        {utilityConfirmState && (
          <div className="notes-utilities-confirm-backdrop" onClick={() => !utilityConfirmLoading && setUtilityConfirmState(null)}>
            <div className="notes-utilities-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <h4 className="notes-utilities-confirm-title">{getUtilityConfirmContent()?.title}</h4>
              <p className="notes-utilities-confirm-description">{getUtilityConfirmContent()?.description}</p>
              <div className="notes-utilities-confirm-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUtilityConfirmState(null)}
                  disabled={utilityConfirmLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant={getUtilityConfirmContent()?.confirmVariant || 'primary'}
                  size="sm"
                  onClick={() => void handleUtilityConfirm()}
                  disabled={utilityConfirmLoading}
                >
                  {utilityConfirmLoading ? <Loader2 size={14} className="notes-utilities-spin" /> : getUtilityConfirmContent()?.confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="notes-loading">
            <Loader2 className="notes-loading-spinner" />
            <p className="notes-loading-text">Carregando notas...</p>
          </div>
        ) : error ? (
          <div className="notes-error">
            <p className="error-message">Erro ao carregar notas: {error}</p>
            <Button onClick={fetchNotes} variant="secondary" size="sm">Tentar novamente</Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="notes-empty">
            {searchTerm ? (
              <div>
                <p className="empty-search-message">Nenhuma nota encontrada para &quot;{searchTerm}&quot;</p>
                <Button onClick={() => setSearchTerm('')} variant="secondary" size="sm">Limpar busca</Button>
              </div>
            ) : (
              <div>
                <StickyNote size={48} className="empty-icon" />
                <h3 className="empty-title">Suas notas aparecerão aqui</h3>
                <p className="empty-subtitle">Comece criando sua primeira nota</p>
                <Button onClick={handleNewNote} variant="primary" size="sm"><Plus size={16} /> Criar primeira nota</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="notes-list notes-list-container" ref={notesContainerRef} onScroll={handleContainerScroll}>
            {viewMode === 'grid' ? (
              <div className="notes-grid">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="note-card" onClick={() => selectionMode ? toggleSelect(note.id) : handleNoteClick(note)}>
                    <div className="note-card-accent-bar" style={{ backgroundColor: getNoteAccentColor(note) }} />
                    {note.is_pinned && (
                      <div className="note-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: '2px', zIndex: 5 }}>
                        <Pin size={13} className="pin-icon-active" />
                      </div>
                    )}
                    <div className="note-card-content">
                      <div className="note-header">
                        <h3 className="note-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {selectionMode && (
                            <span style={{ flexShrink: 0, display: 'inline-flex' }} onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}>
                              {selectedIds.has(note.id) ? <CheckSquare size={15} style={{ color: 'var(--color-primary-teal)' }} /> : <Square size={15} style={{ color: 'var(--color-text-muted)' }} />}
                            </span>
                          )}
                          {note.sequential_id != null && <span style={{ color: 'var(--color-primary-teal)', fontSize: '12px', flexShrink: 0 }}>#{note.sequential_id}</span>}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                        </h3>
                        <button
                          className="note-edit-button"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setIsEditing(true); }}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>

                      <p className="note-content">{truncateContent(getNotePreviewContent(note))}</p>
                      <div className="note-footer">
                        {note.tags && note.tags.length > 0 && (
                          <div className="note-tags">
                            {renderTagBadges(note)}
                          </div>
                        )}
                        <div className="note-meta">
                          {note.creator_display_name && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {note.created_at && note.updated_at && Math.abs(new Date(note.updated_at).getTime() - new Date(note.created_at).getTime()) > 1000
                                ? 'editado por '
                                : 'por '}
                              {note.creator_display_name}
                            </span>
                          )}
                          <div className="note-date">{formatDate(note.updated_at)}</div>
                          {settings.showDashboard && note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                            <div onClick={(e) => { e.stopPropagation(); showLinkedTasks(note); }} className="task-link">
                              <Link size={12} className="link-icon" /><span className="link-text">{note.linkedTaskIds.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notes-list-view">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="note-list-item" onClick={() => selectionMode ? toggleSelect(note.id) : handleNoteClick(note)}>
                    <div className="note-card-accent-bar" style={{ backgroundColor: getNoteAccentColor(note) }} />
                    <div className="note-list-content">
                      <div className="note-main">
                        {selectionMode && (
                          <div style={{ flexShrink: 0, marginRight: '8px' }} onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}>
                            {selectedIds.has(note.id) ? <CheckSquare size={16} style={{ color: 'var(--color-primary-teal)' }} /> : <Square size={16} style={{ color: 'var(--color-text-muted)' }} />}
                          </div>
                        )}
                        {note.is_pinned && (<Pin size={14} className="pin-icon-active" style={{ flexShrink: 0 }} />)}
                        <div className="note-info">
                          <h3 className="note-list-title">
                            {note.sequential_id != null && <span style={{ color: 'var(--color-primary-teal)', fontSize: '12px', marginRight: '6px' }}>#{note.sequential_id}</span>}
                            {note.title}
                          </h3>
                          <p className="note-list-text">{truncateContent(getNotePreviewContent(note), 90)}</p>
                          <div className="note-list-footer">
                            {note.tags && note.tags.length > 0 && (
                              <div className="note-list-tags">
                                {renderTagBadges(note)}
                              </div>
                            )}
                            <div className="note-meta note-meta--right">
                               {note.creator_display_name && (
                                 <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                   {note.created_at && note.updated_at && Math.abs(new Date(note.updated_at).getTime() - new Date(note.created_at).getTime()) > 1000
                                     ? 'editado por '
                                     : 'por '}
                                   {note.creator_display_name}
                                 </span>
                               )}
                              <div className="note-date">{formatDate(note.updated_at)}</div>
                              {settings.showDashboard && note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                                <div onClick={(e) => { e.stopPropagation(); showLinkedTasks(note); }} className="task-link">
                                  <Link size={14} className="link-icon" /><span className="link-text">{note.linkedTaskIds.length}</span>
                                </div>
                              )}
                              <div className="note-list-actions">
                                <button
                                  className="note-edit-button"
                                  title="Editar"
                                  onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setIsEditing(true); }}
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {settings.showDashboard && (
        <LinkedTasksModal isOpen={linkedTasksModal.isOpen} onClose={closeLinkedTasksModal} noteId={linkedTasksModal.noteId} noteTitle={linkedTasksModal.noteTitle} linkedTaskIds={linkedTasksModal.linkedTaskIds} />
      )}

      <NoteViewerModal
        isOpen={viewer.isOpen}
        note={viewer.note}
        onClose={() => setViewer({ isOpen: false, note: null })}
        ownerId={user?.id ?? null}
        orgId={activeOrg?.id ?? null}
        onTogglePin={async (note: Note) => {
          await updateNote(note.id, { is_pinned: !note.is_pinned });
          setViewer(prev => prev.note?.id === note.id ? { ...prev, note: { ...note, is_pinned: !note.is_pinned } } : prev);
        }}
      />

      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="scroll-to-top-btn"
          title="Voltar ao topo"
          style={{ zIndex: 95 }}
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
};