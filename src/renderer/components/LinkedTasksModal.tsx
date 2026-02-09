import React, { useState } from 'react';
import { Task } from '../../shared/types/task';
import { useTasks } from '../contexts/TasksContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ChevronDown, ChevronRight, X, Link2, Calendar, Clock, Flag } from 'lucide-react';

interface LinkedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number;
  noteTitle: string;
  linkedTaskIds: number[];
}

export const LinkedTasksModal: React.FC<LinkedTasksModalProps> = ({
  isOpen,
  onClose,
  noteId,
  noteTitle,
  linkedTaskIds
}) => {
  const { tasks: allTasks, loading: isLoading } = useTasks();
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const tasks = allTasks.filter((task: Task) => linkedTaskIds.includes(task.id));

  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backlog': return 'var(--color-text-muted)';
      case 'esta_semana': return 'var(--color-accent-blue)';
      case 'hoje': return 'var(--color-accent-amber)';
      case 'concluido': return 'var(--color-accent-emerald)';
      default: return 'var(--color-text-muted)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'backlog': return 'Backlog';
      case 'esta_semana': return 'Esta Semana';
      case 'hoje': return 'Hoje';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Alta';
      case 2: return 'Média';
      case 3: return 'Baixa';
      default: return 'Normal';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="linked-tasks-modal-backdrop">
      <div className="linked-tasks-modal">
        {/* Header */}
        <div className="linked-tasks-header">
          <div className="linked-tasks-title-section">
            <Link2 size={20} className="linked-tasks-icon" />
            <div>
              <h2 className="linked-tasks-title">Tarefas Vinculadas</h2>
              <p className="linked-tasks-subtitle">
                Nota: {noteTitle} • {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="linked-tasks-close-button"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="linked-tasks-content">
          {isLoading ? (
            <div className="linked-tasks-loading">
              <div className="loading-spinner"></div>
              <p className="loading-text">Carregando tarefas...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="linked-tasks-empty">
              <Link2 size={48} className="empty-icon" />
              <h3 className="empty-title">Nenhuma tarefa vinculada</h3>
              <p className="empty-subtitle">Esta nota não possui tarefas vinculadas.</p>
            </div>
          ) : (
            <div className="linked-tasks-list">
              {tasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                return (
                  <Card key={task.id} className="linked-task-card">
                    <div className="linked-task-header">
                      <div className="linked-task-main">
                        <div 
                          className="linked-task-status-indicator"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        />
                        <div className="linked-task-info">
                          <h3 className="linked-task-title">{task.title}</h3>
                          <div className="linked-task-meta">
                            <Badge 
                              variant="secondary" 
                              className="status-badge"
                              style={{ 
                                backgroundColor: `${getStatusColor(task.status)}20`,
                                color: getStatusColor(task.status),
                                borderColor: `${getStatusColor(task.status)}40`
                              }}
                            >
                              {getStatusLabel(task.status)}
                            </Badge>
                            <div className="linked-task-date">
                              <Calendar size={12} />
                              <span>{formatDate(task.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => toggleTaskExpansion(task.id)}
                        variant="ghost"
                        size="sm"
                        className="expand-button"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="linked-task-details">
                        {task.description ? (
                          <div className="task-description">
                            <h4 className="detail-label">Descrição</h4>
                            <p className="detail-content">{task.description}</p>
                          </div>
                        ) : (
                          <p className="no-description">Sem descrição</p>
                        )}
                        
                        <div className="task-properties">
                          <div className="property-item">
                            <Flag size={14} className="property-icon" />
                            <span className="property-label">Prioridade:</span>
                            <span className="property-value">{getPriorityLabel(Number(task.priority) || 3)}</span>
                          </div>
                          <div className="property-item">
                            <Clock size={14} className="property-icon" />
                            <span className="property-label">Atualizado:</span>
                            <span className="property-value">{formatDate(task.updated_at)}</span>
                          </div>
                          {task.completed_at && (
                            <div className="property-item">
                              <Calendar size={14} className="property-icon" />
                              <span className="property-label">Concluído:</span>
                              <span className="property-value">{formatDate(task.completed_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="linked-tasks-footer">
          <Button onClick={onClose} variant="primary">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}; 