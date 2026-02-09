import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Palette,
  AlertCircle,
  Check,
  ShieldCheck,
  Home,
  BookOpen,
  Briefcase,
  Heart,
  ShoppingCart,
  Target,
  DollarSign,
  Plane,
  Car,
  Music,
  Gamepad2,
  Smartphone,
  Laptop,
  Tv,
  Dumbbell,
  Users,
  Star,
  Flag,
  ClipboardList,
  CalendarDays,
  Zap,
  CheckCircle
} from 'lucide-react';
import { useCategories } from '../contexts/CategoriesContext';
import { useTheme } from '../hooks/useTheme';
import { Category } from '../../shared/types/task';

// Mapeamento de ícones
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: { [key: string]: React.ComponentType<any> } = {
  Folder,
  Home,
  BookOpen,
  Briefcase,
  Heart,
  ShoppingCart,
  Target,
  DollarSign,
  Plane,
  Car,
  Music,
  Gamepad2,
  Smartphone,
  Laptop,
  Tv,
  Dumbbell,
  Users,
  Star,
  Flag,
  ClipboardList,
  CalendarDays,
  Zap,
  CheckCircle
};

// Função para renderizar ícone
const renderIcon = (iconName: string, size: number = 20) => {
  const IconComponent = iconMap[iconName] || Folder;
  return <IconComponent size={size} strokeWidth={1.5} />;
};

interface CreateCategoryData {
  name: string;
  color: string;
  icon?: string;
}

interface CategoryManagerProps {
  onSave?: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onSave }) => {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories();
  const { theme } = useTheme();
  
  const isDark = theme.mode === 'dark';
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<CreateCategoryData>({
    name: '',
    color: '#00D4AA',
    icon: 'Folder'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const predefinedColors = [
    '#00D4AA', '#7B3FF2', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
  ];

  const predefinedIcons = [
    'Folder', 'Home', 'BookOpen', 'Briefcase', 'Heart', 
    'Target', 'DollarSign', 'ShoppingCart', 'Plane', 'Car',
    'Music', 'Gamepad2', 'Smartphone', 'Laptop', 'Tv',
    'Dumbbell', 'Users', 'Star', 'Flag', 'ClipboardList'
  ];

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setLocalError('Nome da categoria é obrigatório');
      return;
    }

    try {
      createCategory(newCategory);
      
      setNewCategory({ name: '', color: '#00D4AA', icon: 'Folder' });
      setShowAddForm(false);
      setSuccess('Categoria criada com sucesso!');
      if (onSave) onSave();
    } catch (err) {
      setLocalError('Erro ao criar categoria');
      console.error('Error creating category:', err);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      updateCategory(editingCategory.id, editingCategory);
      setEditingCategory(null);
      setSuccess('Categoria atualizada com sucesso!');
      if (onSave) onSave();
    } catch (err) {
      setLocalError('Erro ao atualizar categoria');
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    try {
      const deleted = await deleteCategory(categoryId);
      if (deleted) {
        setSuccess('Categoria excluída com sucesso!');
        if (onSave) onSave();
      }
    } catch (err) {
      setLocalError('Erro ao excluir categoria');
      console.error('Error deleting category:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando categorias...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxHeight: '600px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Folder size={24} style={{ marginRight: '12px', color: '#00D4AA' }} />
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 600,
            color: isDark ? '#FFFFFF' : '#1F2937',
            margin: 0
          }}>
            Gerenciar Categorias
          </h2>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#00D4AA',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#00B894';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#00D4AA';
          }}
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {/* Messages */}
      {(localError || success) && (
        <div style={{ marginBottom: '16px' }}>
          {localError && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#DC2626',
            }}>
              <AlertCircle size={16} />
              {localError}
              <button
                onClick={() => setLocalError(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#DC2626',
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {success && (
            <div style={{
              padding: '12px',
              backgroundColor: '#D1FAE5',
              border: '1px solid #6EE7B7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#059669',
            }}>
              <Check size={16} />
              {success}
              <button
                onClick={() => setSuccess(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#059669',
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: '12px',
          marginBottom: '20px',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            Nova Categoria
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                Nome
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Ex: Projetos Pessoais"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                <Palette size={16} style={{ display: 'inline', marginRight: '4px' }} />
                Cor
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: color,
                      border: newCategory.color === color ? '3px solid var(--text-primary)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                Ícone
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {predefinedIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewCategory({ ...newCategory, icon })}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: newCategory.icon === icon ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                      border: newCategory.icon === icon ? '2px solid #00D4AA' : '2px solid var(--color-border-primary)',
                      cursor: 'pointer',
                      fontSize: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      color: newCategory.icon === icon ? '#00D4AA' : 'var(--text-secondary)',
                    }}
                  >
                    {renderIcon(icon, 18)}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={handleCreateCategory}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#00D4AA',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Save size={16} />
                Salvar
              </button>
              
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCategory({ name: '', color: '#00D4AA', icon: 'Folder' });
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {categories.map((category) => (
          <div
            key={category.id}
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.2s ease',
            }}
          >
            {editingCategory?.id === category.id ? (
              // Edit Mode
              <>
                <div style={{ flex: 1, display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  
                  {/* Color Selection */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditingCategory({ ...editingCategory, color })}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: color,
                          border: editingCategory.color === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Icon Selection */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {predefinedIcons.slice(0, 10).map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setEditingCategory({ ...editingCategory, icon })}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: editingCategory.icon === icon ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                          border: editingCategory.icon === icon ? '2px solid #00D4AA' : '2px solid var(--color-border-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          color: editingCategory.icon === icon ? '#00D4AA' : 'var(--text-secondary)',
                        }}
                      >
                        {renderIcon(icon, 14)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleUpdateCategory}
                    style={{
                      padding: '8px',
                      backgroundColor: '#00D4AA',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Save size={16} />
                  </button>
                  
                  <button
                    onClick={() => setEditingCategory(null)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </>
            ) : (
              // View Mode
              <>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: category.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                    color: category.color,
                  }}
                >
                  {renderIcon(category.icon || 'Folder', 20)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0
                    }}>
                      {category.name}
                    </h4>
                    {category.isSystem && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        <ShieldCheck size={12} />
                        Sistema
                      </div>
                    )}
                  </div>
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-secondary)',
                    margin: '4px 0 0 0'
                  }}>
                    {category.task_count || 0} tarefas
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditingCategory(category)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Edit2 size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: '#EF4444',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      {categories.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: 'var(--text-secondary)',
        }}>
          <Folder size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>Nenhuma categoria encontrada.</p>
          <p>Clique em "Nova Categoria" para começar.</p>
        </div>
      )}
    </div>
  );
}; 
 
 