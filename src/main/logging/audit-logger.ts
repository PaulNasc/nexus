import { SecureLogger } from './logger';
import { AuditLogEntry } from '../../shared/types/logging';

export interface AuditAction {
  action: string;
  resource?: string;
  userId?: string;
  success: boolean;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logger: SecureLogger;

  private constructor() {
    this.logger = SecureLogger.getInstance();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public logAction(auditAction: AuditAction): void {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: auditAction.success ? 'info' : 'warn',
      message: `Audit: ${auditAction.action}`,
      category: 'security',
      action: auditAction.action,
      resource: auditAction.resource,
      ipAddress: auditAction.ipAddress,
      userAgent: auditAction.userAgent,
      success: auditAction.success,
      userId: auditAction.userId,
      data: auditAction.details
    };

    this.logger.audit(auditEntry);
  }

  // Métodos de conveniência para ações comuns
  public logLogin(userId: string, success: boolean, details?: Record<string, any>): void {
    this.logAction({
      action: 'user_login',
      resource: 'authentication',
      userId,
      success,
      details
    });
  }

  public logLogout(userId: string): void {
    this.logAction({
      action: 'user_logout',
      resource: 'authentication',
      userId,
      success: true
    });
  }

  public logTaskCreation(userId: string, taskId: number, taskTitle: string): void {
    this.logAction({
      action: 'task_created',
      resource: 'tasks',
      userId,
      success: true,
      details: {
        taskId,
        taskTitle
      }
    });
  }

  public logTaskUpdate(userId: string, taskId: number, changes: Record<string, any>): void {
    this.logAction({
      action: 'task_updated',
      resource: 'tasks',
      userId,
      success: true,
      details: {
        taskId,
        changes
      }
    });
  }

  public logTaskDeletion(userId: string, taskId: number, taskTitle: string): void {
    this.logAction({
      action: 'task_deleted',
      resource: 'tasks',
      userId,
      success: true,
      details: {
        taskId,
        taskTitle
      }
    });
  }

  public logCategoryCreation(userId: string, categoryId: number, categoryName: string): void {
    this.logAction({
      action: 'category_created',
      resource: 'categories',
      userId,
      success: true,
      details: {
        categoryId,
        categoryName
      }
    });
  }

  public logCategoryUpdate(userId: string, categoryId: number, changes: Record<string, any>): void {
    this.logAction({
      action: 'category_updated',
      resource: 'categories',
      userId,
      success: true,
      details: {
        categoryId,
        changes
      }
    });
  }

  public logCategoryDeletion(userId: string, categoryId: number, categoryName: string): void {
    this.logAction({
      action: 'category_deleted',
      resource: 'categories',
      userId,
      success: true,
      details: {
        categoryId,
        categoryName
      }
    });
  }



  public logSettingsChange(userId: string, setting: string, oldValue: any, newValue: any): void {
    this.logAction({
      action: 'settings_changed',
      resource: 'settings',
      userId,
      success: true,
      details: {
        setting,
        oldValue,
        newValue
      }
    });
  }

  public logDataExport(userId: string, dataType: string, recordCount: number): void {
    this.logAction({
      action: 'data_exported',
      resource: 'data_management',
      userId,
      success: true,
      details: {
        dataType,
        recordCount
      }
    });
  }

  public logDataImport(userId: string, dataType: string, recordCount: number): void {
    this.logAction({
      action: 'data_imported',
      resource: 'data_management',
      userId,
      success: true,
      details: {
        dataType,
        recordCount
      }
    });
  }

  public logBackupCreated(userId: string, backupSize: number): void {
    this.logAction({
      action: 'backup_created',
      resource: 'data_management',
      userId,
      success: true,
      details: {
        backupSize
      }
    });
  }

  public logBackupRestored(userId: string, backupDate: string): void {
    this.logAction({
      action: 'backup_restored',
      resource: 'data_management',
      userId,
      success: true,
      details: {
        backupDate
      }
    });
  }

  public logPermissionDenied(userId: string, action: string, resource: string, reason: string): void {
    this.logAction({
      action: 'permission_denied',
      resource,
      userId,
      success: false,
      details: {
        attemptedAction: action,
        reason
      }
    });
  }

  public logSuspiciousActivity(userId: string, activity: string, details: Record<string, any>): void {
    this.logAction({
      action: 'suspicious_activity',
      resource: 'security',
      userId,
      success: false,
      details: {
        activity,
        ...details
      }
    });
  }

  public logError(userId: string, error: Error, context: string): void {
    this.logAction({
      action: 'error_occurred',
      resource: context,
      userId,
      success: false,
      details: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      }
    });
  }
}

// Instância global
export const auditLogger = AuditLogger.getInstance(); 