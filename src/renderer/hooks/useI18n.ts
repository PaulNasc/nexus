import { useState, useEffect } from 'react';

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

interface Translations {
  'pt-BR': Record<string, string>;
  'en-US': Record<string, string>;
  'es-ES': Record<string, string>;
}

const translations: Translations = {
  'pt-BR': {
    // Greeting (Dynamic)
    'greeting.morning': 'Bom dia, {{name}}!',
    'greeting.afternoon': 'Boa tarde, {{name}}!',
    'greeting.evening': 'Boa noite, {{name}}!',
    'subtitle': 'Pronto para ser produtivo hoje?',
    
    // Task Lists
    'backlog': 'Backlog',
    'week': 'Esta Semana',
    'today': 'Hoje',
    'done': 'Concluído',
    'tasks': 'tarefas',
    'task': 'tarefa',
    
    // Actions
    'newTask': 'Nova Tarefa',
    'editTask': 'Editar Tarefa',
    'createTask': 'Criar Tarefa',
    'saveChanges': 'Salvar Alterações',
    'cancel': 'Cancelar',
    'delete': 'Excluir',
    'edit': 'Editar',
    'moveTo': 'Mover para...',
    'backToDashboard': 'Voltar ao Dashboard',
    
    // Form Labels
    'title': 'Título',
    'description': 'Descrição',
    'list': 'Lista',
    'priority': 'Prioridade',
    'dueDate': 'Data de Vencimento',
    
    // Priority Labels
    'high': 'Alta',
    'medium': 'Média',
    'low': 'Baixa',
    'noPriority': 'Sem prioridade',
    
    // Placeholders
    'titlePlaceholder': 'Digite o título da tarefa...',
    'descriptionPlaceholder': 'Descreva sua tarefa (opcional)...',
    
    // Validation
    'titleRequired': 'Título é obrigatório',
    'titleMinLength': 'Título deve ter pelo menos 3 caracteres',
    'titleMaxLength': 'Título deve ter no máximo 100 caracteres',
    'descriptionMaxLength': 'Descrição deve ter no máximo 500 caracteres',
    'dueDatePast': 'Data de vencimento não pode ser no passado',
    
    // Toast Messages
    'taskCreated': 'Tarefa criada com sucesso!',
    'taskUpdated': 'Tarefa atualizada com sucesso!',
    'taskDeleted': 'Tarefa excluída com sucesso!',
    'taskMoved': 'Tarefa movida para {{list}}!',
    'timerStarted': 'Timer iniciado! (Em desenvolvimento)',
    
    // Empty States
    'noTasks': 'Nenhuma tarefa encontrada',
    'noTasksDescription': 'Suas tarefas aparecerão aqui quando forem criadas.',
    'noTasksIn': 'Nenhuma tarefa em {{list}}',
    
    // Confirmations
    'deleteConfirm': 'Tem certeza que deseja excluir "{{title}}"?',
    
    // Quick Actions
    'quickActions': 'Ações Rápidas',
    'createTaskDescription': 'Criar uma nova tarefa',
    'startTimer': 'Iniciar Timer',
    'startTimerDescription': 'Começar a cronometrar',
    
    // Footer
    'version': 'Nexus v1.0.0 - Fase 2 Completa',
    
    // Loading
    'loading': 'Carregando Nexus...',
    'loadingDescription': 'Preparando seu ambiente de produtividade',
    
    // Meta
    'createdAt': 'Criado em {{date}}',
    'yourLists': 'Suas Listas',

    // Settings
    'settings.general': 'Geral',
    'settings.appearance': 'Aparência',
    'settings.notifications': 'Notificações',
    'settings.backup': 'Backup',
    'settings.accessibility': 'Acessibilidade',
    'settings.about': 'Sobre',
    'settings.session': 'Sessão',
    'settings.language': 'Idioma',
    'settings.userName': 'Nome do usuário',
    'settings.dailyGoal': 'Meta diária de tarefas',
    'settings.theme': 'Tema',
    'settings.dark': 'Escuro',
    'settings.light': 'Claro',
    'settings.system': 'Seguir sistema',
    'settings.notifications.desktop': 'Exibir notificações desktop',
    'settings.notifications.sound': 'Reproduzir sons de notificação',
    'settings.notifications.test': 'Testar notificação',
    'settings.save': 'Salvar Configurações',
    'settings.reset': 'Restaurar Padrões',
    'settings.saved': 'Configurações salvas com sucesso!',
    'settings.resetConfirm': 'Tem certeza que deseja restaurar as configurações padrão?',

    // Accessibility
    'accessibility.showThemeToggle': 'Mostrar botão de alternância de tema',
    'accessibility.clearData': 'Limpar todos os dados',
    'accessibility.clearDataDesc': 'Remove todas as tarefas e configurações (apenas para hosts)',
    'accessibility.clearDataConfirm': 'Tem certeza que deseja limpar TODOS os dados?',
    'accessibility.clearDataWarning': 'Esta ação não pode ser desfeita. Todas as tarefas e configurações serão perdidas.',
    'accessibility.clearDataSuccess': 'Todos os dados foram removidos com sucesso',
    'accessibility.hostOnly': 'Disponível apenas para hosts de sessão',

    // Productivity
    'productivity.title': 'Produtividade',
    'productivity.tips': 'Dicas de Produtividade',
    'productivity.tipsDesc': 'Exibir dicas diárias no Dashboard',
    'productivity.insights': 'Insights de Progresso',
    'productivity.insightsDesc': 'Exibir análises do seu progresso no Dashboard',
    'productivity.aiAssistant': 'Assistente IA',
    'productivity.aiResponseMode': 'Modo de Resposta da IA',
    'productivity.aiResponseModeDesc': 'Define o nível de detalhe nas respostas da IA',
    'productivity.aiProactive': 'Modo Proativo',
    'productivity.aiProactiveDesc': 'IA sugere ações e melhorias automaticamente',
    'productivity.aiDetailed': 'Detalhado',
    'productivity.aiBalanced': 'Balanceado',
    'productivity.aiConcise': 'Conciso',

    // Notifications
    'notifications.generalSettings': 'Configurações Gerais',
    'notifications.enable': 'Ativar Notificações',
    'notifications.enableDesc': 'Receber notificações do sistema',
    'notifications.sound': 'Som de Notificação',
    'notifications.soundDesc': 'Tocar som ao receber notificações',
    'notifications.categories': 'Categorias de Notificação',
    'notifications.taskReminders': 'Lembretes de Tarefas',
    'notifications.taskRemindersDesc': 'Notificar sobre tarefas com prazo próximo',
    'notifications.todayTasks': 'Tarefas do Dia',
    'notifications.todayTasksDesc': 'Notificar sobre tarefas agendadas para hoje',
    'notifications.overdueTasks': 'Tarefas Atrasadas',
    'notifications.overdueTasksDesc': 'Notificar sobre tarefas com prazo vencido',
    'notifications.productivityInsights': 'Insights de Produtividade',
    'notifications.productivityInsightsDesc': 'Notificar sobre conquistas e estatísticas',
    'notifications.testDesc': 'Envia uma notificação de teste para verificar as configurações',

    // About Section
    'about.title': 'Sobre o Nexus',
    'about.version': 'Versão {{version}}',
    'about.description': 'Sistema de gerenciamento de tarefas com foco em produtividade',
    'about.machineId': 'ID da Máquina',
    'about.installDate': 'Instalado em',
    'about.developer': 'Desenvolvido por Paulo Ricardo',
    'about.license': 'Licença MIT',
    'about.support': 'Suporte Técnico',

    // Session Hosting
    'session.title': 'Hospedagem de Sessão',
    'session.description': 'Compartilhe sua sessão de trabalho com outros usuários',
    'session.create': 'Criar Sessão',
    'session.join': 'Entrar em Sessão',
    'session.sessionName': 'Nome da Sessão',
    'session.password': 'Senha',
    'session.duration': 'Duração (minutos)',
    'session.maxUsers': 'Máximo de usuários',
    'session.active': 'Sessão Ativa',
    'session.participants': 'Participantes',
    'session.end': 'Encerrar Sessão',
    'session.kick': 'Remover Usuário',
    'session.pause': 'Pausar Sessão',
    'session.resume': 'Retomar Sessão',
    'session.code': 'Código da Sessão',
    'session.connecting': 'Conectando...',
    'session.connected': 'Conectado à sessão {{name}}',
    'session.disconnected': 'Desconectado da sessão',
    'session.error': 'Erro na sessão: {{error}}',
  },
  'en-US': {
    // Greeting (Dynamic)
    'greeting.morning': 'Good morning, {{name}}!',
    'greeting.afternoon': 'Good afternoon, {{name}}!',
    'greeting.evening': 'Good evening, {{name}}!',
    'subtitle': 'Ready to be productive today?',
    
    // Task Lists
    'backlog': 'Backlog',
    'week': 'This Week',
    'today': 'Today',
    'done': 'Done',
    'tasks': 'tasks',
    'task': 'task',
    
    // Actions
    'newTask': 'New Task',
    'editTask': 'Edit Task',
    'createTask': 'Create Task',
    'saveChanges': 'Save Changes',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'moveTo': 'Move to...',
    'backToDashboard': 'Back to Dashboard',
    
    // Form Labels
    'title': 'Title',
    'description': 'Description',
    'list': 'List',
    'priority': 'Priority',
    'dueDate': 'Due Date',
    
    // Priority Labels
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
    'noPriority': 'No priority',
    
    // Placeholders
    'titlePlaceholder': 'Enter task title...',
    'descriptionPlaceholder': 'Describe your task (optional)...',
    
    // Validation
    'titleRequired': 'Title is required',
    'titleMinLength': 'Title must be at least 3 characters',
    'titleMaxLength': 'Title must be no more than 100 characters',
    'descriptionMaxLength': 'Description must be no more than 500 characters',
    'dueDatePast': 'Due date cannot be in the past',
    
    // Toast Messages
    'taskCreated': 'Task created successfully!',
    'taskUpdated': 'Task updated successfully!',
    'taskDeleted': 'Task deleted successfully!',
    'taskMoved': 'Task moved to {{list}}!',
    'timerStarted': 'Timer started! (In development)',
    
    // Empty States
    'noTasks': 'No tasks found',
    'noTasksDescription': 'Your tasks will appear here when created.',
    'noTasksIn': 'No tasks in {{list}}',
    
    // Confirmations
    'deleteConfirm': 'Are you sure you want to delete "{{title}}"?',
    
    // Quick Actions
    'quickActions': 'Quick Actions',
    'createTaskDescription': 'Create a new task',
    'startTimer': 'Start Timer',
    'startTimerDescription': 'Start timing',
    
    // Footer
    'version': 'Nexus v1.0.0 - Phase 2 Complete',
    
    // Loading
    'loading': 'Loading Nexus...',
    'loadingDescription': 'Preparing your productivity environment',
    
    // Meta
    'createdAt': 'Created on {{date}}',
    'yourLists': 'Your Lists',

    // Settings
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.notifications': 'Notifications',
    'settings.backup': 'Backup',
    'settings.accessibility': 'Accessibility',
    'settings.about': 'About',
    'settings.session': 'Session',
    'settings.language': 'Language',
    'settings.userName': 'User name',
    'settings.dailyGoal': 'Daily task goal',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.system': 'Follow system',
    'settings.notifications.desktop': 'Show desktop notifications',
    'settings.notifications.sound': 'Play notification sounds',
    'settings.notifications.test': 'Test notification',
    'settings.save': 'Save Settings',
    'settings.reset': 'Reset Defaults',
    'settings.saved': 'Settings saved successfully!',
    'settings.resetConfirm': 'Are you sure you want to reset to default settings?',

    // Accessibility
    'accessibility.showThemeToggle': 'Show theme toggle button',
    'accessibility.clearData': 'Clear all data',
    'accessibility.clearDataDesc': 'Remove all tasks and settings (hosts only)',
    'accessibility.clearDataConfirm': 'Are you sure you want to clear ALL data?',
    'accessibility.clearDataWarning': 'This action cannot be undone. All tasks and settings will be lost.',
    'accessibility.clearDataSuccess': 'All data has been successfully removed',
    'accessibility.hostOnly': 'Available only for session hosts',

    // About Section
    'about.title': 'About Nexus',
    'about.version': 'Version {{version}}',
    'about.description': 'Task management system focused on productivity',
    'about.machineId': 'Machine ID',
    'about.installDate': 'Installed on',
    'about.developer': 'Developed by Paulo Ricardo',
    'about.license': 'MIT License',
    'about.support': 'Technical Support',

    // Session Hosting
    'session.title': 'Session Hosting',
    'session.description': 'Share your work session with other users',
    'session.create': 'Create Session',
    'session.join': 'Join Session',
    'session.sessionName': 'Session Name',
    'session.password': 'Password',
    'session.duration': 'Duration (minutes)',
    'session.maxUsers': 'Maximum users',
    'session.active': 'Active Session',
    'session.participants': 'Participants',
    'session.end': 'End Session',
    'session.kick': 'Remove User',
    'session.pause': 'Pause Session',
    'session.resume': 'Resume Session',
    'session.code': 'Session Code',
    'session.connecting': 'Connecting...',
    'session.connected': 'Connected to session {{name}}',
    'session.disconnected': 'Disconnected from session',
    'session.error': 'Session error: {{error}}',
  },
  'es-ES': {
    // Greeting (Dynamic)
    'greeting.morning': '¡Buenos días, {{name}}!',
    'greeting.afternoon': '¡Buenas tardes, {{name}}!',
    'greeting.evening': '¡Buenas noches, {{name}}!',
    'subtitle': '¿Listo para ser productivo hoy?',
    
    // Task Lists
    'backlog': 'Pendientes',
    'week': 'Esta Semana',
    'today': 'Hoy',
    'done': 'Completado',
    'tasks': 'tareas',
    'task': 'tarea',
    
    // Actions
    'newTask': 'Nueva Tarea',
    'editTask': 'Editar Tarea',
    'createTask': 'Crear Tarea',
    'saveChanges': 'Guardar Cambios',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar',
    'moveTo': 'Mover a...',
    'backToDashboard': 'Volver al Panel',
    
    // Form Labels
    'title': 'Título',
    'description': 'Descripción',
    'list': 'Lista',
    'priority': 'Prioridad',
    'dueDate': 'Fecha de Vencimiento',
    
    // Priority Labels
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja',
    'noPriority': 'Sin prioridad',
    
    // Placeholders
    'titlePlaceholder': 'Ingresa el título de la tarea...',
    'descriptionPlaceholder': 'Describe tu tarea (opcional)...',
    
    // Validation
    'titleRequired': 'El título es obligatorio',
    'titleMinLength': 'El título debe tener al menos 3 caracteres',
    'titleMaxLength': 'El título debe tener máximo 100 caracteres',
    'descriptionMaxLength': 'La descripción debe tener máximo 500 caracteres',
    'dueDatePast': 'La fecha de vencimiento no puede ser en el pasado',
    
    // Toast Messages
    'taskCreated': '¡Tarea creada exitosamente!',
    'taskUpdated': '¡Tarea actualizada exitosamente!',
    'taskDeleted': '¡Tarea eliminada exitosamente!',
    'taskMoved': '¡Tarea movida a {{list}}!',
    'timerStarted': '¡Timer iniciado! (En desarrollo)',
    
    // Empty States
    'noTasks': 'No se encontraron tareas',
    'noTasksDescription': 'Tus tareas aparecerán aquí cuando las crees.',
    'noTasksIn': 'No hay tareas en {{list}}',
    
    // Confirmations
    'deleteConfirm': '¿Estás seguro de que quieres eliminar "{{title}}"?',
    
    // Quick Actions
    'quickActions': 'Acciones Rápidas',
    'createTaskDescription': 'Crear una nueva tarea',
    'startTimer': 'Iniciar Timer',
    'startTimerDescription': 'Comenzar a cronometrar',
    
    // Footer
    'version': 'Nexus v1.0.0 - Fase 2 Completa',
    
    // Loading
    'loading': 'Cargando Nexus...',
    'loadingDescription': 'Preparando tu entorno de productividad',
    
    // Meta
    'createdAt': 'Creado el {{date}}',
    'yourLists': 'Tus Listas',

    // Settings
    'settings.general': 'General',
    'settings.appearance': 'Apariencia',
    'settings.notifications': 'Notificaciones',
    'settings.backup': 'Respaldo',
    'settings.accessibility': 'Accesibilidad',
    'settings.about': 'Acerca de',
    'settings.session': 'Sesión',
    'settings.language': 'Idioma',
    'settings.userName': 'Nombre de usuario',
    'settings.dailyGoal': 'Meta diaria de tareas',
    'settings.theme': 'Tema',
    'settings.dark': 'Oscuro',
    'settings.light': 'Claro',
    'settings.system': 'Seguir sistema',
    'settings.notifications.desktop': 'Mostrar notificaciones de escritorio',
    'settings.notifications.sound': 'Reproducir sonidos de notificación',
    'settings.notifications.test': 'Probar notificación',
    'settings.save': 'Guardar Configuración',
    'settings.reset': 'Restaurar Predeterminados',
    'settings.saved': '¡Configuración guardada exitosamente!',
    'settings.resetConfirm': '¿Estás seguro de que quieres restaurar la configuración predeterminada?',

    // Accessibility
    'accessibility.showThemeToggle': 'Mostrar botón de alternancia de tema',
    'accessibility.clearData': 'Limpiar todos los datos',
    'accessibility.clearDataDesc': 'Eliminar todas las tareas y configuraciones (solo para hosts)',
    'accessibility.clearDataConfirm': '¿Estás seguro de que quieres borrar TODOS los datos?',
    'accessibility.clearDataWarning': 'Esta acción no se puede deshacer. Se perderán todas las tareas y configuraciones.',
    'accessibility.clearDataSuccess': 'Todos los datos se han eliminado correctamente',
    'accessibility.hostOnly': 'Disponible solo para hosts de sesión',

    // About Section
    'about.title': 'Acerca de Nexus',
    'about.version': 'Versión {{version}}',
    'about.description': 'Sistema de gestión de tareas enfocado en productividad',
    'about.machineId': 'ID de Máquina',
    'about.installDate': 'Instalado el',
    'about.developer': 'Desarrollado por Paulo Ricardo',
    'about.license': 'Licencia MIT',
    'about.support': 'Soporte Técnico',

    // Session Hosting
    'session.title': 'Hospedaje de Sesión',
    'session.description': 'Comparte tu sesión de trabajo con otros usuarios',
    'session.create': 'Crear Sesión',
    'session.join': 'Unirse a Sesión',
    'session.sessionName': 'Nombre de Sesión',
    'session.password': 'Contraseña',
    'session.duration': 'Duración (minutos)',
    'session.maxUsers': 'Máximo de usuarios',
    'session.active': 'Sesión Activa',
    'session.participants': 'Participantes',
    'session.end': 'Finalizar Sesión',
    'session.kick': 'Remover Usuario',
    'session.pause': 'Pausar Sesión',
    'session.resume': 'Reanudar Sesión',
    'session.code': 'Código de Sesión',
    'session.connecting': 'Conectando...',
    'session.connected': 'Conectado a la sesión {{name}}',
    'session.disconnected': 'Desconectado de la sesión',
    'session.error': 'Error de sesión: {{error}}',
  }
};

const STORAGE_KEY = 'nexus-language';
const LEGACY_STORAGE_KEY = 'krigzis-language';

const DEFAULT_LANGUAGE: Language = 'pt-BR';

export const useI18n = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  // Load language from localStorage on mount
  useEffect(() => {
    try {
      const storedLanguage = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) as Language;
      if (storedLanguage && translations[storedLanguage]) {
        setCurrentLanguage(storedLanguage);
        localStorage.setItem(STORAGE_KEY, storedLanguage);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currentLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  }, [currentLanguage]);

  const t = (key: string, replacements?: Record<string, string>): string => {
    let translation = translations[currentLanguage][key] || translations[DEFAULT_LANGUAGE][key] || key;
    
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        translation = translation.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
      });
    }
    
    return translation;
  };

  const changeLanguage = (language: Language) => {
    if (translations[language]) {
      setCurrentLanguage(language);
    }
  };

  const getAvailableLanguages = (): { code: Language; name: string }[] => {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'es-ES', name: 'Español' },
    ];
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    getAvailableLanguages,
  };
}; 