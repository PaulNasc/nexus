import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotes } from '../contexts/NotesContext';
import { useSystemTags } from '../contexts/SystemTagsContext';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  Users,
  Eye,
  Tag,
  Pin,
  Paperclip,
  Activity,
  Notebook,
} from 'lucide-react';

interface MostViewedNote {
  id: number;
  title: string;
  updated_at: string;
}

interface NotesBySystemTag {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  note_count: number;
}

interface NotesMetrics {
  total_notes: number;
  pinned_notes: number;
  attachment_notes: number;
  most_viewed: MostViewedNote[];
  online_users_count: number;
  notes_by_system_tag: NotesBySystemTag[];
}

export const NotesMetricsPanel: React.FC = () => {
  const { activeOrg, members } = useOrganization();
  const { notes } = useNotes();
  const { tags: systemTags } = useSystemTags();
  const { theme } = useTheme();
  const { user, isOffline } = useAuth();
  const { settings } = useSettings();
  const isDark = theme.mode === 'dark';

  const [metrics, setMetrics] = useState<NotesMetrics | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [animateChart, setAnimateChart] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const lastOrgIdRef = useRef<string | null>(activeOrg?.id || null);

  // Determine storage mode (identical to NotesContext)
  const storageMode = settings.storageMode || 'cloud';
  const isAuthenticated = !!user && !isOffline;
  const useCloud = (storageMode === 'cloud' || storageMode === 'hybrid') && isAuthenticated;

  useEffect(() => {
    const activeSystemTags = systemTags.filter(tag => tag.is_active);
    const systemTagById = new Map(activeSystemTags.map(tag => [tag.id, tag]));

    const fetchMetrics = async () => {
      const now = Date.now();
      const orgChanged = lastOrgIdRef.current !== (activeOrg?.id || null);
      
      if (!orgChanged && now - lastFetchTimeRef.current < 10000 && metrics) {
        return;
      }
      
      lastOrgIdRef.current = activeOrg?.id || null;
      lastFetchTimeRef.current = now;

      if (!metrics || orgChanged) {
        setLoading(true);
      }
      
      if (!useCloud) {
        // Local calculation (offline or local storage mode)
        const totalCount = notes.length;
        const pinnedCount = notes.filter(n => n.is_pinned).length;
        const attachmentCount = notes.filter(n => 
          (n.attachedImages && n.attachedImages.length > 0) || 
          (n.attachedVideos && n.attachedVideos.length > 0)
        ).length;

        const recentNotes = [...notes]
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 5)
          .map(note => ({
            id: note.id,
            title: note.title,
            updated_at: note.updated_at || note.created_at,
          }));

        const notesByTag: NotesBySystemTag[] = [];
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
        notesByTag.sort((a, b) => b.note_count - a.note_count);

        // Group local notes by day for the last 7 days
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const countsByDay = last7Days.reduce((acc, day) => {
          acc[day] = 0;
          return acc;
        }, {} as Record<string, number>);

        notes.forEach(note => {
          if (note.created_at) {
            const day = note.created_at.split('T')[0];
            if (day in countsByDay) {
              countsByDay[day]++;
            }
          }
        });

        const localChartData = last7Days.map(day => ({
          date: day,
          count: countsByDay[day]
        }));

        setMetrics({
          total_notes: totalCount,
          pinned_notes: pinnedCount,
          attachment_notes: attachmentCount,
          most_viewed: recentNotes,
          online_users_count: 1,
          notes_by_system_tag: notesByTag,
        });
        setChartData(localChartData);
        setLoading(false);
        return;
      }

      // Cloud calculation (online cloud or hybrid storage mode)
      try {
        // Construct queries
        let metaQuery = supabase
          .from('notes')
          .select('is_pinned, system_tag_id, attached_images, attached_videos, created_at');

        let recentQuery = supabase
          .from('notes')
          .select('id, title, updated_at, created_at')
          .order('updated_at', { ascending: false })
          .limit(5);

        // Apply organization scopes
        if (activeOrg) {
          metaQuery = metaQuery.eq('organization_id', activeOrg.id);
          recentQuery = recentQuery.eq('organization_id', activeOrg.id);
        } else {
          metaQuery = metaQuery.is('organization_id', null);
          recentQuery = recentQuery.is('organization_id', null);
        }

        // Online count query: only count profiles updated in the last 5 minutes
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const onlineCountQuery = activeOrg && members.length > 0
          ? supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .in('id', members.map(m => m.user_id))
              .gte('updated_at', fiveMinsAgo)
          : Promise.resolve({ count: 1 });

        // Run queries in parallel (only 2 DB tables queries)
        const [
          metaRes,
          recentRes,
          onlineCountRes
        ] = await Promise.all([
          metaQuery,
          recentQuery,
          onlineCountQuery
        ]);

        if (metaRes.error) throw metaRes.error;
        if (recentRes.error) throw recentRes.error;

        const metaData = metaRes.data || [];
        const totalCount = metaData.length;
        const pinnedCount = metaData.filter(n => n.is_pinned).length;

        const attachmentCount = metaData.filter(n => 
          (n.attached_images && n.attached_images.length > 0) || 
          (n.attached_videos && n.attached_videos.length > 0)
        ).length;

        const recentNotes = (recentRes.data || []).map(r => ({
          id: r.id,
          title: r.title,
          updated_at: r.updated_at || r.created_at,
        }));

        const notesByTag: NotesBySystemTag[] = [];
        for (const tag of activeSystemTags) {
          const count = metaData.filter(note => note.system_tag_id === tag.id).length;
          if (count > 0) {
            notesByTag.push({
              tag_id: tag.id,
              tag_name: tag.name,
              tag_color: tag.color,
              note_count: count,
            });
          }
        }
        
        // Sort tags by count descending (most used first)
        notesByTag.sort((a, b) => b.note_count - a.note_count);

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const countsByDay = last7Days.reduce((acc, day) => {
          acc[day] = 0;
          return acc;
        }, {} as Record<string, number>);

        metaData.forEach(n => {
          if (n.created_at) {
            const day = n.created_at.split('T')[0];
            if (day in countsByDay) {
              countsByDay[day]++;
            }
          }
        });

        const cloudChartData = last7Days.map(day => ({
          date: day,
          count: countsByDay[day]
        }));

        setMetrics({
          total_notes: totalCount,
          pinned_notes: pinnedCount,
          attachment_notes: attachmentCount,
          most_viewed: recentNotes,
          online_users_count: onlineCountRes.count ?? 0,
          notes_by_system_tag: notesByTag,
        });
        setChartData(cloudChartData);
      } catch (error) {
        console.error('Erro ao buscar métricas da nuvem:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [useCloud, activeOrg, notes, members, systemTags, user, settings.userName]);

  useEffect(() => {
    if (metrics) {
      const timer = setTimeout(() => setAnimateChart(true), 150);
      return () => clearTimeout(timer);
    }
  }, [metrics]);

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{
        padding: '80px 40px',
        textAlign: 'center',
        color: isDark ? '#888' : '#9CA3AF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <BarChart3 size={32} className="pulse-dot" color="var(--color-primary-teal)" />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Carregando dados do Dashboard...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{
        padding: '80px 40px',
        textAlign: 'center',
        color: isDark ? '#888' : '#9CA3AF',
      }}>
        <p>Nenhum dado de Dashboard disponível</p>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(26, 26, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'}`,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(15, 23, 42, 0.05)',
  };

  const statsCards = [
    {
      label: 'Total Notas',
      value: metrics.total_notes,
      icon: <Notebook size={20} />,
      gradient: 'linear-gradient(135deg, #00D4AA 0%, #00876C 100%)',
    },
    {
      label: 'Notas Fixadas',
      value: metrics.pinned_notes,
      icon: <Pin size={20} />,
      gradient: 'linear-gradient(135deg, #7B3FF2 0%, #4c1d95 100%)',
    },
    {
      label: 'Com Anexos',
      value: metrics.attachment_notes,
      icon: <Paperclip size={20} />,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #1e3a8a 100%)',
    },
    {
      label: 'Usuários Online',
      value: metrics.online_users_count,
      icon: <Activity size={20} />,
      gradient: 'linear-gradient(135deg, #EC4899 0%, #9d174d 100%)',
    },
  ];

  const renderChart = () => {
    if (!chartData || chartData.length === 0) return null;

    const maxCount = Math.max(...chartData.map(d => d.count), 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: isDark ? '#FFF' : '#111',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <BarChart3 size={16} color="var(--color-primary-teal)" />
          Atividade Semanal (Notas Criadas)
        </h3>
        
        {/* SVG/CSS Chart */}
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '24px 16px 12px',
          background: isDark ? 'rgba(10, 10, 10, 0.4)' : '#F9FAFB',
          border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
          borderRadius: '8px',
          gap: '12px',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          {chartData.map((d) => {
            const heightPercent = (d.count / maxCount) * 80;
            const formattedDate = new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
            
            return (
              <div key={d.date} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
              }}>
                {/* Tooltip on Hover */}
                <div className="chart-tooltip" style={{
                  position: 'absolute',
                  bottom: `calc(${heightPercent}% + 32px)`,
                  background: 'var(--color-accent-purple)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  opacity: 0,
                  transition: 'opacity 0.2s, transform 0.2s',
                  transform: 'translateY(4px)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                }}>
                  {d.count} {d.count === 1 ? 'nota' : 'notas'}
                </div>

                {/* Animated Bar */}
                <div
                  className="chart-bar"
                  style={{
                    width: '100%',
                    maxWidth: '32px',
                    height: animateChart ? `${heightPercent}%` : '0%',
                    background: 'linear-gradient(180deg, var(--color-primary-teal) 0%, var(--color-accent-purple) 100%)',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.previousSibling as HTMLDivElement;
                    if (tooltip) {
                      tooltip.style.opacity = '1';
                      tooltip.style.transform = 'translateY(0)';
                    }
                    e.currentTarget.style.filter = 'brightness(1.15)';
                    e.currentTarget.style.transform = 'scaleX(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.previousSibling as HTMLDivElement;
                    if (tooltip) {
                      tooltip.style.opacity = '0';
                      tooltip.style.transform = 'translateY(4px)';
                    }
                    e.currentTarget.style.filter = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                />

                {/* Date Label */}
                <span style={{
                  fontSize: '10px',
                  color: isDark ? '#888' : '#6B7280',
                  textAlign: 'center',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                }}>
                  {formattedDate.replace('.', '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CSS Animado Pulsante Keyframes */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .pulse-dot {
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '4px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: isDark ? '#FFF' : '#111',
          marginBottom: '2px',
        }}>
          Dashboard — {activeOrg?.name || 'Pessoal'}
        </h2>
        <p style={{ fontSize: '12px', color: isDark ? '#666' : '#9CA3AF' }}>
          Visão geral de atividades e membros da organização
        </p>
      </div>

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '4px',
      }}>
        {statsCards.map((card, i) => (
          <div key={i} style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
          }}
          className="metric-card"
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = isDark ? '0 12px 36px rgba(0,0,0,0.45)' : '0 12px 36px rgba(15,23,42,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(15, 23, 42, 0.05)';
          }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: card.gradient,
              color: '#fff',
              flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: isDark ? '#777' : '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: isDark ? '#FFF' : '#111', marginTop: '2px' }}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {/* Weekly activity Chart */}
        <div style={cardStyle}>
          {renderChart()}
        </div>

        {/* Recent Notes */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Eye size={14} color="var(--color-primary-teal)" />
            Notas Recentes
          </h3>
          <div className="subtle-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {metrics.most_viewed.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: isDark ? '#666' : '#9CA3AF' }}>
                Nenhuma nota recente encontrada
              </div>
            ) : (
              metrics.most_viewed.slice(0, 5).map((note) => (
                <div key={note.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isDark ? 'rgba(10, 10, 10, 0.4)' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--color-primary-teal)',
                      background: isDark ? 'rgba(0, 212, 170, 0.1)' : 'rgba(0, 212, 170, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(0, 212, 170, 0.2)',
                      flexShrink: 0,
                    }}>
                      #{note.id}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: isDark ? '#CCC' : '#374151',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={note.title}>
                      {note.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>
                    {formatRelativeTime(note.updated_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>



        {/* Notes by System Tag */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Tag size={14} color="var(--color-primary-teal)" />
            Distribuição por Tags
          </h3>
          <div className="subtle-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {metrics.notes_by_system_tag.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: isDark ? '#666' : '#9CA3AF' }}>
                Nenhuma tag de sistema em uso
              </div>
            ) : (
              metrics.notes_by_system_tag.map((tag) => (
                <div key={tag.tag_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isDark ? 'rgba(10, 10, 10, 0.4)' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tag.tag_color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: isDark ? '#CCC' : '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tag.tag_name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isDark ? '#888' : '#6B7280',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}>
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

export default NotesMetricsPanel;
