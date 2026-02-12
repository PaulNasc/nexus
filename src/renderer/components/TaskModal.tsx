import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useCategories } from '../contexts/CategoriesContext';
import { useNotes } from '../contexts/NotesContext';
import { useOrganization } from '../contexts/OrganizationContext';
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
  BookOpen,
  UserPlus,
  Search,
  Users
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
  const { members, activeOrg } = useOrganization();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [categoryId, setCategoryId] = useState<number>(1); // Default to Backlog
  const [linkedNoteId, setLinkedNoteId] = useState<number | undefined>();
  const [assignedTo, setAssignedTo] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryColor, setCustomCategoryColor] = useState('#00D4AA');
  const [customCategoryIcon, setCustomCategoryIcon] = useState('Folder');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteDropdownOpen, setNoteDropdownOpen] = useState(false);
  const noteDropdownRef = useRef<HTMLDivElement>(null);

  // Filtered notes for searchable dropdown
  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return notes;
    const q = noteSearch.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.sequential_id && String(n.sequential_id).includes(q))
    );
  }, [notes, noteSearch]);

  // Close note dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (noteDropdownRef.current && !noteDropdownRef.current.contains(e.target as Node)) {
        setNoteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        setAssignedTo(editingTask.assigned_to);
      } else {
        setTitle('');
        setDescription('');
        setPriority('low');
        setCategoryId(1); // Default to Backlog
        setLinkedNoteId(undefined);
        setAssignedTo(undefined);
      }
      setNoteSearch('');
      setNoteDropdownOpen(false);
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
          category_id: taskData.category_id,
          assigned_to: assignedTo,
        });
        savedTask = { ...editingTask, ...taskData, assigned_to: assignedTo } as Task;
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

          {/* Nota Vinculada — dropdown com busca */}
          <div ref={noteDropdownRef} style={{ position: 'relative' }}>
            <label className="form-label">
              <BookOpen size={16} />
              Vincular à Nota (opcional)
            </label>
            <div
              className="form-select"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onClick={() => setNoteDropdownOpen(!noteDropdownOpen)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {linkedNoteId
                  ? (() => { const n = notes.find(n => n.id === linkedNoteId); return n ? `#${n.sequential_id ?? ''} ${n.title}` : 'Nota não encontrada'; })()
                  : 'Nenhuma nota'}
              </span>
              <Search size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
            </div>
            {noteDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)',
                borderRadius: '8px', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                maxHeight: '220px', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border-primary)' }}>
                  <input
                    type="text"
                    placeholder="Buscar nota..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid var(--color-border-primary)',
                      borderRadius: '6px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <div
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-muted)' }}
                    onClick={() => { setLinkedNoteId(undefined); setNoteDropdownOpen(false); setNoteSearch(''); }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Nenhuma nota
                  </div>
                  {filteredNotes.map(note => (
                    <div
                      key={note.id}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--color-text-primary)',
                        background: linkedNoteId === note.id ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                      }}
                      onClick={() => { setLinkedNoteId(note.id); setNoteDropdownOpen(false); setNoteSearch(''); }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = linkedNoteId === note.id ? 'rgba(0, 212, 170, 0.1)' : 'transparent'}
                    >
                      <span style={{ color: 'var(--color-primary-teal)', marginRight: '6px', fontSize: '11px' }}>
                        #{note.sequential_id ?? ''}
                      </span>
                      {note.title}
                    </div>
                  ))}
                  {filteredNotes.length === 0 && (
                    <div style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Nenhuma nota encontrada
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Atribuir a membro da organização */}
          {activeOrg && members.length > 0 && (
            <div>
              <label className="form-label">
                <UserPlus size={16} />
                Atribuir a (opcional)
              </label>
              <select
                className="form-select"
                value={assignedTo || ''}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  setAssignedTo(val);
                  if (val) {
                    const sharedCat = categories.find(c => c.is_shared && c.isSystem);
                    if (sharedCat) setCategoryId(sharedCat.id);
                  }
                }}
              >
                <option value="">Ninguém</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name || m.email || m.user_id}
                  </option>
                ))}
              </select>
              {assignedTo && (
                <p style={{ fontSize: '11px', color: 'var(--color-primary-teal)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} /> Tarefa será movida para a categoria compartilhada
                </p>
              )}
            </div>
          )}

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