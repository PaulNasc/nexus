import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../shared/types/task';
import { Note } from '../../shared/types/note';
import { ChevronLeft, CalendarDays, File, Pencil, Trash, BookOpen, Users, X, ExternalLink, Clock, Lock } from 'lucide-react';
import { useCategories } from '../contexts/CategoriesContext';
import { useNotes } from '../contexts/NotesContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { NoteViewerModal } from './NoteViewerModal';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onToggleStatus: (taskId: number, newStatus: TaskStatus) => void;
  onBack?: () => void;
  title: string;
  emptyMessage?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onEdit,
  onDelete,
  onToggleStatus,
  onBack,
  title,
  emptyMessage = "Nenhuma tarefa encontrada"
}) => {
  const { categories } = useCategories();
  const { notes } = useNotes();
  const { members } = useOrganization();
  const { user } = useAuth();

  const isTaskLocked = (task: Task): boolean => {
    if (!task.assigned_to) return false;
    if (task.status === 'concluido') return false;
    return task.assigned_to !== user?.id;
  };

  const [notePreview, setNotePreview] = useState<Note | null>(null);
  const [taskLogTask, setTaskLogTask] = useState<Task | null>(null);

  const getPriorityColor = (priority?: TaskPriority) => {
    switch (priority) {
      case 'high': return 'var(--color-accent-rose)';
      case 'medium': return 'var(--color-accent-orange)';
      case 'low': return 'var(--color-accent-green)';
      default: return 'var(--color-text-muted)';
    }
  };

  const getPriorityLabel = (priority?: TaskPriority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getLinkedNote = (linkedNoteId?: number) => {
    if (!linkedNoteId) return null;
    return notes.find(note => note.id === linkedNoteId) || null;
  };

  const getLinkedNoteTitle = (linkedNoteId?: number) => {
    const linkedNote = getLinkedNote(linkedNoteId);
    return linkedNote ? linkedNote.title : linkedNoteId ? `Nota #${linkedNoteId}` : null;
  };

  const getMemberName = (userId?: string) => {
    if (!userId) return null;
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || member?.email || userId.slice(0, 8);
  };

  const isSharedCategory = (categoryId?: number) => {
    if (!categoryId) return false;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.is_shared === true;
  };

  const getProgressStatusLabel = (task: Task) => {
    if (task.progress_status) return task.progress_status;
    const statusNames: Record<string, string> = {
      backlog: 'Backlog',
      esta_semana: 'Esta Semana',
      hoje: 'Hoje',
      concluido: 'Concluído',
    };
    return statusNames[task.status] || task.status;
  };

  const getProgressColor = (task: Task) => {
    if (task.status === 'concluido') return '#10B981';
    const cat = categories.find(c => c.id === task.category_id);
    return cat?.color || 'var(--color-text-muted)';
  };

  const getStatusOptions = (currentStatus: TaskStatus) => {
    const systemOptions = [
      { value: 'backlog' as TaskStatus, label: 'Backlog' },
      { value: 'esta_semana' as TaskStatus, label: 'Esta Semana' },
      { value: 'hoje' as TaskStatus, label: 'Hoje' },
      { value: 'concluido' as TaskStatus, label: 'Concluído' },
    ];

    const customOptions = categories
      .filter(cat => !cat.isSystem)
      .map(cat => ({
        value: cat.name.toLowerCase().replace(/\s+/g, '_') as TaskStatus,
        label: cat.name
      }));

    const allOptions = [...systemOptions, ...customOptions];
    return allOptions.filter(option => option.value !== currentStatus);
  };

  const handleNoteClick = (linkedNoteId?: number) => {
    const linkedNote = getLinkedNote(linkedNoteId);
    if (linkedNote) {
      setNotePreview(linkedNote);
    }
  };

  const handleGoToNote = (noteId: number) => {
    setNotePreview(null);
    window.dispatchEvent(new CustomEvent('navigateToNote', { detail: { noteId } }));
  };

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      minHeight: '100vh',
      padding: '24px',
      transition: 'all var(--transition-theme)',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
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
                width: '40px',
                height: '40px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
              <ChevronLeft size={20} strokeWidth={1.7} />
            </button>
          )}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1
          }}>
            <CalendarDays size={28} style={{ color: 'var(--color-primary-teal)' }} />
            <h1 className="gradient-text" style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 600,
            }}>
              {title}
            </h1>
          </div>
          
          <div style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <File size={16} strokeWidth={1.7} />
            {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
          </div>
        </div>

        {/* Empty state */}
        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--color-text-secondary)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              <File size={48} strokeWidth={1.7} color="var(--color-text-muted)" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 500 }}>
              {emptyMessage}
            </h3>
            <p style={{ margin: 0, fontSize: '16px', opacity: 0.7 }}>
              Suas tarefas aparecerão aqui quando forem criadas.
            </p>
          </div>
        ) : (
          <div className="task-list" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {tasks.map((task) => {
              const progressLabel = getProgressStatusLabel(task);
              const progressColor = getProgressColor(task);
              const assigneeName = getMemberName(task.assigned_to);
              const assignerName = getMemberName(task.assigned_by);
              const shared = isSharedCategory(task.category_id);
              const locked = isTaskLocked(task);

              return (
              <div key={task.id} style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '10px',
                padding: '14px 16px',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Status ribbon — bottom-right, clickable to open task log */}
                {progressLabel && (
                  <div
                    title="Clique para ver detalhes da tarefa"
                    onClick={() => setTaskLogTask(task)}
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      padding: '3px 12px',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: progressColor,
                      backgroundColor: `${progressColor}18`,
                      borderTop: `1px solid ${progressColor}30`,
                      borderLeft: `1px solid ${progressColor}30`,
                      borderTopLeftRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      userSelect: 'none',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${progressColor}30`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${progressColor}18`; }}
                  >
                    <Clock size={9} />
                    {progressLabel}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <h3 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: task.status === 'concluido' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      textDecoration: task.status === 'concluido' ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </h3>
                    
                    {/* Description */}
                    {task.description && (
                      <p style={{
                        margin: '0 0 5px 0',
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.4,
                      }}>
                        {task.description}
                      </p>
                    )}

                    {/* Assignment info */}
                    {task.assigned_to && assignerName && assigneeName && (
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--color-accent-purple)',
                        marginBottom: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <Users size={11} />
                        <span>{assignerName} atribuiu esta tarefa a <strong>{assigneeName}</strong></span>
                      </div>
                    )}
                    
                    {/* Metadata row */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      alignItems: 'center',
                      marginBottom: progressLabel ? '14px' : '0',
                    }}>
                      {/* Priority */}
                      {task.priority && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getPriorityColor(task.priority),
                          }} />
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      )}
                      
                      {/* Due date */}
                      {task.due_date && (
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <CalendarDays size={12} strokeWidth={1.7} />
                          {formatDate(task.due_date)}
                        </div>
                      )}
                      
                      {/* Created date */}
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Criado em {formatDate(task.created_at)}
                      </div>

                      {/* Shared indicator */}
                      {shared && (
                        <div style={{
                          fontSize: '11px',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }} title="Categoria compartilhada da organização">
                          <Users size={11} strokeWidth={1.7} color="#10B981" />
                          Compartilhada
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginLeft: '16px',
                    alignItems: 'flex-end',
                  }}>
                    {/* Lock indicator */}
                    {locked && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: 'var(--color-accent-orange)',
                        marginBottom: '2px',
                      }} title={`Bloqueado pois a tarefa está atribuída a ${assigneeName}.`}>
                        <Lock size={10} />
                        Bloqueada
                      </div>
                    )}
                    {/* Top row: move + edit + delete */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select
                        value=""
                        disabled={locked}
                        onChange={(e) => {
                          if (e.target.value) {
                            onToggleStatus(task.id, e.target.value as TaskStatus);
                          }
                        }}
                        title={locked ? 'Tarefa bloqueada para edição' : 'Mover tarefa para outra categoria'}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border-primary)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '12px',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          opacity: locked ? 0.4 : 1,
                        }}
                      >
                        <option value="">Mover</option>
                        {getStatusOptions(task.status).map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => !locked && onEdit(task)}
                        disabled={locked}
                        title={locked ? 'Tarefa bloqueada para edição' : 'Editar tarefa'}
                        style={{
                          padding: '8px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border-primary)',
                          borderRadius: '6px',
                          color: locked ? 'var(--color-text-muted)' : 'var(--color-primary-teal)',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: locked ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!locked) {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-teal)';
                            e.currentTarget.style.color = 'var(--color-bg-primary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!locked) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-primary-teal)';
                          }
                        }}
                      >
                        <Pencil size={14} strokeWidth={1.7} />
                      </button>

                      <button
                        onClick={() => {
                          if (!locked && confirm(`Tem certeza que deseja excluir "${task.title}"?`)) {
                            onDelete(task.id);
                          }
                        }}
                        disabled={locked}
                        title={locked ? 'Tarefa bloqueada para edição' : 'Excluir tarefa'}
                        style={{
                          padding: '8px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border-primary)',
                          borderRadius: '6px',
                          color: locked ? 'var(--color-text-muted)' : 'var(--color-accent-rose)',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: locked ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!locked) {
                            e.currentTarget.style.backgroundColor = 'var(--color-accent-rose)';
                            e.currentTarget.style.color = '#FFFFFF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!locked) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-accent-rose)';
                          }
                        }}
                      >
                        <Trash size={14} strokeWidth={1.7} />
                      </button>
                    </div>

                    {/* Linked note button — opens preview modal */}
                    {task.linkedNoteId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNoteClick(task.linkedNoteId); }}
                        title={`Nota vinculada: ${getLinkedNoteTitle(task.linkedNoteId)}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: 'var(--color-primary-teal)',
                          backgroundColor: 'rgba(0, 212, 170, 0.08)',
                          border: '1px solid rgba(0, 212, 170, 0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 212, 170, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 212, 170, 0.08)';
                        }}
                      >
                        <BookOpen size={11} strokeWidth={1.7} />
                        {getLinkedNoteTitle(task.linkedNoteId)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note Preview Modal — reuses NoteViewerModal */}
      <NoteViewerModal
        isOpen={!!notePreview}
        note={notePreview}
        onClose={() => setNotePreview(null)}
      />
      {/* "Ir até" floating button when note preview is open */}
      {notePreview && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10010,
        }}>
          <button
            onClick={() => handleGoToNote(notePreview.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'var(--color-primary-teal)',
              color: '#000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(0, 212, 170, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 212, 170, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 212, 170, 0.3)'; }}
            title="Ir até esta nota na aba de Notas"
          >
            <ExternalLink size={16} />
            Ir até
          </button>
        </div>
      )}

      {/* Task Log Modal — chronological timeline */}
      {taskLogTask && (() => {
        const logCategory = categories.find(c => c.id === taskLogTask.category_id);
        const catColor = logCategory?.color || 'var(--color-primary-teal)';
        const logAssignee = getMemberName(taskLogTask.assigned_to);
        const logAssigner = getMemberName(taskLogTask.assigned_by);
        const logLinkedNote = getLinkedNote(taskLogTask.linkedNoteId);
        const progressMover = getMemberName(taskLogTask.progress_updated_by);

        // Build chronological log entries from available data
        type LogEntry = { date: string; text: string; color: string };
        const logEntries: LogEntry[] = [];

        // 1. Created
        logEntries.push({
          date: taskLogTask.created_at,
          text: `Tarefa "${taskLogTask.title}" foi criada.`,
          color: 'var(--color-text-secondary)',
        });

        // 2. Category assignment (same time as creation if set)
        if (logCategory) {
          logEntries.push({
            date: taskLogTask.created_at,
            text: `Adicionada à categoria ${logCategory.name}.`,
            color: catColor,
          });
        }

        // 3. Linked note
        if (logLinkedNote) {
          logEntries.push({
            date: taskLogTask.created_at,
            text: `Nota vinculada: #${logLinkedNote.sequential_id ?? ''} ${logLinkedNote.title}.`,
            color: 'var(--color-primary-teal)',
          });
        }

        // 4. Due date set
        if (taskLogTask.due_date) {
          logEntries.push({
            date: taskLogTask.created_at,
            text: `Prazo definido para ${formatDate(taskLogTask.due_date)}.`,
            color: 'var(--color-accent-orange)',
          });
        }

        // 5. Assignment
        if (logAssigner && logAssignee) {
          logEntries.push({
            date: taskLogTask.updated_at,
            text: `${logAssigner} atribuiu esta tarefa a ${logAssignee}.`,
            color: 'var(--color-accent-purple)',
          });
        }

        // 6. Progress / move
        if (taskLogTask.progress_status) {
          logEntries.push({
            date: taskLogTask.updated_at,
            text: progressMover
              ? `${progressMover} moveu a tarefa para ${taskLogTask.progress_status}.`
              : `Tarefa movida para ${taskLogTask.progress_status}.`,
            color: catColor,
          });
        }

        // 7. Completed
        if (taskLogTask.completed_at) {
          logEntries.push({
            date: taskLogTask.completed_at,
            text: 'Tarefa concluída.',
            color: '#10B981',
          });
        }

        // 8. Last update (only if different from created_at and not already covered by completion)
        if (taskLogTask.updated_at !== taskLogTask.created_at && taskLogTask.updated_at !== taskLogTask.completed_at) {
          logEntries.push({
            date: taskLogTask.updated_at,
            text: 'Última modificação registrada.',
            color: 'var(--color-text-muted)',
          });
        }

        // Sort chronologically
        logEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
        <div
          className="modal-overlay"
          style={{ zIndex: 10002 }}
          onClick={() => setTaskLogTask(null)}
        >
          <div
            className="modal-content"
            style={{
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              maxHeight: '75vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color={catColor} />
                Histórico da Tarefa
              </h3>
              <button
                onClick={() => setTaskLogTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Task title */}
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: catColor,
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${catColor}25`,
            }}>
              {taskLogTask.title}
            </div>

            {/* Timeline */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
            }}>
              {logEntries.map((entry, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: '12px',
                  position: 'relative',
                  paddingBottom: idx < logEntries.length - 1 ? '16px' : '0',
                }}>
                  {/* Timeline line + dot */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '12px',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: entry.color,
                      marginTop: '4px',
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${entry.color}40`,
                    }} />
                    {idx < logEntries.length - 1 && (
                      <div style={{
                        width: '1px',
                        flex: 1,
                        backgroundColor: 'var(--color-border-primary)',
                        marginTop: '4px',
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: 'var(--color-text-primary)',
                    }}>
                      {entry.text}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                    }}>
                      {formatDateTime(entry.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => setTaskLogTask(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-primary)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = catColor; e.currentTarget.style.color = catColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-primary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};