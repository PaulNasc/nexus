import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useNotes } from '../contexts/NotesContext';
import { useTasks } from '../contexts/TasksContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Save, Link2 } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalTitle?: string;
}

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, modalTitle = 'Nova Nota' }) => {
  const { theme } = useTheme();
  const { createNote } = useNotes();
  const { tasks } = useTasks();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const isDark = theme.mode === 'dark';

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await createNote({
        title: title.trim(),
        content,
        linkedTaskIds: linkedTaskId ? [linkedTaskId] : [],
        format: 'text'
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setLinkedTaskId(undefined);
      onClose();
    } catch (error) {
      console.error('Erro ao criar nota:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setLinkedTaskId(undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF',
        border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: isDark ? 'var(--color-text-primary)' : '#1F2937',
            margin: 0
          }}>
            {modalTitle}
          </h2>
          
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? 'var(--color-text-secondary)' : '#6B7280',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Título */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: isDark ? 'var(--color-text-primary)' : '#374151',
              marginBottom: 6
            }}>
              Título
            </label>
            <Input
              type="text"
              placeholder="Digite o título da nota..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: 16 }}
            />
          </div>

          {/* Conteúdo */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: isDark ? 'var(--color-text-primary)' : '#374151',
              marginBottom: 6
            }}>
              Conteúdo
            </label>
            <textarea
              placeholder="Escreva o conteúdo da nota..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: 12,
                backgroundColor: isDark ? 'var(--color-bg-tertiary)' : '#F9FAFB',
                border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
                borderRadius: 8,
                color: isDark ? 'var(--color-text-primary)' : '#1F2937',
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Vincular tarefa */}
          <div>
            <label style={{
              display: 'flex',
              fontSize: 14,
              fontWeight: 500,
              color: isDark ? 'var(--color-text-primary)' : '#374151',
              marginBottom: 6,
              alignItems: 'center',
              gap: 6
            }}>
              <Link2 size={14} />
              Vincular à Tarefa (opcional)
            </label>
            <select
              value={linkedTaskId || ''}
              onChange={(e) => setLinkedTaskId(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                width: '100%',
                padding: 12,
                backgroundColor: isDark ? 'var(--color-bg-tertiary)' : '#F9FAFB',
                border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
                borderRadius: 8,
                color: isDark ? 'var(--color-text-primary)' : '#1F2937',
                fontSize: 14,
                outline: 'none'
              }}
            >
              <option value="">Nenhuma tarefa</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`
        }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={16} />
            {isLoading ? 'Salvando...' : 'Criar Nota'}
          </Button>
        </div>
      </div>
    </div>
  );
}; 