import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../../shared/types/task';

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

export const useSupabaseCategories = (tasks?: { id: number; status: string; category_id?: number }[]) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map((row: SupabaseCategoryRow) => dbRowToCategory(row));
      setCategories(mapped);
    } catch (err) {
      console.error('useSupabaseCategories.loadCategories error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (data: Partial<Category>): Promise<Category | null> => {
    try {
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
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newCategory = dbRowToCategory(inserted as SupabaseCategoryRow);
      setCategories(prev => [...prev, newCategory]);

      window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: [...categories, newCategory] }));
      return newCategory;
    } catch (err) {
      console.error('useSupabaseCategories.createCategory error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria');
      return null;
    }
  }, [categories]);

  const updateCategory = useCallback(async (id: number, data: Partial<Category>) => {
    try {
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

      setCategories(prev => prev.map(cat =>
        cat.id === id ? { ...cat, ...data, updated_at: new Date().toISOString() } : cat
      ));
    } catch (err) {
      console.error('useSupabaseCategories.updateCategory error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
    }
  }, []);

  const deleteCategory = useCallback(async (id: number): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCategories(prev => prev.filter(cat => cat.id !== id));
      return true;
    } catch (err) {
      console.error('useSupabaseCategories.deleteCategory error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar categoria');
      return false;
    }
  }, []);

  // Count tasks per category using real-time task data
  const getTaskCountByCategory = useCallback((categoryId: number): number => {
    if (!tasks || !Array.isArray(tasks)) return 0;

    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return 0;

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
      return tasks.filter(task => task.category_id === categoryId).length;
    }
  }, [categories, tasks]);

  // Auto-compute task counts
  const categoriesWithCount = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      task_count: getTaskCountByCategory(cat.id),
    }));
  }, [categories, getTaskCountByCategory, tasks]);

  // Load on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Listen for task update events to recalculate counts
  useEffect(() => {
    const handler = () => {
      setCategories(prev => [...prev]); // force re-render
    };
    window.addEventListener('tasksUpdated', handler);
    return () => { window.removeEventListener('tasksUpdated', handler); };
  }, []);

  return {
    categories: categoriesWithCount,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reloadCategories: loadCategories,
  };
};

export default useSupabaseCategories;
