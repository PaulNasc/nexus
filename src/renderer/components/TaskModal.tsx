import React, { useState, useEffect } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useCategories } from '../contexts/CategoriesContext';
import { useNotes } from '../contexts/NotesContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Task } from '../../shared/types/task';
import { 
  Tag, 
  X, 
  Save, 
  AlertCircle,
  Palette,
  Hash,
  BookOpen
} from 'lucide-react';

interface TaskModalProps {
  editingTask?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (task: Task) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  editingTask,
  isOpen,
  onClose,
  onSave
}) => {
  const { createTask, updateTask, linkTaskToNote, unlinkTaskFromNote } = useTasks();
  const { categories, createCategory, reloadCategories } = useCategories();
  const { notes } = useNotes();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [categoryId, setCategoryId] = useState<number>(1); // Default to Backlog
  const [linkedNoteId, setLinkedNoteId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryColor, setCustomCategoryColor] = useState('#00D4AA');
  const [customCategoryIcon, setCustomCategoryIcon] = useState('Folder');

  // Reset form when modal opens/closes or when editing task changes
  useEffect(() => {
    if (isOpen) {
      reloadCategories();
      
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setPriority(editingTask.priority || 'low');
        // Map status to categoryId for backward compatibility
        const statusToCategoryMap: { [key: string]: number } = {
          'backlog': 1,
          'esta_semana': 2, 
          'hoje': 3,
          'concluido': 4
        };
        setCategoryId(editingTask.category_id || statusToCategoryMap[editingTask.status] || 1);
        setLinkedNoteId(editingTask.linkedNoteId);
      } else {
        setTitle('');
        setDescription('');
        setPriority('low');
        setCategoryId(1); // Default to Backlog
        setLinkedNoteId(undefined);
      }
      setCustomCategoryName('');
      setCustomCategoryColor('#00D4AA');
      setCustomCategoryIcon('Folder');
      setShowCustomCategory(false);
      setErrors({});
    }
  }, [isOpen, editingTask, reloadCategories]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    
    if (showCustomCategory && !customCategoryName.trim()) {
      newErrors.customCategory = 'Nome da categoria é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      let finalCategoryId = categoryId;
      
      // Create custom category if needed
      if (showCustomCategory && customCategoryName.trim()) {
        const newCat = await createCategory({
          name: customCategoryName.trim(),
          color: customCategoryColor,
          icon: customCategoryIcon,
        });
        if (newCat) {
          finalCategoryId = newCat.id;
        } else {
          setErrors({ general: 'Erro ao criar categoria. Verifique se está autenticado.' });
          setIsLoading(false);
          return;
        }
      }

      // Map categoryId to status for system categories
      const categoryToStatusMap: { [key: number]: string } = {
        1: 'backlog',
        2: 'esta_semana',
        3: 'hoje', 
        4: 'concluido'
      };
      
      const taskStatus = categoryToStatusMap[finalCategoryId] || 'backlog';

      const taskData = {
        id: editingTask?.id || Date.now(),
        title: title.trim(),
        description: description.trim(),
        priority,
        status: taskStatus,
        category_id: finalCategoryId,
        created_at: editingTask?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: taskStatus === 'concluido' ? new Date().toISOString() : null
      };

      let savedTask: Task;
      
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          status: taskData.status as 'backlog' | 'esta_semana' | 'hoje' | 'concluido',
          category_id: taskData.category_id
        });
        savedTask = { ...editingTask, ...taskData } as Task;
      } else {
        const newTask = await createTask(taskData as unknown as Task);
        if (!newTask) {
          throw new Error('Failed to create task');
        }
        savedTask = newTask;
      }

      // Handle note linking
      if (linkedNoteId !== editingTask?.linkedNoteId) {
        if (editingTask?.linkedNoteId) {
          // Remove previous link
          await unlinkTaskFromNote(editingTask.id);
        }
        
        if (linkedNoteId) {
          // Create new link
          await linkTaskToNote(savedTask.id, linkedNoteId);
        }
      }

      if (onSave) {
        onSave(savedTask);
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      setErrors({ general: 'Erro ao salvar tarefa' });
    } finally {
      setIsLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'high', label: 'Alta', color: '#FF4444' },
    { value: 'medium', label: 'Média', color: '#FF9800' },
    { value: 'low', label: 'Baixa', color: '#4CAF50' }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '32px', maxWidth: '600px', width: '90%' }}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="bg-card border-primary p-12 mb-16" style={{ 
            backgroundColor: 'var(--error-bg)', 
            borderColor: 'var(--error-border)', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ color: 'var(--error-color)' }} />
            <span style={{ color: 'var(--error-color)', fontSize: '14px' }}>
              {errors.general}
            </span>
          </div>
        )}

        {/* Form */}
        <div className="flex-col gap-20">
          {/* Título */}
          <div>
            <label className="form-label">
              Título da Tarefa
            </label>
            <Input
              type="text"
              placeholder="Digite o título da tarefa..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-error' : ''}
            />
            {errors.title && (
              <span className="text-error" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.title}
              </span>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="form-label">
              Descrição (opcional)
            </label>
            <textarea
              className="form-textarea"
              placeholder="Adicione uma descrição..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Nota Vinculada */}
          <div>
            <label className="form-label">
              <BookOpen size={16} />
              Vincular à Nota (opcional)
            </label>
            <select
              className="form-select"
              value={linkedNoteId || ''}
              onChange={(e) => setLinkedNoteId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Nenhuma nota</option>
              {notes.map(note => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="form-label">
              <AlertCircle size={16} />
              Prioridade
            </label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="form-label">
              <Tag size={16} />
              Categoria
            </label>
            <p style={{ 
              fontSize: '12px', 
              color: 'var(--color-text-secondary)', 
              marginBottom: '8px',
              marginTop: '4px'
            }}>
              As categorias padrão (Backlog, Esta Semana, Hoje, Concluído) definem o status da tarefa
            </p>
            
            <div className="flex-col gap-12">
              <select
                className="form-select"
                value={showCustomCategory ? 'custom' : categoryId}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setShowCustomCategory(true);
                    setCategoryId(1); // Default to Backlog when creating custom
                  } else {
                    setShowCustomCategory(false);
                    setCategoryId(Number(e.target.value));
                  }
                }}
              >
                {/* System categories - ALWAYS show regardless of hook state */}
                <option value="1">Backlog</option>
                <option value="2">Esta Semana</option>
                <option value="3">Hoje</option>
                <option value="4">Concluído</option>
                
                {/* Custom categories from hook - only non-system ones */}
                {categories && categories.length > 0 && categories
                  .filter(cat => !cat.isSystem && cat.name && cat.id)
                  .map(category => (
                    <option key={`custom-${category.id}`} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                <option value="custom">➕ Criar nova categoria</option>
              </select>

              {showCustomCategory && (
                <div className="bg-secondary border-primary p-16" style={{ borderRadius: '8px' }}>
                  <div className="flex-col gap-12">
                    <div>
                      <label className="form-label">
                        Nome da Categoria
                      </label>
                      <Input
                        type="text"
                        placeholder="Nome da nova categoria..."
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className={errors.customCategory ? 'border-error' : ''}
                      />
                      {errors.customCategory && (
                        <span className="text-error" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {errors.customCategory}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">
                          <Palette size={16} />
                          Cor
            </label>
            <input
                          type="color"
                          value={customCategoryColor}
                          onChange={(e) => setCustomCategoryColor(e.target.value)}
                          className="form-input"
                          style={{ height: '40px', padding: '4px' }}
                        />
                      </div>

                      <div>
                        <label className="form-label">
                          <Hash size={16} />
                          Ícone
                        </label>
                        <select
                          className="form-select"
                          value={customCategoryIcon}
                          onChange={(e) => setCustomCategoryIcon(e.target.value)}
                        >
                          <option value="Folder">📁 Pasta</option>
                          <option value="Home">🏠 Casa</option>
                          <option value="Briefcase">💼 Trabalho</option>
                          <option value="Heart">❤️ Pessoal</option>
                          <option value="Target">🎯 Meta</option>
                        </select>
                      </div>
                    </div>
                  </div>
              </div>
            )}
            </div>
          </div>
          </div>

        {/* Footer */}
        <div className="flex-between gap-12" style={{ 
          marginTop: '32px', 
          paddingTop: '24px', 
          borderTop: '1px solid var(--color-border-primary)' 
        }}>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            >
              Cancelar
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} />
            {isLoading ? 'Salvando...' : (editingTask ? 'Atualizar' : 'Criar Tarefa')}
          </Button>
          </div>
      </div>
    </div>
  );
};