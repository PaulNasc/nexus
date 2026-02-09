import React, { useMemo, useEffect, useState } from 'react';
import { File, CheckCircle, Timer, Clock, Flame, TrendingUp, BarChart3, Target, Trophy, ChevronLeft, BookOpen, Link2 } from 'lucide-react';
import { useTasks } from '../contexts/TasksContext';
import { useTimer } from '../hooks/useTimer';
import { useTheme } from '../hooks/useTheme';
import { useCategories } from '../contexts/CategoriesContext';
import { useSettings } from '../hooks/useSettings';
import { useNotes } from '../contexts/NotesContext';

interface ReportsProps {
  onClose?: () => void;
  onBack?: () => void;
}

export const Reports: React.FC<ReportsProps> = ({ onClose, onBack }) => {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { tasks, stats } = useTasks();
  const { stats: timerStats, formatDuration } = useTimer();
  const { categories, reloadCategories } = useCategories();
  const { notes, getNoteStats } = useNotes();
  const [noteStats, setNoteStats] = useState<any>(null);

  // Escutar mudanças nas categorias e tarefas
  useEffect(() => {
    const handleCategoriesUpdate = () => {
      reloadCategories();
    };

    const handleTasksUpdate = () => {
      // Força recálculo dos dados através do recarregamento das categorias
      setTimeout(() => {
        reloadCategories();
      }, 100);
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdate);
    window.addEventListener('tasksUpdated', handleTasksUpdate);
    
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdate);
      window.removeEventListener('tasksUpdated', handleTasksUpdate);
    };
  }, [reloadCategories]);

  const allTasks = tasks;
  const completedTasks = tasks.filter(task => task.status === 'concluido');
  const isDark = theme.mode === 'dark';

  // Verificar quais funcionalidades estão habilitadas
  const isTimerEnabled = settings.showTimer;
  const isNotesEnabled = settings.showNotes;

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? ((stats?.concluido || 0) / totalTasks) * 100 : 0;
    
    // Tasks by priority
    const highPriorityTasks = allTasks.filter(task => task.priority === 'high').length;
    const mediumPriorityTasks = allTasks.filter(task => task.priority === 'medium').length;
    const lowPriorityTasks = allTasks.filter(task => task.priority === 'low').length;

    // Completed tasks by priority
    const completedHighPriority = completedTasks.filter(task => task.priority === 'high').length;
    const completedMediumPriority = completedTasks.filter(task => task.priority === 'medium').length;
    const completedLowPriority = completedTasks.filter(task => task.priority === 'low').length;

    // Recent activity (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentCompletedTasks = completedTasks.filter(task => 
      new Date(task.updated_at) >= oneWeekAgo
    ).length;

    // Notes metrics (apenas se notas estão habilitadas)
    let notesMetrics = {
      totalNotes: 0,
      linkedNotes: 0,
      unlinkedNotes: 0,
      recentNotes: 0
    };

    if (isNotesEnabled) {
      notesMetrics = {
        totalNotes: notes.length,
        linkedNotes: notes.filter(note => note.linkedTaskIds && note.linkedTaskIds.length > 0).length,
        unlinkedNotes: notes.length - notes.filter(note => note.linkedTaskIds && note.linkedTaskIds.length > 0).length,
        recentNotes: notes.filter(note => 
          new Date(note.created_at) >= oneWeekAgo
        ).length
      };
    }

    return {
      totalTasks,
      completionRate,
      highPriorityTasks,
      mediumPriorityTasks,
      lowPriorityTasks,
      completedHighPriority,
      completedMediumPriority,
      completedLowPriority,
      recentCompletedTasks,
      ...notesMetrics
    };
  }, [allTasks, stats?.concluido, completedTasks, notes, isNotesEnabled]);

  return (
    <div style={{
      backgroundColor: 'transparent',
      color: isDark ? '#FFFFFF' : '#1A1A1A',
      minHeight: 'calc(100vh - 120px)',
      position: 'relative',
      padding: '24px',
    }}>
      {/* Header Section - Alinhado com padrão das outras abas */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-6)',
        width: '100%',
      }}>
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: '1px solid var(--color-border-primary)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginRight: 'var(--space-4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
              e.currentTarget.style.color = 'var(--color-primary-teal)';
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 170, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Voltar ao Dashboard"
          >
            <ChevronLeft size={18} strokeWidth={1.7} />
          </button>
        )}

        {/* Título com ícone - padrão das outras abas */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1
        }}>
          <BarChart3 size={28} style={{ color: 'var(--color-primary-teal)' }} />
          <h1 className="gradient-text" style={{
            fontSize: '32px',
            fontWeight: 600,
            margin: 0,
          }}>
            Relatórios
          </h1>
        </div>

        {/* Espaço para manter simetria */}
        <div style={{ width: '36px', height: '36px' }}></div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
        overflow: 'auto',
        maxHeight: 'calc(100vh - 180px)',
      }}>
        {/* Overview Cards - Condicionadas por funcionalidades habilitadas */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          {/* Métricas básicas sempre mostradas */}
          <MetricCard
            title="Total de Tarefas"
            value={metrics.totalTasks.toString()}
            icon={<File size={24} strokeWidth={1.7} />}
            color="#2196F3"
            isDark={isDark}
          />
          <MetricCard
            title="Taxa de Conclusão"
            value={`${metrics.completionRate.toFixed(1)}%`}
            icon={<CheckCircle size={24} strokeWidth={1.7} />}
            color="#4CAF50"
            isDark={isDark}
          />
          
          {/* Métricas do Timer - apenas se habilitado */}
          {isTimerEnabled && (
            <>
          <MetricCard
            title="Sessões Pomodoro"
            value={timerStats.completedSessions.toString()}
            icon={<Timer size={24} strokeWidth={1.7} />}
            color="#FF6B6B"
            isDark={isDark}
          />
          <MetricCard
            title="Tempo de Foco Hoje"
            value={formatDuration(timerStats.todayFocusTime)}
            icon={<Clock size={24} strokeWidth={1.7} />}
            color="#FF9800"
            isDark={isDark}
          />
          <MetricCard
            title="Sequência Atual"
            value={`${timerStats.currentStreak} dias`}
            icon={<Flame size={24} strokeWidth={1.7} />}
            color="#E91E63"
            isDark={isDark}
          />
            </>
          )}
          
          {/* Atividade semanal sempre mostrada */}
          <MetricCard
            title="Atividade Semanal"
            value={`${metrics.recentCompletedTasks} tarefas`}
            icon={<TrendingUp size={24} strokeWidth={1.7} />}
            color="#9C27B0"
            isDark={isDark}
          />
          
          {/* Métricas de Notas - apenas se habilitado */}
          {isNotesEnabled && (
            <>
              <MetricCard
                title="Total de Notas"
                value={metrics.totalNotes.toString()}
                icon={<BookOpen size={24} strokeWidth={1.7} />}
                color="#F59E0B"
                isDark={isDark}
              />
              <MetricCard
                title="Notas Vinculadas"
                value={metrics.linkedNotes.toString()}
                icon={<Link2 size={24} strokeWidth={1.7} />}
                color="#8B5CF6"
                isDark={isDark}
              />
            </>
          )}
        </div>

        {/* Task Status Overview */}
        <div style={{
          backgroundColor: isDark ? '#141414' : '#F5F5F5',
          border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
          borderRadius: '12px',
          padding: '16px',
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: isDark ? '#FFFFFF' : '#1A1A1A',
          }}>
            Status das Tarefas
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            <StatusItem
              label="Backlog"
              count={stats?.backlog || 0}
              color="#6B7280"
              isDark={isDark}
            />
            <StatusItem
              label="Esta Semana"
              count={stats?.esta_semana || 0}
              color="#3B82F6"
              isDark={isDark}
            />
            <StatusItem
              label="Hoje"
              count={stats?.hoje || 0}
              color="#F59E0B"
              isDark={isDark}
            />
            <StatusItem
              label="Concluído"
              count={stats?.concluido || 0}
              color="#10B981"
              isDark={isDark}
            />
            {/* Categorias Personalizadas */}
            {categories
              .filter(cat => !cat.isSystem)
              .map(category => (
                <StatusItem
                  key={category.id}
                  label={category.name}
                  count={category.task_count}
                  color={category.color}
                  isDark={isDark}
                />
              ))}
          </div>
        </div>

        {/* Task Distribution */}
        <div style={{
          backgroundColor: isDark ? '#141414' : '#F5F5F5',
          border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
          borderRadius: '12px',
          padding: '16px',
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: isDark ? '#FFFFFF' : '#1A1A1A',
          }}>
            Distribuição por Prioridade
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <TaskDistributionBar
              label="Alta Prioridade"
              total={metrics.highPriorityTasks}
              completed={metrics.completedHighPriority}
              color="#FF4444"
              isDark={isDark}
            />
            <TaskDistributionBar
              label="Média Prioridade"
              total={metrics.mediumPriorityTasks}
              completed={metrics.completedMediumPriority}
              color="#FF9800"
              isDark={isDark}
            />
            <TaskDistributionBar
              label="Baixa Prioridade"
              total={metrics.lowPriorityTasks}
              completed={metrics.completedLowPriority}
              color="#4CAF50"
              isDark={isDark}
            />
          </div>
        </div>

        {/* Notes Overview - apenas se notas estão habilitadas */}
        {isNotesEnabled && (
          <div style={{
            backgroundColor: isDark ? '#141414' : '#F5F5F5',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: isDark ? '#FFFFFF' : '#1A1A1A',
            }}>
              Visão Geral das Notas
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
            }}>
              <StatusItem
                label="Total de Notas"
                count={metrics.totalNotes}
                color="#F59E0B"
                isDark={isDark}
              />
              <StatusItem
                label="Notas Vinculadas"
                count={metrics.linkedNotes}
                color="#8B5CF6"
                isDark={isDark}
              />
              <StatusItem
                label="Notas Livres"
                count={metrics.unlinkedNotes}
                color="#6B7280"
                isDark={isDark}
              />
              <StatusItem
                label="Notas Recentes"
                count={metrics.recentNotes}
                color="#10B981"
                isDark={isDark}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  isDark: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, isDark }) => (
  <div style={{
    backgroundColor: isDark ? '#141414' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
  }}>
    <div style={{
      color: color,
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: '18px',
        fontWeight: 700,
        color: isDark ? '#FFFFFF' : '#1A1A1A',
        marginBottom: '2px',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '12px',
        color: isDark ? '#9CA3AF' : '#6B7280',
      }}>
        {title}
      </div>
    </div>
  </div>
);

interface TaskDistributionBarProps {
  label: string;
  total: number;
  completed: number;
  color: string;
  isDark: boolean;
}

const TaskDistributionBar: React.FC<TaskDistributionBarProps> = ({ label, total, completed, color, isDark }) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: 500,
          color: isDark ? '#FFFFFF' : '#1A1A1A',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '12px',
          color: isDark ? '#9CA3AF' : '#6B7280',
        }}>
          {completed}/{total} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

interface StatusItemProps {
  label: string;
  count: number;
  color: string;
  isDark: boolean;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, count, color, isDark }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
    borderRadius: '8px',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
      }} />
      <span style={{
        fontSize: '14px',
        color: isDark ? '#D1D5DB' : '#374151',
      }}>
        {label}
      </span>
    </div>
    <span style={{
      fontSize: '16px',
      fontWeight: 600,
      color: isDark ? '#FFFFFF' : '#1A1A1A',
    }}>
      {count}
    </span>
  </div>
); 