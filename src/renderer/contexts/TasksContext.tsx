import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from './AuthContext';
import type { Task, CreateTaskData, TaskStatus } from '../../shared/types/task';
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
const dbRowToTask = (row: Record<string, unknown>): Task => ({
  id: row.id as number,
  title: row.title as string,
  description: (row.description as string) ?? undefined,
  status: row.status as TaskStatus,
  priority: numberToPriority(row.priority as number | null),
  category_id: (row.category_id as number) ?? undefined,
  linkedNoteId: undefined, // resolved separately via note_task_links
  due_date: (row.due_date as string) ?? undefined,
  completed_at: (row.completed_at as string) ?? undefined,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export interface TaskStats {
  total: number;
  backlog: number;
  esta_semana: number;
  hoje: number;
  concluido: number;
}

interface TasksContextType {
  tasks: Task[];
  stats: TaskStats;
  loading: boolean;
  error: string | null;
  getAllTasks: () => Promise<void>;
  getTasksByStatus: (status: string) => Promise<Task[]>;
  createTask: (taskData: CreateTaskData) => Promise<Task | null>;
  updateTask: (id: number, updates: Partial<CreateTaskData>) => Promise<Task | null>;
  deleteTask: (id: number) => Promise<boolean>;
  clearError: () => void;
  linkTaskToNote: (taskId: number, noteId: number) => Promise<boolean>;
  unlinkTaskFromNote: (taskId: number) => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | null>(null);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { user, isOffline } = useAuth();

  // Determine effective storage mode
  const storageMode = settings.storageMode || 'cloud';
  const isAuthenticated = !!user && !isOffline;
  const useCloud = (storageMode === 'cloud' || storageMode === 'hybrid') && isAuthenticated;
  const useLocal = storageMode === 'local' || storageMode === 'hybrid' || !isAuthenticated;

  const clearError = useCallback(() => setError(null), []);

  // Stats calculated locally from tasks array — no extra fetch
  const stats = useMemo<TaskStats>(() => ({
    total: tasks.length,
    backlog: tasks.filter(t => t.status === 'backlog').length,
    esta_semana: tasks.filter(t => t.status === 'esta_semana').length,
    hoje: tasks.filter(t => t.status === 'hoje').length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
  }), [tasks]);

  // ── LOCAL (IPC/MemoryDB) helpers ──────────────────────────────
  const getAllTasksLocal = useCallback(async (): Promise<Task[]> => {
    const electron = getElectron();
    if (!electron) return [];
    const raw = await electron.database.getAllTasks() as Task[];
    return Array.isArray(raw) ? raw : [];
  }, []);

  const createTaskLocal = useCallback(async (taskData: CreateTaskData): Promise<Task | null> => {
    const electron = getElectron();
    if (!electron) return null;
    return await electron.tasks.create(taskData) as Task;
  }, []);

  const updateTaskLocal = useCallback(async (id: number, updates: Partial<CreateTaskData>): Promise<Task | null> => {
    const electron = getElectron();
    if (!electron) return null;
    return await electron.tasks.update(id, updates) as Task;
  }, []);

  const deleteTaskLocal = useCallback(async (id: number): Promise<boolean> => {
    const electron = getElectron();
    if (!electron) return false;
    await electron.tasks.delete(id);
    return true;
  }, []);

  // ── CLOUD (Supabase) helpers ──────────────────────────────────
  const getAllTasksCloud = useCallback(async (): Promise<Task[]> => {
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    const mapped = (data || []).map(dbRowToTask);

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

    return mapped;
  }, []);

  const createTaskCloud = useCallback(async (taskData: CreateTaskData): Promise<Task | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error('Usuário não autenticado');

    const insertData = {
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

    if (taskData.linkedNoteId) {
      await supabase.from('note_task_links').insert({
        task_id: newTask.id,
        note_id: taskData.linkedNoteId,
      });
      newTask.linkedNoteId = taskData.linkedNoteId;
    }

    return newTask;
  }, []);

  // ── PUBLIC API ────────────────────────────────────────────────
  const getAllTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let result: Task[] = [];
      if (useCloud) {
        result = await getAllTasksCloud();
      } else if (useLocal) {
        result = await getAllTasksLocal();
      }
      setTasks(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
      console.error('TasksContext.getAllTasks error:', err);
      // Fallback to local if cloud fails
      if (useCloud && useLocal) {
        try {
          const localTasks = await getAllTasksLocal();
          setTasks(localTasks);
        } catch {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [useCloud, useLocal, getAllTasksCloud, getAllTasksLocal]);

  const getTasksByStatus = useCallback(async (status: string): Promise<Task[]> => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const createTask = useCallback(async (taskData: CreateTaskData): Promise<Task | null> => {
    try {
      setLoading(true);
      setError(null);

      let newTask: Task | null = null;

      if (useCloud) {
        newTask = await createTaskCloud(taskData);
      }

      if (useLocal) {
        const localTask = await createTaskLocal(taskData);
        if (!newTask) newTask = localTask;
      }

      if (newTask) {
        setTasks(prev => [newTask!, ...prev]);
      }
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tarefa');
      console.error('TasksContext.createTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [useCloud, useLocal, createTaskCloud, createTaskLocal]);

  const updateTask = useCallback(async (id: number, updates: Partial<CreateTaskData>): Promise<Task | null> => {
    try {
      setLoading(true);
      setError(null);

      let updatedTask: Task | null = null;

      if (useCloud) {
        const updateData: Record<string, unknown> = {
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

        updatedTask = dbRowToTask(data);

        if (updates.linkedNoteId !== undefined) {
          await supabase.from('note_task_links').delete().eq('task_id', id);
          if (updates.linkedNoteId) {
            await supabase.from('note_task_links').insert({
              task_id: id,
              note_id: updates.linkedNoteId,
            });
            updatedTask.linkedNoteId = updates.linkedNoteId;
          }
        }
      }

      if (useLocal) {
        const localUpdated = await updateTaskLocal(id, updates);
        if (!updatedTask) updatedTask = localUpdated;
      }

      if (updatedTask) {
        setTasks(prev => prev.map(t => t.id === id ? updatedTask! : t));
      }
      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
      console.error('TasksContext.updateTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [useCloud, useLocal, updateTaskLocal]);

  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      if (useCloud) {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
      }

      if (useLocal) {
        await deleteTaskLocal(id);
      }

      setTasks(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
      console.error('TasksContext.deleteTask error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [useCloud, useLocal, deleteTaskLocal]);

  const linkTaskToNote = useCallback(async (taskId: number, noteId: number): Promise<boolean> => {
    try {
      setError(null);

      if (useCloud) {
        await supabase.from('note_task_links').delete().eq('task_id', taskId);
        const { error: insertError } = await supabase
          .from('note_task_links')
          .insert({ task_id: taskId, note_id: noteId });
        if (insertError) throw insertError;
      }

      if (useLocal) {
        const electron = getElectron();
        if (electron) await electron.database.linkTaskToNote(taskId, noteId);
      }

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, linkedNoteId: noteId } : t
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular tarefa à nota');
      return false;
    }
  }, [useCloud, useLocal]);

  const unlinkTaskFromNote = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      setError(null);

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

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, linkedNoteId: undefined } : t
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desvincular tarefa da nota');
      return false;
    }
  }, [useCloud, useLocal]);

  // Load initial data once and when storage mode changes
  useEffect(() => {
    getAllTasks();
  }, [getAllTasks]);

  const value = useMemo(() => ({
    tasks,
    stats,
    loading,
    error,
    getAllTasks,
    getTasksByStatus,
    createTask,
    updateTask,
    deleteTask,
    clearError,
    linkTaskToNote,
    unlinkTaskFromNote,
  }), [tasks, stats, loading, error, getAllTasks, getTasksByStatus, createTask, updateTask, deleteTask, clearError, linkTaskToNote, unlinkTaskFromNote]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = (): TasksContextType => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};

export default TasksContext;
