import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { Category } from '../../shared/types/task';
import { useTasks } from './TasksContext';

interface SupabaseCategoryRow {
  id: number;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_system: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

const dbRowToCategory = (row: SupabaseCategoryRow): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon,
  isSystem: row.is_system,
  order: row.order,
  workspace_id: 1, // kept for backward compatibility with existing UI
  created_at: row.created_at,
  updated_at: row.updated_at,
});

interface CategoriesContextType {
  categories: (Category & { task_count: number })[];
  loading: boolean;
  error: string | null;
  createCategory: (data: Partial<Category>) => Promise<Category | null>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<boolean>;
  reloadCategories: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | null>(null);

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tasks } = useTasks();
  const { settings } = useSettings();
  const { user, isOffline } = useAuth();
  const { activeOrg } = useOrganization();

  // Determine effective storage mode
  const storageMode = settings.storageMode || 'cloud';
  const isAuthenticated = !!user && !isOffline;
  const useCloud = (storageMode === 'cloud' || storageMode === 'hybrid') && isAuthenticated;

  // ── CLOUD (Supabase) ──────────────────────────────────────────
  const loadCategoriesCloud = useCallback(async (): Promise<Category[]> => {
    let query = supabase.from('categories').select('*');
    if (activeOrg) {
      query = query.eq('organization_id', activeOrg.id);
    } else {
      query = query.is('organization_id', null);
    }
    const { data, error: fetchError } = await query.order('order', { ascending: true });

    if (fetchError) throw fetchError;
    return (data || []).map((row: SupabaseCategoryRow) => dbRowToCategory(row));
  }, [activeOrg]);

  // ── LOCAL fallback: return default system categories ──────────
  const loadCategoriesLocal = useCallback(async (): Promise<Category[]> => {
    const now = new Date().toISOString();
    return [
      { id: -1, name: 'Backlog', color: '#6B7280', icon: 'ClipboardList', isSystem: true, order: 1, workspace_id: 1, created_at: now, updated_at: now },
      { id: -2, name: 'Esta Semana', color: '#3B82F6', icon: 'CalendarDays', isSystem: true, order: 2, workspace_id: 1, created_at: now, updated_at: now },
      { id: -3, name: 'Hoje', color: '#F59E0B', icon: 'Zap', isSystem: true, order: 3, workspace_id: 1, created_at: now, updated_at: now },
      { id: -4, name: 'Concluído', color: '#10B981', icon: 'CheckCircle', isSystem: true, order: 4, workspace_id: 1, created_at: now, updated_at: now },
    ];
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let result: Category[] = [];
      if (useCloud) {
        result = await loadCategoriesCloud();
      } else {
        result = await loadCategoriesLocal();
      }
      setCategories(result);
    } catch (err) {
      console.error('CategoriesContext.loadCategories error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
      // Fallback to local defaults
      try {
        const local = await loadCategoriesLocal();
        setCategories(local);
      } catch {
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [useCloud, loadCategoriesCloud, loadCategoriesLocal]);

  const createCategory = useCallback(async (data: Partial<Category>): Promise<Category | null> => {
    try {
      const now = new Date().toISOString();

      if (useCloud) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) throw new Error('Usuário não autenticado');

        const { data: inserted, error: insertError } = await supabase
          .from('categories')
          .insert({
            user_id: userId,
            name: data.name || 'Nova Categoria',
            color: data.color || '#7B3FF2',
            icon: data.icon || 'Folder',
            is_system: false,
            order: categories.length + 1,
            organization_id: activeOrg?.id || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newCategory = dbRowToCategory(inserted as SupabaseCategoryRow);
        setCategories(prev => [...prev, newCategory]);
        return newCategory;
      }

      // Local-only: create in-memory category with negative ID
      const minId = categories.reduce((min, c) => Math.min(min, c.id), 0);
      const newCategory: Category = {
        id: minId - 1,
        name: data.name || 'Nova Categoria',
        color: data.color || '#7B3FF2',
        icon: data.icon || 'Folder',
        isSystem: false,
        order: categories.length + 1,
        workspace_id: 1,
        created_at: now,
        updated_at: now,
      };
      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      console.error('CategoriesContext.createCategory error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria');
      return null;
    }
  }, [categories, useCloud, activeOrg]);

  const updateCategory = useCallback(async (id: number, data: Partial<Category>) => {
    try {
      if (useCloud) {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (data.name !== undefined) updateData.name = data.name;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.icon !== undefined) updateData.icon = data.icon;
        if (data.order !== undefined) updateData.order = data.order;

        const { error: updateError } = await supabase
          .from('categories')
          .update(updateData)
          .eq('id', id);

        if (updateError) throw updateError;
      }

      setCategories(prev => prev.map(cat =>
        cat.id === id ? { ...cat, ...data, updated_at: new Date().toISOString() } : cat
      ));
    } catch (err) {
      console.error('CategoriesContext.updateCategory error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
    }
  }, [useCloud]);

  const deleteCategory = useCallback(async (id: number): Promise<boolean> => {
    try {
      if (useCloud) {
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      }

      setCategories(prev => prev.filter(cat => cat.id !== id));
      return true;
    } catch (err) {
      console.error('CategoriesContext.deleteCategory error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar categoria');
      return false;
    }
  }, [useCloud]);

  // Count tasks per category using centralized task data
  const getTaskCountByCategory = useCallback((category: Category): number => {
    if (!tasks || !Array.isArray(tasks)) return 0;

    if (category.isSystem) {
      const statusMap: Record<string, string> = {
        'Backlog': 'backlog',
        'Esta Semana': 'esta_semana',
        'Hoje': 'hoje',
        'Concluído': 'concluido',
      };
      const targetStatus = statusMap[category.name];
      return tasks.filter(task => task.status === targetStatus).length;
    } else {
      return tasks.filter(task => task.category_id === category.id).length;
    }
  }, [tasks]);

  // Auto-compute task counts
  const categoriesWithCount = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      task_count: getTaskCountByCategory(cat),
    }));
  }, [categories, getTaskCountByCategory]);

  // Load on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Realtime subscription for cloud categories
  useEffect(() => {
    if (!useCloud) return;

    const channel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          const rowOrgId = (newRow as Record<string, unknown>)?.organization_id ?? (oldRow as Record<string, unknown>)?.organization_id ?? null;
          const currentOrgId = activeOrg?.id ?? null;
          if (rowOrgId !== currentOrgId) return;

          if (eventType === 'INSERT') {
            const cat = dbRowToCategory(newRow as unknown as SupabaseCategoryRow);
            setCategories(prev => {
              if (prev.some(c => c.id === cat.id)) return prev;
              return [...prev, cat];
            });
          } else if (eventType === 'UPDATE') {
            const cat = dbRowToCategory(newRow as unknown as SupabaseCategoryRow);
            setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, ...cat } : c));
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRow as Record<string, unknown>)?.id as number;
            if (deletedId) setCategories(prev => prev.filter(c => c.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useCloud, activeOrg]);

  const value = useMemo(() => ({
    categories: categoriesWithCount,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reloadCategories: loadCategories,
  }), [categoriesWithCount, loading, error, createCategory, updateCategory, deleteCategory, loadCategories]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = (): CategoriesContextType => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
};

export default CategoriesContext;
