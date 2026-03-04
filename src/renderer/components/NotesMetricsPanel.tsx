import React, { useEffect, useState, useMemo } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotes } from '../contexts/NotesContext';
import { useSystemTags } from '../contexts/SystemTagsContext';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  Users,
  Eye,
  Tag,
} from 'lucide-react';

interface MostViewedNote {
  id: number;
  title: string;
  view_count: number;
}

interface UserLastOnline {
  user_id: string;
  display_name: string;
  email: string;
  last_seen: string;
}

interface NotesBySystemTag {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  note_count: number;
}

interface NotesMetrics {
  total_notes: number;
  most_viewed: MostViewedNote[];
  users_last_online: UserLastOnline[];
  notes_by_system_tag: NotesBySystemTag[];
}

export const NotesMetricsPanel: React.FC = () => {
  const { activeOrg, myRole, members } = useOrganization();
  const { notes } = useNotes();
  const { tags: systemTags } = useSystemTags();
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const [metrics, setMetrics] = useState<NotesMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se usuário é admin da organização
  const isOrgAdmin = useMemo(() => {
    return activeOrg && (myRole === 'admin' || myRole === 'owner');
  }, [activeOrg, myRole]);

  useEffect(() => {
    if (!isOrgAdmin || !activeOrg) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // Most viewed notes (simulated - would need view tracking table)
        const mostViewed: MostViewedNote[] = notes
          .slice(0, 5)
          .map((note, idx) => ({
            id: note.id,
            title: note.title,
            view_count: Math.max(1, 50 - idx * 10), // Mock view count
          }));

        // Users last online
        const usersLastOnline: UserLastOnline[] = [];
        for (const member of members.slice(0, 10)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('last_seen_at')
            .eq('id', member.user_id)
            .single();
          
          usersLastOnline.push({
            user_id: member.user_id,
            display_name: member.display_name || 'Usuário',
            email: member.email || '',
            last_seen: profile?.last_seen_at || new Date().toISOString(),
          });
        }

        // Notes by system tag
        const notesByTag: NotesBySystemTag[] = [];
        const activeSystemTags = systemTags.filter(tag => tag.is_active);
        for (const tag of activeSystemTags) {
          const count = notes.filter(note => note.system_tag_id === tag.id).length;
          if (count > 0) {
            notesByTag.push({
              tag_id: tag.id,
              tag_name: tag.name,
              tag_color: tag.color,
              note_count: count,
            });
          }
        }

        setMetrics({
          total_notes: notes.length,
          most_viewed: mostViewed,
          users_last_online: usersLastOnline,
          notes_by_system_tag: notesByTag,
        });
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [isOrgAdmin, activeOrg, notes, members, systemTags]);

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Online';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (!isOrgAdmin) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: isDark ? '#888' : '#9CA3AF',
      }}>
        <BarChart3 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: isDark ? '#FFF' : '#111' }}>
          Acesso Restrito
        </h3>
        <p style={{ fontSize: '14px' }}>
          Apenas administradores da organização podem visualizar as métricas.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: isDark ? '#888' : '#9CA3AF',
      }}>
        <BarChart3 size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <p>Carregando métricas...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: isDark ? '#888' : '#9CA3AF',
      }}>
        <p>Nenhuma métrica disponível</p>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: isDark ? '#1A1A1A' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
    borderRadius: '8px',
    padding: '14px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: isDark ? '#FFF' : '#111',
          marginBottom: '2px',
        }}>
          Métricas — {activeOrg?.name}
        </h2>
        <p style={{ fontSize: '12px', color: isDark ? '#666' : '#9CA3AF' }}>
          {metrics?.total_notes || 0} notas na organização
        </p>
      </div>

      {/* Compact Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
      }}>

        {/* Most Viewed Notes */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Eye size={14} color="#00D4AA" />
            Notas Mais Visualizadas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {metrics.most_viewed.slice(0, 5).map((note) => (
              <div key={note.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '4px',
                background: isDark ? '#0A0A0A' : '#F9FAFB',
              }}>
                <span style={{ fontSize: '12px', color: isDark ? '#CCC' : '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  #{note.id} {note.title}
                </span>
                <span style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>
                  {note.view_count} views
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Users Last Online */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Users size={14} color="#00D4AA" />
            Última Vez Online
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {metrics.users_last_online.slice(0, 8).map((user) => (
              <div key={user.user_id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '4px',
                background: isDark ? '#0A0A0A' : '#F9FAFB',
              }}>
                <span style={{ fontSize: '12px', color: isDark ? '#CCC' : '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name}
                </span>
                <span style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>
                  {formatRelativeTime(user.last_seen)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes by System Tag */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Tag size={14} color="#00D4AA" />
            Notas por Tag de Sistema
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {metrics.notes_by_system_tag.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: isDark ? '#666' : '#9CA3AF' }}>
                Nenhuma tag de sistema em uso
              </div>
            ) : (
              metrics.notes_by_system_tag.map((tag) => (
                <div key={tag.tag_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: isDark ? '#0A0A0A' : '#F9FAFB',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tag.tag_color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: isDark ? '#CCC' : '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tag.tag_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>
                    {tag.note_count} {tag.note_count === 1 ? 'nota' : 'notas'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
