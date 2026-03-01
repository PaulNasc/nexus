import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Organization, OrgMember, OrgInvite, OrgJoinRequest, OrgRole } from '../../shared/types/organization';
import { useNotifications } from '../hooks/useNotifications';

interface OrganizationContextType {
  // State
  organizations: Organization[];
  activeOrg: Organization | null;
  members: OrgMember[];
  invites: OrgInvite[];
  joinRequests: OrgJoinRequest[];
  myInvites: OrgInvite[];
  myRole: OrgRole | null;
  loading: boolean;

  // Org CRUD
  createOrganization: (name: string, description?: string) => Promise<Organization | null>;
  updateOrganization: (orgId: string, updates: Partial<Pick<Organization, 'name' | 'description' | 'avatar_url'>>) => Promise<boolean>;
  deleteOrganization: (orgId: string) => Promise<boolean>;
  setActiveOrg: (org: Organization | null) => void;

  // Members
  removeMember: (memberId: number) => Promise<boolean>;
  updateMemberRole: (memberId: number, role: OrgRole) => Promise<boolean>;
  leaveOrganization: (orgId: string) => Promise<boolean>;

  // Invites
  inviteMember: (email: string, role?: 'admin' | 'member') => Promise<boolean>;
  cancelInvite: (inviteId: string) => Promise<boolean>;
  acceptInvite: (inviteId: string) => Promise<boolean>;
  declineInvite: (inviteId: string) => Promise<boolean>;

  // Join Requests
  requestToJoin: (orgId: string, message?: string) => Promise<boolean>;
  approveJoinRequest: (requestId: string) => Promise<boolean>;
  rejectJoinRequest: (requestId: string) => Promise<boolean>;
  searchOrgBySlug: (slug: string) => Promise<Organization | null>;

  // Refresh
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

const ACTIVE_ORG_KEY = 'nexus-active-org-id';

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showNotification } = useNotifications();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);
  const [myInvites, setMyInvites] = useState<OrgInvite[]>([]);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Generate slug from name
  const generateSlug = (name: string): string => {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  };

  // Load all orgs the user belongs to
  const loadOrganizations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get org IDs where user is a member
      const { data: memberRows } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id);

      if (!memberRows || memberRows.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const orgIds = memberRows.map(r => r.org_id);
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .order('created_at', { ascending: true });

      setOrganizations((orgs || []) as Organization[]);

      // Restore active org from localStorage (only on first load)
      const savedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
      if (savedOrgId && orgs) {
        const saved = orgs.find((o: Organization) => o.id === savedOrgId);
        if (saved) {
          setActiveOrgState(prev => {
            if (prev?.id === saved.id) return prev;
            return saved as Organization;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load members, invites, join requests for active org
  const loadOrgDetails = useCallback(async (orgId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Members with profile info (use explicit FK hint to avoid ambiguity)
      const { data: memberRows } = await supabase
        .from('org_members')
        .select('*, profiles!org_members_user_id_profiles_fkey(email, display_name, avatar_url)')
        .eq('org_id', orgId);

      const mappedMembers: OrgMember[] = (memberRows || []).map((m: Record<string, unknown>) => {
        const profile = m.profiles as Record<string, unknown> | null;
        return {
          id: m.id as number,
          org_id: m.org_id as string,
          user_id: m.user_id as string,
          role: m.role as OrgRole,
          joined_at: m.joined_at as string,
          email: profile?.email as string || '',
          display_name: profile?.display_name as string || '',
          avatar_url: profile?.avatar_url as string | null,
        };
      });
      setMembers(mappedMembers);

      // My role
      const me = mappedMembers.find(m => m.user_id === user.id);
      setMyRole(me?.role || null);

      // Invites (only if admin/owner)
      if (me?.role === 'owner' || me?.role === 'admin') {
        const { data: inviteRows } = await supabase
          .from('org_invites')
          .select('*')
          .eq('org_id', orgId)
          .eq('status', 'pending');
        setInvites((inviteRows || []) as OrgInvite[]);

        // Join requests
        const { data: requestRows } = await supabase
          .from('org_join_requests')
          .select('*, profiles!org_join_requests_user_id_profiles_fkey(email, display_name)')
          .eq('org_id', orgId)
          .eq('status', 'pending');

        const mappedRequests: OrgJoinRequest[] = (requestRows || []).map((r: Record<string, unknown>) => {
          const profile = r.profiles as Record<string, unknown> | null;
          return {
            id: r.id as string,
            org_id: r.org_id as string,
            user_id: r.user_id as string,
            message: (r.message as string) || '',
            status: r.status as OrgJoinRequest['status'],
            reviewed_by: r.reviewed_by as string | null,
            created_at: r.created_at as string,
            reviewed_at: r.reviewed_at as string | null,
            user_email: profile?.email as string || '',
            user_display_name: profile?.display_name as string || '',
          };
        });
        setJoinRequests(mappedRequests);
      } else {
        setInvites([]);
        setJoinRequests([]);
      }
    } catch (err) {
      console.error('Failed to load org details:', err);
    }
  }, []);

  // Load invites addressed to current user
  const loadMyInvites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: inviteRows } = await supabase
        .from('org_invites')
        .select('*, organizations:org_id(name)')
        .eq('invited_email', user.email)
        .eq('status', 'pending');

      const mapped: OrgInvite[] = (inviteRows || []).map((inv: Record<string, unknown>) => {
        const org = inv.organizations as Record<string, unknown> | null;
        return {
          ...(inv as unknown as OrgInvite),
          org_name: org?.name as string || '',
        };
      });
      setMyInvites(mapped);
    } catch (err) {
      console.error('Failed to load my invites:', err);
    }
  }, []);

  const notifyOrgEvent = useCallback((title: string, body: string, tag: string) => {
    showNotification({
      title,
      body,
      tag,
      requireInteraction: true,
      force: true,
    });
  }, [showNotification]);

  // Init
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setCurrentUserId(user?.id || null);
        setCurrentUserEmail(user?.email || null);
      }

      await Promise.all([loadOrganizations(), loadMyInvites()]);
      if (mounted) initializedRef.current = true;
    };

    void init();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
      setCurrentUserEmail(session?.user?.email || null);
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [loadOrganizations, loadMyInvites]);

  // When active org changes, load its details
  useEffect(() => {
    if (activeOrg) {
      loadOrgDetails(activeOrg.id);
    } else {
      setMembers([]);
      setInvites([]);
      setJoinRequests([]);
      setMyRole(null);
    }
  }, [activeOrg, loadOrgDetails]);

  // Realtime: active org scope (members, invites, join requests, org settings)
  useEffect(() => {
    if (!activeOrg) return;

    let orgDetailsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleOrgDetailsRefresh = () => {
      if (orgDetailsRefreshTimer) {
        clearTimeout(orgDetailsRefreshTimer);
      }
      orgDetailsRefreshTimer = setTimeout(() => {
        void loadOrgDetails(activeOrg.id);
      }, 120);
    };

    const membersChannel = supabase
      .channel(`org-members-realtime-${activeOrg.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_members', filter: `org_id=eq.${activeOrg.id}` },
        () => {
          scheduleOrgDetailsRefresh();
        }
      )
      .subscribe();

    const invitesChannel = supabase
      .channel(`org-invites-realtime-${activeOrg.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_invites', filter: `org_id=eq.${activeOrg.id}` },
        (payload) => {
          if (initializedRef.current && payload.eventType === 'INSERT') {
            const inserted = payload.new as Record<string, unknown>;
            const email = typeof inserted.invited_email === 'string' ? inserted.invited_email : 'novo membro';
            const invitedBy = typeof inserted.invited_by === 'string' ? inserted.invited_by : '';
            if (invitedBy && invitedBy !== currentUserId) {
              notifyOrgEvent('Novo convite na organização', `Convite enviado para ${email}.`, `org-invite-${activeOrg.id}`);
            }
          }
          scheduleOrgDetailsRefresh();
          void loadMyInvites();
        }
      )
      .subscribe();

    const joinRequestsChannel = supabase
      .channel(`org-join-requests-realtime-${activeOrg.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_join_requests', filter: `org_id=eq.${activeOrg.id}` },
        (payload) => {
          if (initializedRef.current && payload.eventType === 'INSERT') {
            const inserted = payload.new as Record<string, unknown>;
            const message = typeof inserted.message === 'string' ? inserted.message : '';
            notifyOrgEvent('Nova solicitação de entrada', message || 'Uma nova solicitação foi enviada para sua organização.', `org-join-request-${activeOrg.id}`);
          }

          if (initializedRef.current && payload.eventType === 'UPDATE') {
            const updated = payload.new as Record<string, unknown>;
            const status = typeof updated.status === 'string' ? updated.status : '';
            const requesterId = typeof updated.user_id === 'string' ? updated.user_id : '';
            if (requesterId === currentUserId && (status === 'approved' || status === 'rejected')) {
              notifyOrgEvent(
                status === 'approved' ? 'Solicitação aprovada' : 'Solicitação rejeitada',
                `Sua solicitação para entrar em ${activeOrg.name} foi ${status === 'approved' ? 'aprovada' : 'rejeitada'}.`,
                `org-join-request-result-${activeOrg.id}`,
              );
            }
          }

          scheduleOrgDetailsRefresh();
        }
      )
      .subscribe();

    const orgChannel = supabase
      .channel(`organization-realtime-${activeOrg.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations', filter: `id=eq.${activeOrg.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Organization;
            setOrganizations(prev => prev.map(o => o.id === activeOrg.id ? { ...o, ...updated } : o));
            setActiveOrgState(prev => prev && prev.id === activeOrg.id ? { ...prev, ...updated } : prev);

            if (initializedRef.current) {
              notifyOrgEvent('Configurações da organização atualizadas', `A organização ${updated.name || activeOrg.name} foi atualizada em outro dispositivo.`, `org-updated-${activeOrg.id}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (orgDetailsRefreshTimer) {
        clearTimeout(orgDetailsRefreshTimer);
      }
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(invitesChannel);
      supabase.removeChannel(joinRequestsChannel);
      supabase.removeChannel(orgChannel);
    };
  }, [activeOrg, currentUserId, loadMyInvites, loadOrgDetails, notifyOrgEvent]);

  // Realtime: user-scoped org membership/invites across all orgs (works even when no active org)
  useEffect(() => {
    if (!currentUserId && !currentUserEmail) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];
    let organizationsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let myInvitesRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleOrganizationsRefresh = () => {
      if (organizationsRefreshTimer) {
        clearTimeout(organizationsRefreshTimer);
      }
      organizationsRefreshTimer = setTimeout(() => {
        void loadOrganizations();
      }, 120);
    };

    const scheduleMyInvitesRefresh = () => {
      if (myInvitesRefreshTimer) {
        clearTimeout(myInvitesRefreshTimer);
      }
      myInvitesRefreshTimer = setTimeout(() => {
        void loadMyInvites();
      }, 120);
    };

    if (currentUserId) {
      const membershipChannel = supabase
        .channel(`org-membership-self-${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'org_members', filter: `user_id=eq.${currentUserId}` },
          () => {
            scheduleOrganizationsRefresh();
          }
        )
        .subscribe();
      channels.push(membershipChannel);
    }

    if (currentUserEmail) {
      const inviteChannel = supabase
        .channel(`org-my-invites-${currentUserEmail}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'org_invites', filter: `invited_email=eq.${currentUserEmail}` },
          (payload) => {
            if (initializedRef.current) {
              const inserted = payload.new as Record<string, unknown>;
              const status = typeof inserted.status === 'string' ? inserted.status : 'pending';

              if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && status === 'pending')) {
                notifyOrgEvent('Você recebeu um convite', 'Há um novo convite de organização aguardando sua ação.', 'org-my-invite');
              }
            }

            scheduleMyInvitesRefresh();
            scheduleOrganizationsRefresh();
          }
        )
        .subscribe();
      channels.push(inviteChannel);
    }

    return () => {
      if (organizationsRefreshTimer) {
        clearTimeout(organizationsRefreshTimer);
      }
      if (myInvitesRefreshTimer) {
        clearTimeout(myInvitesRefreshTimer);
      }
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [currentUserEmail, currentUserId, loadMyInvites, loadOrganizations, notifyOrgEvent]);

  const setActiveOrg = useCallback((org: Organization | null) => {
    // Skip if already the same org (avoid unnecessary re-renders)
    setActiveOrgState(prev => {
      if (prev?.id === org?.id) return prev;
      if (org) {
        localStorage.setItem(ACTIVE_ORG_KEY, org.id);
      } else {
        localStorage.removeItem(ACTIVE_ORG_KEY);
      }
      return org;
    });
  }, []);

  const refreshOrganizations = useCallback(async () => {
    await loadOrganizations();
    await loadMyInvites();
    if (activeOrg) {
      await loadOrgDetails(activeOrg.id);
    }
  }, [loadOrganizations, loadMyInvites, loadOrgDetails, activeOrg]);

  // === CRUD ===

  const createOrganization = useCallback(async (name: string, description?: string): Promise<Organization | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Limit: max 2 orgs owned per user
      const { count: ownedCount } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if ((ownedCount ?? 0) >= 2) {
        throw new Error('Você já atingiu o limite de 2 organizações criadas.');
      }

      const slug = generateSlug(name);

      const { data: org, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          description: description || '',
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner member
      await supabase.from('org_members').insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner',
      });

      // Seed default categories for the new org
      const defaultCategories = [
        { name: name, color: '#7B3FF2', icon: 'Users', is_system: true, is_shared: true, order: 0 },
        { name: 'Backlog', color: '#6B7280', icon: 'ClipboardList', is_system: true, is_shared: false, order: 1 },
        { name: 'Esta Semana', color: '#3B82F6', icon: 'CalendarDays', is_system: true, is_shared: false, order: 2 },
        { name: 'Hoje', color: '#F59E0B', icon: 'Zap', is_system: true, is_shared: false, order: 3 },
        { name: 'Concluído', color: '#10B981', icon: 'CheckCircle', is_system: true, is_shared: false, order: 4 },
      ];
      await supabase.from('categories').insert(
        defaultCategories.map(c => ({ ...c, user_id: user.id, organization_id: org.id }))
      );

      // Seed sample markdown note
      const sampleNote = {
        user_id: user.id,
        organization_id: org.id,
        title: `Bem-vindo à ${name}`,
        content: `# Bem-vindo à ${name} 🎉\n\nEsta é a sua nova organização. Aqui estão os recursos de **Markdown** suportados:\n\n## Formatação de Texto\n- **Negrito** com \\*\\*texto\\*\\*\n- *Itálico* com \\*texto\\*\n- ~~Tachado~~ com \\~\\~texto\\~\\~\n- \`Código inline\` com \\\`texto\\\`\n\n## Listas\n1. Lista ordenada\n2. Segundo item\n   - Sub-item\n\n- [ ] Tarefa pendente\n- [x] Tarefa concluída\n\n## Blocos de Código\n\\\`\\\`\\\`javascript\nconst hello = "Olá, mundo!";\nconsole.log(hello);\n\\\`\\\`\\\`\n\n## Citações\n> Esta é uma citação de exemplo.\n\n## Links e Imagens\n[Link de exemplo](https://exemplo.com)\n\n---\n\n*Edite ou exclua esta nota quando quiser. Bom trabalho em equipe!*`,
        format: 'markdown',
        tags: ['boas-vindas', 'markdown'],
        is_pinned: true,
      };
      await supabase.from('notes').insert(sampleNote);

      const created = org as Organization;
      setOrganizations(prev => [...prev, created]);
      setActiveOrg(created);
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar organização';
      console.error('Failed to create organization:', msg);
      throw new Error(msg);
    }
  }, [setActiveOrg]);

  const updateOrganization = useCallback(async (orgId: string, updates: Partial<Pick<Organization, 'name' | 'description' | 'avatar_url'>>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', orgId);

      if (error) throw error;

      setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, ...updates } : o));
      if (activeOrg?.id === orgId) {
        setActiveOrgState(prev => prev ? { ...prev, ...updates } : prev);
      }
      return true;
    } catch (err) {
      console.error('Failed to update organization:', err);
      return false;
    }
  }, [activeOrg]);

  const deleteOrganization = useCallback(async (orgId: string): Promise<boolean> => {
    try {
      // Delete all org data first (tasks, notes, categories, timer_stats, invites, join requests, members)
      await supabase.from('tasks').delete().eq('organization_id', orgId);
      await supabase.from('notes').delete().eq('organization_id', orgId);
      await supabase.from('categories').delete().eq('organization_id', orgId);
      await supabase.from('timer_stats').delete().eq('organization_id', orgId);
      await supabase.from('org_invites').delete().eq('org_id', orgId);
      await supabase.from('org_join_requests').delete().eq('org_id', orgId);
      await supabase.from('org_members').delete().eq('org_id', orgId);

      const { error } = await supabase.from('organizations').delete().eq('id', orgId);
      if (error) throw error;

      setOrganizations(prev => prev.filter(o => o.id !== orgId));
      if (activeOrg?.id === orgId) {
        setActiveOrg(null);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete organization:', err);
      return false;
    }
  }, [activeOrg, setActiveOrg]);

  // === MEMBERS ===

  const removeMember = useCallback(async (memberId: number): Promise<boolean> => {
    try {
      const { error } = await supabase.from('org_members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      return true;
    } catch (err) {
      console.error('Failed to remove member:', err);
      return false;
    }
  }, []);

  const updateMemberRole = useCallback(async (memberId: number, role: OrgRole): Promise<boolean> => {
    try {
      const { error } = await supabase.from('org_members').update({ role }).eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
      return true;
    } catch (err) {
      console.error('Failed to update member role:', err);
      return false;
    }
  }, []);

  const leaveOrganization = useCallback(async (orgId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('org_id', orgId)
        .eq('user_id', user.id);

      if (error) throw error;

      // The DB trigger (cleanup_empty_org) auto-deletes the org + data
      // if this was the last member. Client just needs to update local state.
      setOrganizations(prev => prev.filter(o => o.id !== orgId));
      if (activeOrg?.id === orgId) {
        setActiveOrg(null);
      }
      return true;
    } catch (err) {
      console.error('Failed to leave organization:', err);
      return false;
    }
  }, [activeOrg, setActiveOrg]);

  // === INVITES ===

  const inviteMember = useCallback(async (email: string, role: 'admin' | 'member' = 'member'): Promise<boolean> => {
    try {
      if (!activeOrg) return false;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('org_invites').insert({
        org_id: activeOrg.id,
        invited_email: email.toLowerCase().trim(),
        invited_by: user.id,
        role,
      });

      if (error) throw error;
      await loadOrgDetails(activeOrg.id);
      return true;
    } catch (err) {
      console.error('Failed to invite member:', err);
      return false;
    }
  }, [activeOrg, loadOrgDetails]);

  const cancelInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('org_invites').delete().eq('id', inviteId);
      if (error) throw error;
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      return true;
    } catch (err) {
      console.error('Failed to cancel invite:', err);
      return false;
    }
  }, []);

  const acceptInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get invite details
      const { data: invite } = await supabase
        .from('org_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (!invite) return false;

      // Add user as member
      await supabase.from('org_members').insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
      });

      // Update invite status
      await supabase
        .from('org_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      await loadOrganizations();
      await loadMyInvites();
      return true;
    } catch (err) {
      console.error('Failed to accept invite:', err);
      return false;
    }
  }, [loadOrganizations, loadMyInvites]);

  const declineInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      await supabase
        .from('org_invites')
        .update({ status: 'declined' })
        .eq('id', inviteId);

      setMyInvites(prev => prev.filter(i => i.id !== inviteId));
      return true;
    } catch (err) {
      console.error('Failed to decline invite:', err);
      return false;
    }
  }, []);

  // === JOIN REQUESTS ===

  const searchOrgBySlug = useCallback(async (slug: string): Promise<Organization | null> => {
    try {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug.toLowerCase().trim())
        .single();

      return data as Organization | null;
    } catch {
      return null;
    }
  }, []);

  const requestToJoin = useCallback(async (orgId: string, message?: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('org_join_requests').insert({
        org_id: orgId,
        user_id: user.id,
        message: message || '',
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to request to join:', err);
      return false;
    }
  }, []);

  const approveJoinRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('org_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      if (!request) return false;

      // Idempotency: if already approved, just refresh local state
      if (request.status === 'approved') {
        setJoinRequests(prev => prev.filter(r => r.id !== requestId));
        if (activeOrg) await loadOrgDetails(activeOrg.id);
        return true;
      }

      // Add user as member (idempotent to avoid UNIQUE(org_id, user_id) conflicts)
      const { error: upsertMemberError } = await supabase.from('org_members').upsert({
        org_id: request.org_id,
        user_id: request.user_id,
        role: 'member',
      }, {
        onConflict: 'org_id,user_id',
        ignoreDuplicates: true,
      });

      if (upsertMemberError) throw upsertMemberError;

      // Keep only one approved row per (org_id, user_id) to satisfy UNIQUE(org_id, user_id, status)
      const { error: cleanupApprovedError } = await supabase
        .from('org_join_requests')
        .delete()
        .eq('org_id', request.org_id)
        .eq('user_id', request.user_id)
        .eq('status', 'approved')
        .neq('id', requestId);

      if (cleanupApprovedError) throw cleanupApprovedError;

      // Update request status
      const { error: updateRequestError } = await supabase
        .from('org_join_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateRequestError) throw updateRequestError;

      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      if (activeOrg) await loadOrgDetails(activeOrg.id);
      return true;
    } catch (err) {
      console.error('Failed to approve join request:', err);
      return false;
    }
  }, [activeOrg, loadOrgDetails]);

  const rejectJoinRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      await supabase
        .from('org_join_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      return true;
    } catch (err) {
      console.error('Failed to reject join request:', err);
      return false;
    }
  }, []);

  const contextValue = useMemo(() => ({
    organizations,
    activeOrg,
    members,
    invites,
    joinRequests,
    myInvites,
    myRole,
    loading,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    setActiveOrg,
    removeMember,
    updateMemberRole,
    leaveOrganization,
    inviteMember,
    cancelInvite,
    acceptInvite,
    declineInvite,
    requestToJoin,
    approveJoinRequest,
    rejectJoinRequest,
    searchOrgBySlug,
    refreshOrganizations,
  }), [
    organizations, activeOrg, members, invites, joinRequests, myInvites, myRole, loading,
    createOrganization, updateOrganization, deleteOrganization, setActiveOrg,
    removeMember, updateMemberRole, leaveOrganization,
    inviteMember, cancelInvite, acceptInvite, declineInvite,
    requestToJoin, approveJoinRequest, rejectJoinRequest, searchOrgBySlug, refreshOrganizations,
  ]);

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
