import { useCallback } from 'react';

export interface UseLoggingReturn {
  logAction: (action: string, resource?: string, details?: Record<string, any>) => void;
  logTaskCreation: (taskId: number, taskTitle: string) => void;
  logTaskUpdate: (taskId: number, changes: Record<string, any>) => void;
  logTaskDeletion: (taskId: number, taskTitle: string) => void;
  logCategoryCreation: (categoryId: number, categoryName: string) => void;
  logCategoryUpdate: (categoryId: number, changes: Record<string, any>) => void;
  logCategoryDeletion: (categoryId: number, categoryName: string) => void;

  logSettingsChange: (setting: string, oldValue: any, newValue: any) => void;
  logError: (error: Error, context: string) => void;
}

export const useLogging = (userId?: string): UseLoggingReturn => {
  const logAction = useCallback((
    action: string,
    resource?: string,
    details?: Record<string, any>
  ) => {
    // Em desenvolvimento, apenas console.log
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 LOG:', { action, resource, userId, success: true, details });
    }

    // Em produção, enviar via IPC para o main process
    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logAction?.({
          action,
          resource,
          userId,
          success: true,
          details
        });
      } catch (error) {
        console.error('Erro ao enviar log via IPC:', error);
      }
    }
  }, [userId]);

  const logTaskCreation = useCallback((taskId: number, taskTitle: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 TASK CREATED:', { userId: userId || 'anonymous', taskId, taskTitle });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logTaskCreation?.(userId || 'anonymous', taskId, taskTitle);
      } catch (error) {
        console.error('Erro ao enviar log de criação de tarefa:', error);
      }
    }
  }, [userId]);

  const logTaskUpdate = useCallback((taskId: number, changes: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✏️ TASK UPDATED:', { userId: userId || 'anonymous', taskId, changes });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logTaskUpdate?.(userId || 'anonymous', taskId, changes);
      } catch (error) {
        console.error('Erro ao enviar log de atualização de tarefa:', error);
      }
    }
  }, [userId]);

  const logTaskDeletion = useCallback((taskId: number, taskTitle: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ TASK DELETED:', { userId: userId || 'anonymous', taskId, taskTitle });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logTaskDeletion?.(userId || 'anonymous', taskId, taskTitle);
      } catch (error) {
        console.error('Erro ao enviar log de exclusão de tarefa:', error);
      }
    }
  }, [userId]);

  const logCategoryCreation = useCallback((categoryId: number, categoryName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📁 CATEGORY CREATED:', { userId: userId || 'anonymous', categoryId, categoryName });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logCategoryCreation?.(userId || 'anonymous', categoryId, categoryName);
      } catch (error) {
        console.error('Erro ao enviar log de criação de categoria:', error);
      }
    }
  }, [userId]);

  const logCategoryUpdate = useCallback((categoryId: number, changes: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✏️ CATEGORY UPDATED:', { userId: userId || 'anonymous', categoryId, changes });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logCategoryUpdate?.(userId || 'anonymous', categoryId, changes);
      } catch (error) {
        console.error('Erro ao enviar log de atualização de categoria:', error);
      }
    }
  }, [userId]);

  const logCategoryDeletion = useCallback((categoryId: number, categoryName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ CATEGORY DELETED:', { userId: userId || 'anonymous', categoryId, categoryName });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logCategoryDeletion?.(userId || 'anonymous', categoryId, categoryName);
      } catch (error) {
        console.error('Erro ao enviar log de exclusão de categoria:', error);
      }
    }
  }, [userId]);



  const logSettingsChange = useCallback((setting: string, oldValue: any, newValue: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚙️ SETTINGS CHANGED:', { userId: userId || 'anonymous', setting, oldValue, newValue });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logSettingsChange?.(userId || 'anonymous', setting, oldValue, newValue);
      } catch (error) {
        console.error('Erro ao enviar log de mudança de configuração:', error);
      }
    }
  }, [userId]);

  const logError = useCallback((error: Error, context: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ ERROR:', { userId: userId || 'anonymous', error: error.message, context, stack: error.stack });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        (window as any).electronAPI?.logging?.logError?.(userId || 'anonymous', error, context);
      } catch (ipcError) {
        console.error('Erro ao enviar log de erro via IPC:', ipcError);
      }
    }
  }, [userId]);

  return {
    logAction,
    logTaskCreation,
    logTaskUpdate,
    logTaskDeletion,
    logCategoryCreation,
    logCategoryUpdate,
    logCategoryDeletion,

    logSettingsChange,
    logError
  };
}; 