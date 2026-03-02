import React, { useEffect, useState, useMemo } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTheme } from '../hooks/useTheme';
import {
  BarChart3,
  Users,
  FileText,
  Eye,
  Edit,
  Plus,
  Activity,
  Clock,
} from 'lucide-react';

interface NoteActivity {
  id: number;
  note_id: number;
  note_title: string;
  user_id: string;
  user_name: string;
  action: 'created' | 'updated' | 'viewed';
  created_at: string;
}

interface UserMetrics {
  user_id: string;
  user_name: string;
  notes_created: number;
  notes_updated: number;
  notes_viewed: number;
  last_activity: string;
}

interface NotesMetrics {
  total_notes: number;
  notes_created_today: number;
  notes_created_week: number;
  notes_created_month: number;
  total_views: number;
  total_updates: number;
  active_users: number;
  user_metrics: UserMetrics[];
  recent_activities: NoteActivity[];
}

export const NotesMetricsPanel: React.FC = () => {
  const { activeOrg, myRole } = useOrganization();
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const [metrics, setMetrics] = useState<NotesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Verificar se usuário é admin da organização
  const isOrgAdmin = useMemo(() => {
    return activeOrg && (myRole === 'admin' || myRole === 'owner');
  }, [activeOrg, myRole]);

  useEffect(() => {
    if (!isOrgAdmin) {
      setLoading(false);
      return;
    }

    // Aqui você implementaria a busca real das métricas do Supabase
    // Por enquanto, dados mockados para demonstração
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // TODO: Implementar busca real via Supabase
        // const { data, error } = await supabase
        //   .from('note_activities')
        //   .select('*')
        //   .eq('org_id', activeOrg.id)
        
        // Mock data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockMetrics: NotesMetrics = {
          total_notes: 156,
          notes_created_today: 8,
          notes_created_week: 34,
          notes_created_month: 127,
          total_views: 1243,
          total_updates: 456,
          active_users: 12,
          user_metrics: [
            {
              user_id: '1',
              user_name: 'Paulo',
              notes_created: 45,
              notes_updated: 123,
              notes_viewed: 567,
              last_activity: new Date().toISOString(),
            },
            {
              user_id: '2',
              user_name: 'Maria Silva',
              notes_created: 32,
              notes_updated: 89,
              notes_viewed: 234,
              last_activity: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              user_id: '3',
              user_name: 'João Santos',
              notes_created: 28,
              notes_updated: 67,
              notes_viewed: 189,
              last_activity: new Date(Date.now() - 7200000).toISOString(),
            },
          ],
          recent_activities: [
            {
              id: 1,
              note_id: 143,
              note_title: 'Problemas Impressão iData',
              user_id: '1',
              user_name: 'Paulo',
              action: 'created',
              created_at: new Date(Date.now() - 300000).toISOString(),
            },
            {
              id: 2,
              note_id: 142,
              note_title: 'Devolução de crédito',
              user_id: '2',
              user_name: 'Maria Silva',
              action: 'updated',
              created_at: new Date(Date.now() - 600000).toISOString(),
            },
            {
              id: 3,
              note_id: 141,
              note_title: 'Como cadastrar pix',
              user_id: '3',
              user_name: 'João Santos',
              action: 'viewed',
              created_at: new Date(Date.now() - 900000).toISOString(),
            },
          ],
        };

        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [isOrgAdmin, activeOrg, timeRange]);

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <Plus size={14} />;
      case 'updated': return <Edit size={14} />;
      case 'viewed': return <Eye size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return '#10B981';
      case 'updated': return '#F59E0B';
      case 'viewed': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'criou';
      case 'updated': return 'editou';
      case 'viewed': return 'visualizou';
      default: return 'interagiu com';
    }
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
        <Activity size={32} style={{ margin: '0 auto 16px', opacity: 0.5, animation: 'spin 2s linear infinite' }} />
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
    borderRadius: '12px',
    padding: '20px',
  };

  const statCardStyle: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: isDark ? '#FFF' : '#111',
            marginBottom: '4px',
          }}>
            Métricas de Notas
          </h2>
          <p style={{ fontSize: '13px', color: isDark ? '#888' : '#6B7280' }}>
            Organização: {activeOrg?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                borderRadius: '6px',
                background: timeRange === range
                  ? 'linear-gradient(135deg, #00D4AA, #7B3FF2)'
                  : (isDark ? '#1A1A1A' : '#FFF'),
                color: timeRange === range ? '#FFF' : (isDark ? '#AAA' : '#6B7280'),
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {range === 'today' ? 'Hoje' : range === 'week' ? 'Semana' : range === 'month' ? 'Mês' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#00D4AA" />
            <span style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', fontWeight: 500 }}>
              Total de Notas
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: isDark ? '#FFF' : '#111' }}>
            {metrics.total_notes}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#10B981" />
            <span style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', fontWeight: 500 }}>
              Criadas (Semana)
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: isDark ? '#FFF' : '#111' }}>
            {metrics.notes_created_week}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={18} color="#3B82F6" />
            <span style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', fontWeight: 500 }}>
              Visualizações
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: isDark ? '#FFF' : '#111' }}>
            {metrics.total_views}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#7B3FF2" />
            <span style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', fontWeight: 500 }}>
              Usuários Ativos
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: isDark ? '#FFF' : '#111' }}>
            {metrics.active_users}
          </div>
        </div>
      </div>

      {/* User Metrics Table */}
      <div style={cardStyle}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: isDark ? '#FFF' : '#111',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Users size={18} color="#00D4AA" />
          Atividade por Usuário
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}` }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#6B7280' }}>
                  Usuário
                </th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#6B7280' }}>
                  Criadas
                </th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#6B7280' }}>
                  Editadas
                </th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#6B7280' }}>
                  Visualizadas
                </th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#6B7280' }}>
                  Última Atividade
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.user_metrics.map((userMetric) => (
                <tr key={userMetric.user_id} style={{ borderBottom: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}` }}>
                  <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 500, color: isDark ? '#FFF' : '#111' }}>
                    {userMetric.user_name}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: isDark ? '#AAA' : '#6B7280' }}>
                    {userMetric.notes_created}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: isDark ? '#AAA' : '#6B7280' }}>
                    {userMetric.notes_updated}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: isDark ? '#AAA' : '#6B7280' }}>
                    {userMetric.notes_viewed}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '13px', color: isDark ? '#666' : '#9CA3AF' }}>
                    {formatRelativeTime(userMetric.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activities */}
      <div style={cardStyle}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: isDark ? '#FFF' : '#111',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Clock size={18} color="#00D4AA" />
          Atividades Recentes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {metrics.recent_activities.map((activity) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: isDark ? '#0A0A0A' : '#F9FAFB',
                borderRadius: '8px',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `${getActionColor(activity.action)}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getActionColor(activity.action),
                flexShrink: 0,
              }}>
                {getActionIcon(activity.action)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: isDark ? '#FFF' : '#111', marginBottom: '2px' }}>
                  <strong>{activity.user_name}</strong> {getActionLabel(activity.action)} <strong>#{activity.note_id} {activity.note_title}</strong>
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#666' : '#9CA3AF' }}>
                  {formatRelativeTime(activity.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
