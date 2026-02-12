export type TaskStatus = 'backlog' | 'esta_semana' | 'hoje' | 'concluido';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
  workspace_id: number;
  created_at: string;
  updated_at: string;
  isSystem?: boolean; // Para diferenciar categorias padrão das customizadas
  order?: number; // Para ordenação
  is_shared?: boolean; // Categoria compartilhada da organização
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  category_id?: number; // Nova propriedade para categoria customizada
  linkedNoteId?: number; // Vínculo com nota
  created_at: string;
  updated_at: string;
  due_date?: string;
  completed_at?: string;
  priority?: TaskPriority;
  assigned_to?: string; // UUID do usuário destino
  assigned_by?: string; // UUID de quem atribuiu
  is_hidden_from_org?: boolean; // Ocultar da organização
  progress_status?: string; // Tag de progresso (ex: "Movida para Hoje por João")
  progress_updated_by?: string; // UUID de quem atualizou o progresso
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  category_id?: number;
  linkedNoteId?: number;
  priority?: TaskPriority;
  due_date?: string;
  assigned_to?: string;
  progress_status?: string;
  progress_updated_by?: string;
}