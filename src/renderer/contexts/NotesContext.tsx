import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import type { Note, CreateNoteData, UpdateNoteData, NoteStats } from '../../shared/types/note';
import type { ElectronAPI } from '../../main/preload';

// Helper to get electron IPC bridge
const getElectron = (): ElectronAPI | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).electronAPI ?? null;
  } catch {
    return null;
  }
};

interface SupabaseNoteRow {
  id: number;
  user_id: string;
  title: string;
  content: string;
  format: 'text' | 'markdown';
  tags: string[] | null;
  attached_images: string[] | null;
  attached_videos: string[] | null;
  color: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  sequential_id: number | null;
  creator_display_name?: string | null;
}

const dbRowToNote = (row: SupabaseNoteRow, linkedTaskIds?: number[]): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  format: row.format,
  tags: row.tags ?? undefined,
  attachedImages: row.attached_images ?? undefined,
  attachedVideos: row.attached_videos ?? undefined,
  color: row.color ?? undefined,
  is_pinned: row.is_pinned,
  is_archived: row.is_archived,
  linkedTaskIds: linkedTaskIds ?? undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
  sequential_id: row.sequential_id ?? undefined,
  creator_display_name: row.creator_display_name ?? undefined,
});

interface NotesContextType {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  createNote: (noteData: CreateNoteData) => Promise<Note | null>;
  updateNote: (id: number, updates: UpdateNoteData) => Promise<Note | null>;
  deleteNote: (id: number) => Promise<boolean>;
  getNoteStats: () => Promise<NoteStats | null>;
  linkTaskToNote: (taskId: number, noteId: number) => Promise<boolean>;
  unlinkTaskFromNote: (taskId: number) => Promise<boolean>;
}

const NotesContext = createContext<NotesContextType | null>(null);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const { settings } = useSettings();
  const { user, isOffline } = useAuth();
  const { activeOrg } = useOrganization();

  // Determine effective storage mode
  const storageMode = settings.storageMode || 'cloud';
  const isAuthenticated = !!user && !isOffline;
  const useCloud = (storageMode === 'cloud' || storageMode === 'hybrid') && isAuthenticated;
  const useLocal = storageMode === 'local' || storageMode === 'hybrid' || !isAuthenticated;

  // ── LOCAL (IPC/MemoryDB) helpers ──────────────────────────────
  const fetchNotesLocal = useCallback(async (): Promise<Note[]> => {
    const electron = getElectron();
    if (!electron) return [];
    const raw = await electron.database.getAllNotes() as Note[];
    return Array.isArray(raw) ? raw : [];
  }, []);

  const createNoteLocal = useCallback(async (noteData: CreateNoteData): Promise<Note | null> => {
    const electron = getElectron();
    if (!electron) return null;
    return await electron.database.createNote(noteData) as Note;
  }, []);

  const updateNoteLocal = useCallback(async (id: number, updates: UpdateNoteData): Promise<Note | null> => {
    const electron = getElectron();
    if (!electron) return null;
    return await electron.database.updateNote(id, updates) as Note;
  }, []);

  const deleteNoteLocal = useCallback(async (id: number): Promise<boolean> => {
    const electron = getElectron();
    if (!electron) return false;
    return await electron.database.deleteNote(id) as boolean;
  }, []);

  // ── CLOUD (Supabase) helpers ──────────────────────────────────
  const fetchNotesCloud = useCallback(async (): Promise<Note[]> => {
    // JOIN with profiles to get creator display_name
    let query = supabase
      .from('notes')
      .select('*, profiles!notes_user_id_fkey(display_name)');
    if (activeOrg) {
      query = query.eq('organization_id', activeOrg.id);
    } else {
      query = query.is('organization_id', null);
    }
    const { data, error: fetchError } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });

    if (fetchError) {
      // Fallback without JOIN if foreign key name doesn't match
      let fallbackQuery = supabase.from('notes').select('*');
      if (activeOrg) {
        fallbackQuery = fallbackQuery.eq('organization_id', activeOrg.id);
      } else {
        fallbackQuery = fallbackQuery.is('organization_id', null);
      }
      const { data: fallbackData, error: fallbackError } = await fallbackQuery
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (fallbackError) throw fallbackError;

      const rows = (fallbackData || []) as SupabaseNoteRow[];

      // Fetch creator names separately
      const userIds = [...new Set(rows.map(r => r.user_id))];
      const profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap.set(p.id, p.display_name || '');
          }
        }
      }

      const { data: links } = await supabase
        .from('note_task_links')
        .select('note_id, task_id');
      const linkMap = new Map<number, number[]>();
      if (links) {
        for (const link of links) {
          const existing = linkMap.get(link.note_id) || [];
          existing.push(link.task_id);
          linkMap.set(link.note_id, existing);
        }
      }

      return rows.map(row => {
        const note = dbRowToNote(row, linkMap.get(row.id));
        note.creator_display_name = profileMap.get(row.user_id) || undefined;
        return note;
      });
    }

    // Process JOIN result
    const rows = (data || []).map((row: Record<string, unknown>) => {
      const profiles = row.profiles as { display_name?: string } | null;
      const noteRow: SupabaseNoteRow = {
        ...(row as unknown as SupabaseNoteRow),
        creator_display_name: profiles?.display_name ?? null,
      };
      return noteRow;
    });

    const { data: links } = await supabase
      .from('note_task_links')
      .select('note_id, task_id');

    const linkMap = new Map<number, number[]>();
    if (links) {
      for (const link of links) {
        const existing = linkMap.get(link.note_id) || [];
        existing.push(link.task_id);
        linkMap.set(link.note_id, existing);
      }
    }

    return rows.map(row => dbRowToNote(row, linkMap.get(row.id)));
  }, [activeOrg]);

  const createNoteCloud = useCallback(async (noteData: CreateNoteData): Promise<Note | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error('Usuário não autenticado');

    // Dedup check: avoid inserting notes with the same title for this user
    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', userId)
      .eq('title', noteData.title)
      .limit(1);

    if (existing && existing.length > 0) {
      // Note with same title already exists — skip duplicate
      const { data: fullRow } = await supabase
        .from('notes')
        .select('*')
        .eq('id', existing[0].id)
        .single();
      if (fullRow) return dbRowToNote(fullRow as SupabaseNoteRow);
    }

    // Generate sequential_id per organization (conflict-safe with retry)
    let sequentialId = 1;
    const orgId = activeOrg?.id || null;
    const { data: maxRow } = await supabase
      .from('notes')
      .select('sequential_id')
      .eq('organization_id', orgId ?? '')
      .order('sequential_id', { ascending: false })
      .limit(1);
    if (!orgId) {
      // For personal notes (no org), use a simpler approach
      const { data: maxPersonal } = await supabase
        .from('notes')
        .select('sequential_id')
        .is('organization_id', null)
        .order('sequential_id', { ascending: false })
        .limit(1);
      sequentialId = (maxPersonal?.[0]?.sequential_id ?? 0) + 1;
    } else {
      sequentialId = (maxRow?.[0]?.sequential_id ?? 0) + 1;
    }

    const { data, error: insertError } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: noteData.title,
        content: noteData.content || '',
        format: noteData.format || 'text',
        tags: noteData.tags || [],
        attached_images: noteData.attachedImages || [],
        attached_videos: noteData.attachedVideos || [],
        color: noteData.color || null,
        organization_id: orgId,
        sequential_id: sequentialId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const created = dbRowToNote(data as SupabaseNoteRow);

    if (noteData.linkedTaskIds && noteData.linkedTaskIds.length > 0) {
      const linkRows = noteData.linkedTaskIds.map(taskId => ({
        note_id: created.id,
        task_id: taskId,
      }));
      await supabase.from('note_task_links').insert(linkRows);
      created.linkedTaskIds = noteData.linkedTaskIds;
    }

    return created;
  }, [activeOrg]);

  // ── PUBLIC API ────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!initialLoadDone.current) setIsLoading(true);
    setError(null);
    try {
      let result: Note[] = [];
      if (useCloud) {
        result = await fetchNotesCloud();
      } else if (useLocal) {
        result = await fetchNotesLocal();
      }
      setNotes(result);
    } catch (err) {
      console.error('NotesContext.fetchNotes error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas');
      // Fallback to local if cloud fails
      if (useCloud && useLocal) {
        try {
          const localNotes = await fetchNotesLocal();
          setNotes(localNotes);
        } catch {
          setNotes([]);
        }
      } else {
        setNotes([]);
      }
    } finally {
      setIsLoading(false);
      initialLoadDone.current = true;
    }
  }, [useCloud, useLocal, fetchNotesCloud, fetchNotesLocal]);

  const createNote = useCallback(async (noteData: CreateNoteData): Promise<Note | null> => {
    setError(null);
    try {
      let created: Note | null = null;

      if (useCloud) {
        created = await createNoteCloud(noteData);
      }

      if (useLocal) {
        const localNote = await createNoteLocal(noteData);
        if (!created) created = localNote;
      }

      if (created) {
        setNotes(prev => [created!, ...prev]);
      }
      return created;
    } catch (err) {
      console.error('NotesContext.createNote error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar nota');
      return null;
    }
  }, [useCloud, useLocal, createNoteCloud, createNoteLocal]);

  const updateNote = useCallback(async (id: number, updates: UpdateNoteData): Promise<Note | null> => {
    setError(null);
    try {
      let updated: Note | null = null;

      if (useCloud) {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.format !== undefined) updateData.format = updates.format;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        if (updates.attachedImages !== undefined) updateData.attached_images = updates.attachedImages;
        if (updates.attachedVideos !== undefined) updateData.attached_videos = updates.attachedVideos;
        if (updates.color !== undefined) updateData.color = updates.color;
        if (updates.is_pinned !== undefined) updateData.is_pinned = updates.is_pinned;
        if (updates.is_archived !== undefined) updateData.is_archived = updates.is_archived;

        const { data, error: updateError } = await supabase
          .from('notes')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        if (updates.linkedTaskIds !== undefined) {
          await supabase.from('note_task_links').delete().eq('note_id', id);
          if (updates.linkedTaskIds && updates.linkedTaskIds.length > 0) {
            const linkRows = updates.linkedTaskIds.map(taskId => ({
              note_id: id,
              task_id: taskId,
            }));
            await supabase.from('note_task_links').insert(linkRows);
          }
        }

        updated = dbRowToNote(data as SupabaseNoteRow, updates.linkedTaskIds);
      }

      if (useLocal) {
        const localUpdated = await updateNoteLocal(id, updates);
        if (!updated) updated = localUpdated;
      }

      if (updated) {
        setNotes(prev => prev.map(n => n.id === id ? updated! : n));
      }
      return updated;
    } catch (err) {
      console.error('NotesContext.updateNote error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar nota');
      return null;
    }
  }, [useCloud, useLocal, updateNoteLocal]);

  const deleteNote = useCallback(async (id: number): Promise<boolean> => {
    setError(null);
    try {
      if (useCloud) {
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
      }

      if (useLocal) {
        await deleteNoteLocal(id);
      }

      setNotes(prev => prev.filter(n => n.id !== id));
      return true;
    } catch (err) {
      console.error('NotesContext.deleteNote error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar nota');
      return false;
    }
  }, [useCloud, useLocal, deleteNoteLocal]);

  const getNoteStats = useCallback(async (): Promise<NoteStats | null> => {
    setError(null);
    try {
      const linkedNoteIds = new Set(
        notes.filter(n => n.linkedTaskIds && n.linkedTaskIds.length > 0).map(n => n.id)
      );

      return {
        total: notes.length,
        pinned: notes.filter(n => n.is_pinned).length,
        archived: notes.filter(n => n.is_archived).length,
        withAttachments: notes.filter(n => n.attachedImages && n.attachedImages.length > 0).length,
        linkedToTasks: linkedNoteIds.size,
      };
    } catch (err) {
      console.error('NotesContext.getNoteStats error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao obter estatísticas');
      return null;
    }
  }, [notes]);

  const linkTaskToNote = useCallback(async (taskId: number, noteId: number): Promise<boolean> => {
    setError(null);
    try {
      if (useCloud) {
        const { error: insertError } = await supabase
          .from('note_task_links')
          .upsert({ task_id: taskId, note_id: noteId });
        if (insertError) throw insertError;
      }

      if (useLocal) {
        const electron = getElectron();
        if (electron) await electron.database.linkTaskToNote(taskId, noteId);
      }

      setNotes(prev => prev.map(note => {
        if (note.id === noteId) {
          const linkedTaskIds = note.linkedTaskIds || [];
          if (!linkedTaskIds.includes(taskId)) {
            return { ...note, linkedTaskIds: [...linkedTaskIds, taskId] };
          }
        }
        return note;
      }));
      return true;
    } catch (err) {
      console.error('NotesContext.linkTaskToNote error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao vincular tarefa à nota');
      return false;
    }
  }, [useCloud, useLocal]);

  const unlinkTaskFromNote = useCallback(async (taskId: number): Promise<boolean> => {
    setError(null);
    try {
      if (useCloud) {
        const { error: deleteError } = await supabase
          .from('note_task_links')
          .delete()
          .eq('task_id', taskId);
        if (deleteError) throw deleteError;
      }

      if (useLocal) {
        const electron = getElectron();
        if (electron) await electron.database.unlinkTaskFromNote(taskId);
      }

      setNotes(prev => prev.map(note => ({
        ...note,
        linkedTaskIds: note.linkedTaskIds?.filter(id => id !== taskId) || [],
      })));
      return true;
    } catch (err) {
      console.error('NotesContext.unlinkTaskFromNote error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao desvincular tarefa da nota');
      return false;
    }
  }, [useCloud, useLocal]);

  // Load notes on mount and when storage mode changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Realtime subscription for cloud notes
  useEffect(() => {
    if (!useCloud) return;

    const channel = supabase
      .channel('notes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          const rowOrgId = (newRow as Record<string, unknown>)?.organization_id ?? (oldRow as Record<string, unknown>)?.organization_id ?? null;
          const currentOrgId = activeOrg?.id ?? null;
          if (rowOrgId !== currentOrgId) return;

          if (eventType === 'INSERT') {
            const note = dbRowToNote(newRow as unknown as SupabaseNoteRow);
            setNotes(prev => {
              if (prev.some(n => n.id === note.id)) return prev;
              return [note, ...prev];
            });
          } else if (eventType === 'UPDATE') {
            const note = dbRowToNote(newRow as unknown as SupabaseNoteRow);
            setNotes(prev => prev.map(n => n.id === note.id ? { ...n, ...note } : n));
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRow as Record<string, unknown>)?.id as number;
            if (deletedId) setNotes(prev => prev.filter(n => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useCloud, activeOrg]);

  const value = useMemo(() => ({
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    getNoteStats,
    linkTaskToNote,
    unlinkTaskFromNote,
  }), [notes, isLoading, error, fetchNotes, createNote, updateNote, deleteNote, getNoteStats, linkTaskToNote, unlinkTaskFromNote]);

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export default NotesContext;
