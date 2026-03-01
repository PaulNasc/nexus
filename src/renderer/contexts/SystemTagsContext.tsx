import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from './OrganizationContext';
import type { OrgSystemTag } from '../../shared/types/systemTag';

const localFallbackKey = (orgId: string) => `nexus-local-system-tags:${orgId}`;
const missingTableFlagKey = (orgId: string) => `nexus-org-system-tags-missing:${orgId}`;

const isMissingOrgSystemTagsTable = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const maybeErr = err as { code?: string; message?: string };
  return (
    maybeErr.code === 'PGRST205'
    || (maybeErr.message || '').toLowerCase().includes('org_system_tags')
  );
};

const loadLocalFallbackTags = (orgId: string): OrgSystemTag[] => {
  try {
    const raw = localStorage.getItem(localFallbackKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrgSystemTag[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalFallbackTags = (orgId: string, tags: OrgSystemTag[]): void => {
  try {
    localStorage.setItem(localFallbackKey(orgId), JSON.stringify(tags));
  } catch {
    // no-op
  }
};

const markMissingOrgSystemTagsTable = (orgId: string): void => {
  try {
    localStorage.setItem(missingTableFlagKey(orgId), '1');
  } catch {
    // no-op
  }
};

const isMissingOrgSystemTagsTableMarked = (orgId: string): boolean => {
  try {
    return localStorage.getItem(missingTableFlagKey(orgId)) === '1';
  } catch {
    return false;
  }
};

const clearMissingOrgSystemTagsTableMark = (orgId: string): void => {
  try {
    localStorage.removeItem(missingTableFlagKey(orgId));
  } catch {
    // no-op
  }
};

interface SystemTagsContextType {
  tags: OrgSystemTag[];
  loading: boolean;
  refresh: () => Promise<void>;
  createTag: (name: string, color: string) => Promise<boolean>;
  updateTag: (id: number, updates: Partial<Pick<OrgSystemTag, 'name' | 'color' | 'is_active'>>) => Promise<boolean>;
  deactivateTag: (id: number) => Promise<boolean>;
}

const SystemTagsContext = createContext<SystemTagsContextType | null>(null);

export const SystemTagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeOrg } = useOrganization();
  const [tags, setTags] = useState<OrgSystemTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshOrgRef = useRef<string>('');

  useEffect(() => {
    if (!activeOrg?.id) {
      setUseLocalFallback(false);
      return;
    }
    setUseLocalFallback(isMissingOrgSystemTagsTableMarked(activeOrg.id));
  }, [activeOrg?.id]);

  const refresh = useCallback(async () => {
    if (!activeOrg?.id) {
      setTags([]);
      return;
    }

    if (refreshInFlightRef.current && lastRefreshOrgRef.current === activeOrg.id) {
      return refreshInFlightRef.current;
    }

    const promise = (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('org_system_tags')
          .select('*')
          .eq('org_id', activeOrg.id)
          .order('is_active', { ascending: false })
          .order('name', { ascending: true });

        if (error) throw error;
        setUseLocalFallback(false);
        clearMissingOrgSystemTagsTableMark(activeOrg.id);
        setTags((data || []) as OrgSystemTag[]);
      } catch (err) {
        if (isMissingOrgSystemTagsTable(err)) {
          setUseLocalFallback(true);
          markMissingOrgSystemTagsTable(activeOrg.id);
          setTags(loadLocalFallbackTags(activeOrg.id));
          return;
        }
        console.error('[SystemTags] Failed to load org system tags:', err);
        setTags([]);
      } finally {
        setLoading(false);
      }
    })();

    lastRefreshOrgRef.current = activeOrg.id;
    refreshInFlightRef.current = promise;

    try {
      await promise;
    } finally {
      if (refreshInFlightRef.current === promise) {
        refreshInFlightRef.current = null;
      }
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeOrg?.id || useLocalFallback) {
      return;
    }

    const channel = supabase
      .channel(`org-system-tags-realtime-${activeOrg.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_system_tags', filter: `org_id=eq.${activeOrg.id}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrg?.id, refresh, useLocalFallback]);

  const createTag = useCallback(async (name: string, color: string): Promise<boolean> => {
    if (!activeOrg?.id) return false;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return false;

      if (useLocalFallback) {
        const now = new Date().toISOString();
        const current = loadLocalFallbackTags(activeOrg.id);
        const nextId = current.length > 0 ? Math.max(...current.map((tag) => tag.id)) + 1 : 1;
        const nextTags = [
          ...current,
          {
            id: nextId,
            org_id: activeOrg.id,
            name: name.trim(),
            color,
            is_active: true,
            created_by: userId,
            created_at: now,
            updated_at: now,
          },
        ];
        saveLocalFallbackTags(activeOrg.id, nextTags);
        setTags(nextTags);
        return true;
      }

      const { error } = await supabase.from('org_system_tags').insert({
        org_id: activeOrg.id,
        name: name.trim(),
        color,
        created_by: userId,
      });

      if (error) throw error;
      clearMissingOrgSystemTagsTableMark(activeOrg.id);
      await refresh();
      return true;
    } catch (err) {
      if (isMissingOrgSystemTagsTable(err)) {
        setUseLocalFallback(true);
        markMissingOrgSystemTagsTable(activeOrg.id);
        const now = new Date().toISOString();
        const current = loadLocalFallbackTags(activeOrg.id);
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return false;
        const nextId = current.length > 0 ? Math.max(...current.map((tag) => tag.id)) + 1 : 1;
        const nextTags = [
          ...current,
          {
            id: nextId,
            org_id: activeOrg.id,
            name: name.trim(),
            color,
            is_active: true,
            created_by: userId,
            created_at: now,
            updated_at: now,
          },
        ];
        saveLocalFallbackTags(activeOrg.id, nextTags);
        setTags(nextTags);
        return true;
      }
      console.error('Failed to create org system tag:', err);
      return false;
    }
  }, [activeOrg?.id, refresh, useLocalFallback]);

  const updateTag = useCallback(async (
    id: number,
    updates: Partial<Pick<OrgSystemTag, 'name' | 'color' | 'is_active'>>,
  ): Promise<boolean> => {
    try {
      if (activeOrg?.id && useLocalFallback) {
        const current = loadLocalFallbackTags(activeOrg.id);
        const next = current.map((tag) => {
          if (tag.id !== id) return tag;
          return {
            ...tag,
            ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
            ...(updates.color !== undefined ? { color: updates.color } : {}),
            ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
            updated_at: new Date().toISOString(),
          };
        });
        saveLocalFallbackTags(activeOrg.id, next);
        setTags(next);
        return true;
      }

      const payload: Partial<Pick<OrgSystemTag, 'name' | 'color' | 'is_active'>> = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;

      const { error } = await supabase
        .from('org_system_tags')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      if (activeOrg?.id) {
        clearMissingOrgSystemTagsTableMark(activeOrg.id);
      }
      await refresh();
      return true;
    } catch (err) {
      if (isMissingOrgSystemTagsTable(err) && activeOrg?.id) {
        setUseLocalFallback(true);
        markMissingOrgSystemTagsTable(activeOrg.id);
        const current = loadLocalFallbackTags(activeOrg.id);
        const next = current.map((tag) => {
          if (tag.id !== id) return tag;
          return {
            ...tag,
            ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
            ...(updates.color !== undefined ? { color: updates.color } : {}),
            ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
            updated_at: new Date().toISOString(),
          };
        });
        saveLocalFallbackTags(activeOrg.id, next);
        setTags(next);
        return true;
      }
      console.error('Failed to update org system tag:', err);
      return false;
    }
  }, [activeOrg?.id, refresh, useLocalFallback]);

  const deactivateTag = useCallback(async (id: number): Promise<boolean> => {
    return updateTag(id, { is_active: false });
  }, [updateTag]);

  const value = useMemo<SystemTagsContextType>(() => ({
    tags,
    loading,
    refresh,
    createTag,
    updateTag,
    deactivateTag,
  }), [tags, loading, refresh, createTag, updateTag, deactivateTag]);

  return <SystemTagsContext.Provider value={value}>{children}</SystemTagsContext.Provider>;
};

export const useSystemTags = (): SystemTagsContextType => {
  const context = useContext(SystemTagsContext);
  if (!context) {
    throw new Error('useSystemTags must be used within a SystemTagsProvider');
  }
  return context;
};
