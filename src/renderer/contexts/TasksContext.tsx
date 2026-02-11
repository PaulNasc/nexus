import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
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
  assigned_to: (row.assigned_to as string) ?? undefined,
  assigned_by: (row.assigned_by as string) ?? undefined,
  is_hidden_from_org: (row.is_hidden_from_org as boolean) ?? false,
  progress_status: (row.progress_status as string) ?? undefined,
  progress_updated_by: (row.progress_updated_by as string) ?? undefined,
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
  hideTaskFromOrg: (taskId: number) => Promise<boolean>;
  moveToPersonal: (taskId: number) => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | null>(null);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
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
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;

    if (activeOrg && currentUserId) {
      // Fetch user's own tasks in this org
      const { data: ownTasks, error: ownErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      if (ownErr) throw ownErr;

      // Fetch shared category IDs for this org
      const { data: sharedCats } = await supabase
        .from('categories')
        .select('id')
        .eq('organization_id', activeOrg.id)
        .eq('is_shared', true);
      const sharedCatIds = (sharedCats || []).map(c => c.id);

      let sharedTasks: Record<string, unknown>[] = [];
      if (sharedCatIds.length > 0) {
        // Fetch tasks in shared categories (from all users, excluding hidden ones from others)
        const { data: shared, error: sharedErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('organization_id', activeOrg.id)
          .in('category_id', sharedCatIds)
          .order('created_at', { ascending: false });
        if (sharedErr) throw sharedErr;
        // Filter out tasks hidden by other users
        sharedTasks = (shared || []).filter((t: Record<string, unknown>) =>
          t.user_id === currentUserId || !t.is_hidden_from_org
        );
      }

      // Merge and deduplicate
      const allRows = [...(ownTasks || []), ...sharedTasks];
      const seen = new Set<number>();
      const deduped: Record<string, unknown>[] = [];
      for (const row of allRows) {
        const id = row.id as number;
        if (!seen.has(id)) {
          seen.add(id);
          deduped.push(row);
        }
      }

      const mapped = deduped.map(dbRowToTask);

      // Resolve note links
      const { data: links } = await supabase
        .from('note_task_links')
        .select('task_id, note_id');
      if (links) {
        const linkMap = new Map<number, number>();
        for (const link of links) linkMap.set(link.task_id, link.note_id);
        for (const task of mapped) task.linkedNoteId = linkMap.get(task.id);
      }

      return mapped;
    } else {
      // No org: fetch personal tasks only
      let query = supabase.from('tasks').select('*');
      if (currentUserId) {
        query = query.eq('user_id', currentUserId);
      }
      query = query.is('organization_id', null);
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      if (fetchError) throw fetchError;

      const mapped = (data || []).map(dbRowToTask);

      const { data: links } = await supabase
        .from('note_task_links')
        .select('task_id, note_id');
      if (links) {
        const linkMap = new Map<number, number>();
        for (const link of links) linkMap.set(link.task_id, link.note_id);
        for (const task of mapped) task.linkedNoteId = linkMap.get(task.id);
      }

      return mapped;
    }
  }, [activeOrg]);

  const createTaskCloud = useCallback(async (taskData: CreateTaskData): Promise<Task | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error('Usuário não autenticado');

    const insertData: Record<string, unknown> = {
      user_id: userId,
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status || 'backlog',
      priority: priorityToNumber(taskData.priority),
      category_id: taskData.category_id || null,
      due_date: taskData.due_date || null,
      organization_id: activeOrg?.id || null,
    };

    // Se atribuída a outro usuário, setar assigned_by e assigned_to
    if (taskData.assigned_to) {
      insertData.assigned_to = taskData.assigned_to;
      insertData.assigned_by = userId;
    }

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
  }, [activeOrg]);

  // ── PUBLIC API ────────────────────────────────────────────────
  const getAllTasks = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true);
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
      initialLoadDone.current = true;
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

  // Toggle hide task from org (for assigned tasks)
  const hideTaskFromOrg = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      setError(null);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return false;
      const newValue = !task.is_hidden_from_org;

      if (useCloud) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ is_hidden_from_org: newValue, updated_at: new Date().toISOString() })
          .eq('id', taskId);
        if (updateError) throw updateError;
      }

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, is_hidden_from_org: newValue } : t
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ocultar tarefa');
      return false;
    }
  }, [useCloud, tasks]);

  // Move task from shared category to personal (Backlog)
  const moveToPersonal = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) return false;

      // Find the user's Backlog category
      let backlogCatId: number | null = null;
      if (useCloud && activeOrg) {
        const { data: cats } = await supabase
          .from('categories')
          .select('id')
          .eq('organization_id', activeOrg.id)
          .eq('name', 'Backlog')
          .eq('is_system', true)
          .eq('is_shared', false)
          .limit(1);
        backlogCatId = cats?.[0]?.id ?? null;
      }

      const updateData: Record<string, unknown> = {
        category_id: backlogCatId,
        status: 'backlog',
        user_id: currentUserId,
        updated_at: new Date().toISOString(),
      };

      if (useCloud) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId);
        if (updateError) throw updateError;
      }

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, category_id: backlogCatId ?? undefined, status: 'backlog' as const } : t
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mover tarefa');
      return false;
    }
  }, [useCloud, activeOrg]);

  // Load initial data once and when storage mode changes
  useEffect(() => {
    getAllTasks();
  }, [getAllTasks]);

  // Realtime subscription for cloud tasks
  useEffect(() => {
    if (!useCloud) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          // Filter: only process rows matching current org scope
          const rowOrgId = (newRow as Record<string, unknown>)?.organization_id ?? (oldRow as Record<string, unknown>)?.organization_id ?? null;
          const currentOrgId = activeOrg?.id ?? null;
          if (rowOrgId !== currentOrgId) return;

          if (eventType === 'INSERT') {
            const task = dbRowToTask(newRow as Record<string, unknown>);
            setTasks(prev => {
              if (prev.some(t => t.id === task.id)) return prev;
              return [task, ...prev];
            });
          } else if (eventType === 'UPDATE') {
            const task = dbRowToTask(newRow as Record<string, unknown>);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRow as Record<string, unknown>)?.id as number;
            if (deletedId) setTasks(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useCloud, activeOrg]);

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
    hideTaskFromOrg,
    moveToPersonal,
  }), [tasks, stats, loading, error, getAllTasks, getTasksByStatus, createTask, updateTask, deleteTask, clearError, linkTaskToNote, unlinkTaskFromNote, hideTaskFromOrg, moveToPersonal]);

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
