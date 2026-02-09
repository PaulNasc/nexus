import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, CreateTaskData, TaskStatus } from '../../shared/types/task';

// Map string priority to numeric for DB storage
const priorityToNumber = (p?: string): number => {
  if (p === 'high') return 1;
  if (p === 'medium') return 2;
  if (p === 'low') return 3;
  return 3;
};

// Map numeric priority back to string
const numberToPriority = (n?: number | null): 'low' | 'medium' | 'high' | undefined => {
  if (n === 1) return 'high';
  if (n === 2) return 'medium';
  if (n === 3) return 'low';
  return undefined;
};

// Transform DB row to app Task type
const dbRowToTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: row.status as TaskStatus,
  priority: numberToPriority(row.priority),
  category_id: row.category_id ?? undefined,
  linkedNoteId: undefined, // resolved separately via note_task_links
  due_date: row.due_date ?? undefined,
  completed_at: row.completed_at ?? undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export interface TaskStats {
  total: number;
  backlog: number;
  esta_semana: number;
  hoje: number;
  concluido: number;
}

interface UseSupabaseTasksReturn {
  tasks: Task[];
  stats: TaskStats | null;
  loading: boolean;
  error: string | null;
  getAllTasks: () => Promise<void>;
  getTasksByStatus: (status: string) => Promise<Task[]>;
  createTask: (taskData: CreateTaskData) => Promise<Task | null>;
  updateTask: (id: number, updates: Partial<CreateTaskData>) => Promise<Task | null>;
  deleteTask: (id: number) => Promise<boolean>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
  linkTaskToNote: (taskId: number, noteId: number) => Promise<boolean>;
  unlinkTaskFromNote: (taskId: number) => Promise<boolean>;
}

export const useSupabaseTasks = (): UseSupabaseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const getAllTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(dbRowToTask);

      // Resolve linked notes via note_task_links
      const { data: links } = await supabase
        .from('note_task_links')
        .select('task_id, note_id');

      if (links) {
        const linkMap = new Map<number, number>();
        for (const link of links) {
          linkMap.set(link.task_id, link.note_id);
        }
        for (const task of mapped) {
          task.linkedNoteId = linkMap.get(task.id);
        }
      }

      setTasks(mapped);
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { loaded: true } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
      console.error('useSupabaseTasks.getAllTasks error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTasksByStatus = useCallback(async (status: string): Promise<Task[]> => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return (data || []).map(dbRowToTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas por status');
      return [];
    }
  }, []);

  const createTask = useCallback(async (taskData: CreateTaskData): Promise<Task | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const insertData: any = {
        user_id: userId,
        title: taskData.title,
        description: taskData.description || null,
        status: taskData.status || 'backlog',
        priority: priorityToNumber(taskData.priority),
        category_id: taskData.category_id || null,
        due_date: taskData.due_date || null,
      };

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const newTask = dbRowToTask(data);

      // If there's a linked note, create the link
      if (taskData.linkedNoteId) {
        await supabase.from('note_task_links').insert({
          task_id: newTask.id,
          note_id: taskData.linkedNoteId,
        });
        newTask.linkedNoteId = taskData.linkedNoteId;
      }

      setTasks(prev => [newTask, ...prev]);
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: newTask }));
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tarefa');
      console.error('useSupabaseTasks.createTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (id: number, updates: Partial<CreateTaskData>): Promise<Task | null> => {
    try {
      setLoading(true);
      setError(null);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        if (updates.status === 'concluido') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (updates.priority !== undefined) updateData.priority = priorityToNumber(updates.priority);
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id || null;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date || null;

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedTask = dbRowToTask(data);

      // Handle linked note update
      if (updates.linkedNoteId !== undefined) {
        // Remove existing link
        await supabase.from('note_task_links').delete().eq('task_id', id);
        // Add new link if provided
        if (updates.linkedNoteId) {
          await supabase.from('note_task_links').insert({
            task_id: id,
            note_id: updates.linkedNoteId,
          });
          updatedTask.linkedNoteId = updates.linkedNoteId;
        }
      }

      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: updatedTask }));
      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
      console.error('useSupabaseTasks.updateTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // note_task_links cascade on delete, so no need to delete them manually
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTasks(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: { deletedId: id } }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
      console.error('useSupabaseTasks.deleteTask error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('status');

      if (fetchError) throw fetchError;

      const rows = data || [];
      const taskStats: TaskStats = {
        total: rows.length,
        backlog: rows.filter(r => r.status === 'backlog').length,
        esta_semana: rows.filter(r => r.status === 'esta_semana').length,
        hoje: rows.filter(r => r.status === 'hoje').length,
        concluido: rows.filter(r => r.status === 'concluido').length,
      };
      setStats(taskStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
      console.error('useSupabaseTasks.refreshStats error:', err);
    }
  }, []);

  const linkTaskToNote = useCallback(async (taskId: number, noteId: number): Promise<boolean> => {
    try {
      setError(null);
      // Remove existing link for this task
      await supabase.from('note_task_links').delete().eq('task_id', taskId);
      // Insert new link
      const { error: insertError } = await supabase
        .from('note_task_links')
        .insert({ task_id: taskId, note_id: noteId });

      if (insertError) throw insertError;

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, linkedNoteId: noteId } : t
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular tarefa à nota');
      return false;
    }
  }, []);

  const unlinkTaskFromNote = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('note_task_links')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) throw deleteError;

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, linkedNoteId: undefined } : t
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desvincular tarefa da nota');
      return false;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    getAllTasks();
    refreshStats();
  }, [getAllTasks, refreshStats]);

  // Refresh stats when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      refreshStats();
    }
  }, [tasks, refreshStats]);

  return {
    tasks,
    stats,
    loading,
    error,
    getAllTasks,
    getTasksByStatus,
    createTask,
    updateTask,
    deleteTask,
    refreshStats,
    clearError,
    linkTaskToNote,
    unlinkTaskFromNote,
  };
};

export default useSupabaseTasks;
