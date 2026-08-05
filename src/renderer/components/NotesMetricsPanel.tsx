import React, { useState, useMemo, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotes } from '../contexts/NotesContext';
import { useSystemTags } from '../contexts/SystemTagsContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../contexts/ToastContext';
import {
  BarChart3,
  Eye,
  Tag,
  Pin,
  Paperclip,
  Activity,
  Notebook,
  Copy,
  Download,
  Check,
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

export const NotesMetricsPanel: React.FC = () => {
  const { activeOrg, members } = useOrganization();
  const { notes } = useNotes();
  const { tags: systemTags } = useSystemTags();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const [copiedMd, setCopiedMd] = useState(false);

  // Compute metrics synchronously in 0ms from in-memory notes
  const metrics = useMemo(() => {
    const total_notes = notes.length;
    const pinned_notes = notes.filter(n => n.is_pinned).length;
    const attachment_notes = notes.filter(n =>
      (n.attachedImages && n.attachedImages.length > 0) ||
      (n.attachedVideos && n.attachedVideos.length > 0)
    ).length;

    const most_viewed: MostViewedNote[] = [...notes]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 5)
      .map(note => ({
        id: note.id,
        title: note.title,
        updated_at: note.updated_at || note.created_at,
      }));

    // Map system tag names to colors for fast lookup
    const tagColorByName = new Map<string, string>();
    const tagIdByName = new Map<string, number>();
    systemTags.forEach(st => {
      tagColorByName.set(st.name.toLowerCase(), st.color);
      tagIdByName.set(st.name.toLowerCase(), st.id);
    });

    const tagCounts = new Map<string, { id: number; name: string; color: string; count: number }>();
    let untaggedCount = 0;

    notes.forEach(note => {
      const noteTagNames = new Set<string>();

      // System tag ID link
      if (note.system_tag_id) {
        const sysTag = systemTags.find(st => st.id === note.system_tag_id);
        if (sysTag) {
          noteTagNames.add(sysTag.name);
        }
      }

      // String tags array (e.g. note.tags = ['Interno', 'pdf-importado'])
      if (note.tags && Array.isArray(note.tags) && note.tags.length > 0) {
        note.tags.forEach(t => {
          if (t && typeof t === 'string' && t.trim()) {
            noteTagNames.add(t.trim());
          }
        });
      }

      if (noteTagNames.size === 0) {
        untaggedCount++;
      } else {
        noteTagNames.forEach(tagName => {
          const key = tagName.toLowerCase();
          const existing = tagCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            const color = tagColorByName.get(key) || '#00D4AA';
            const id = tagIdByName.get(key) || Math.abs(key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
            tagCounts.set(key, { id, name: tagName, color, count: 1 });
          }
        });
      }
    });

    const notes_by_system_tag: NotesBySystemTag[] = Array.from(tagCounts.values())
      .map(item => ({
        tag_id: item.id,
        tag_name: item.name,
        tag_color: item.color,
        note_count: item.count,
      }))
      .sort((a, b) => b.note_count - a.note_count);

    if (untaggedCount > 0) {
      notes_by_system_tag.push({
        tag_id: -1,
        tag_name: 'Sem Tag',
        tag_color: '#6B7280',
        note_count: untaggedCount,
      });
    }

    return {
      total_notes,
      pinned_notes,
      attachment_notes,
      most_viewed,
      online_users_count: Math.max(1, members.length),
      notes_by_system_tag,
    };
  }, [notes, systemTags, members]);

  // Compute 7-day activity chart synchronously
  const chartData = useMemo(() => {
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

    return last7Days.map(day => ({
      date: day,
      count: countsByDay[day]
    }));
  }, [notes]);

  const maxCount = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);

  const generateMarkdownReport = useCallback((): string => {
    const nowStr = new Date().toLocaleString('pt-BR');
    const orgName = activeOrg?.name || 'Local/Pessoal';

    let md = `# 📊 Relatório de Métricas Nexus\n\n`;
    md += `**Organização:** ${orgName}  \n`;
    md += `**Gerado em:** ${nowStr}  \n\n`;
    md += `---  \n\n`;
    md += `## 📈 Resumo Geral\n\n`;
    md += `- **Total de Notas:** ${metrics.total_notes}\n`;
    md += `- **Notas Fixadas:** ${metrics.pinned_notes}\n`;
    md += `- **Notas com Anexos:** ${metrics.attachment_notes}\n`;
    md += `- **Membros Registrados:** ${metrics.online_users_count}\n\n`;
    md += `## 🏷️ Distribuição por Tags de Sistema\n\n`;
    if (metrics.notes_by_system_tag.length === 0) {
      md += `*Nenhuma tag de sistema em uso.*\n\n`;
    } else {
      metrics.notes_by_system_tag.forEach(t => {
        md += `- **${t.tag_name}:** ${t.note_count} nota(s)\n`;
      });
      md += `\n`;
    }
    md += `## 📝 Notas Recentes\n\n`;
    if (metrics.most_viewed.length === 0) {
      md += `*Nenhuma nota recente.*\n\n`;
    } else {
      metrics.most_viewed.forEach(n => {
        md += `- **#${n.id} ${n.title}** (Atualizada em: ${new Date(n.updated_at).toLocaleDateString('pt-BR')})\n`;
      });
    }
    return md;
  }, [metrics, activeOrg]);

  const handleCopyMarkdown = async () => {
    const md = generateMarkdownReport();
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      showToast('Relatório copiado em MD!', 'success');
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      showToast('Erro ao copiar relatório', 'error');
    }
  };

  const handleExportReport = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-nexus-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Relatório exportado com sucesso!', 'success');
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return d.toLocaleDateString('pt-BR');
  };

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
      label: 'Membros',
      value: metrics.online_users_count,
      icon: <Activity size={20} />,
      gradient: 'linear-gradient(135deg, #EC4899 0%, #9d174d 100%)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '2px',
          }}>
            Dashboard — {activeOrg?.name || 'Pessoal'}
          </h2>
          <p style={{ fontSize: '12px', color: isDark ? '#666' : '#9CA3AF' }}>
            Visão geral de atividades e membros da organização em tempo real
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopyMarkdown}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '8px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
              backgroundColor: copiedMd ? 'var(--color-primary-teal)' : (isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF'),
              color: copiedMd ? '#FFF' : (isDark ? '#CCC' : '#374151'),
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {copiedMd ? <Check size={14} /> : <Copy size={14} />}
            {copiedMd ? 'Copiado!' : 'Copiar MD'}
          </button>

          <button
            onClick={handleExportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid rgba(0, 180, 160, 0.3)',
              backgroundColor: 'rgba(0, 180, 160, 0.1)',
              color: 'var(--color-primary-teal)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={14} />
            Exportar Relatório
          </button>
        </div>
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
              <BarChart3 size={14} color="var(--color-primary-teal)" />
              Atividade dos Últimos 7 Dias
            </h3>
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
                    <div
                      className="chart-bar"
                      style={{
                        width: '100%',
                        maxWidth: '32px',
                        height: `${heightPercent}%`,
                        background: 'linear-gradient(180deg, var(--color-primary-teal) 0%, var(--color-accent-purple) 100%)',
                        borderRadius: '6px 6px 0 0',
                        cursor: 'pointer',
                        transition: 'height 0.3s ease',
                      }}
                    />
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
