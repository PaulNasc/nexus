import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Note, CreateNoteData, UpdateNoteData, NoteStats } from '../../shared/types/note';

interface SupabaseNoteRow {
  id: number;
  user_id: string;
  title: string;
  content: string;
  format: 'text' | 'markdown';
  tags: string[] | null;
  attached_images: string[] | null;
  color: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

const dbRowToNote = (row: SupabaseNoteRow, linkedTaskIds?: number[]): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  format: row.format,
  tags: row.tags ?? undefined,
  attachedImages: row.attached_images ?? undefined,
  color: row.color ?? undefined,
  is_pinned: row.is_pinned,
  is_archived: row.is_archived,
  linkedTaskIds: linkedTaskIds ?? undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const useSupabaseNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data || []) as SupabaseNoteRow[];

      // Resolve linked task IDs
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

      const mapped = rows.map(row => dbRowToNote(row, linkMap.get(row.id)));
      setNotes(mapped);
    } catch (err) {
      console.error('useSupabaseNotes.fetchNotes error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNote = async (noteData: CreateNoteData): Promise<Note | null> => {
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const { data, error: insertError } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: noteData.title,
          content: noteData.content || '',
          format: noteData.format || 'text',
          tags: noteData.tags || [],
          attached_images: noteData.attachedImages || [],
          color: noteData.color || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const created = dbRowToNote(data as SupabaseNoteRow);

      // Handle linked tasks
      if (noteData.linkedTaskIds && noteData.linkedTaskIds.length > 0) {
        const linkRows = noteData.linkedTaskIds.map(taskId => ({
          note_id: created.id,
          task_id: taskId,
        }));
        await supabase.from('note_task_links').insert(linkRows);
        created.linkedTaskIds = noteData.linkedTaskIds;
      }

      setNotes(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('useSupabaseNotes.createNote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create note');
      return null;
    }
  };

  const updateNote = async (id: number, updates: UpdateNoteData): Promise<Note | null> => {
    setError(null);
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.format !== undefined) updateData.format = updates.format;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.attachedImages !== undefined) updateData.attached_images = updates.attachedImages;
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

      // Handle linked tasks update
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

      const updated = dbRowToNote(data as SupabaseNoteRow, updates.linkedTaskIds);
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
      return updated;
    } catch (err) {
      console.error('useSupabaseNotes.updateNote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update note');
      return null;
    }
  };

  const deleteNote = async (id: number): Promise<boolean> => {
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setNotes(prev => prev.filter(n => n.id !== id));
      return true;
    } catch (err) {
      console.error('useSupabaseNotes.deleteNote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      return false;
    }
  };

  const getNoteStats = async (): Promise<NoteStats | null> => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('id, is_pinned, is_archived, attached_images');

      if (fetchError) throw fetchError;

      const rows = data || [];
      const { data: links } = await supabase
        .from('note_task_links')
        .select('note_id');

      const linkedNoteIds = new Set((links || []).map(l => l.note_id));

      return {
        total: rows.length,
        pinned: rows.filter(r => r.is_pinned).length,
        archived: rows.filter(r => r.is_archived).length,
        withAttachments: rows.filter(r => r.attached_images && r.attached_images.length > 0).length,
        linkedToTasks: rows.filter(r => linkedNoteIds.has(r.id)).length,
      };
    } catch (err) {
      console.error('useSupabaseNotes.getNoteStats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get note stats');
      return null;
    }
  };

  const linkTaskToNote = async (taskId: number, noteId: number): Promise<boolean> => {
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('note_task_links')
        .upsert({ task_id: taskId, note_id: noteId });

      if (insertError) throw insertError;

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
      console.error('useSupabaseNotes.linkTaskToNote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to link task to note');
      return false;
    }
  };

  const unlinkTaskFromNote = async (taskId: number): Promise<boolean> => {
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('note_task_links')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) throw deleteError;

      setNotes(prev => prev.map(note => ({
        ...note,
        linkedTaskIds: note.linkedTaskIds?.filter(id => id !== taskId) || [],
      })));
      return true;
    } catch (err) {
      console.error('useSupabaseNotes.unlinkTaskFromNote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlink task from note');
      return false;
    }
  };

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Listen for external note update events
  useEffect(() => {
    const handler = () => { fetchNotes(); };
    window.addEventListener('notesUpdated', handler);
    return () => { window.removeEventListener('notesUpdated', handler); };
  }, [fetchNotes]);

  return {
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
  };
};

export default useSupabaseNotes;
