/**
 * AuditLogger - System Audit & User Operation Logger for Nexus v1.4.0
 * Stores logs in localStorage + forwards to desktop API where applicable.
 */

export type AuditLogLevel = 'info' | 'warn' | 'error' | 'debug';
export type AuditLogCategory = 'notes' | 'tasks' | 'settings' | 'auth' | 'org' | 'system' | 'import_export';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: AuditLogLevel;
  category: AuditLogCategory;
  message: string;
  user_name?: string;
  details?: Record<string, unknown>;
}

const STORAGE_KEY = 'nexus_audit_logs';
const MAX_LOGS = 500;

class AuditLogger {
  private getActiveUserInfo(): { user_name: string; user_email: string } {
    try {
      const storedSettings = localStorage.getItem('nexus_settings');
      let userName = 'Paulo';
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.userName) userName = parsed.userName;
      }
      return { user_name: userName, user_email: 'paulo@nexus.app' };
    } catch {
      return { user_name: 'Paulo', user_email: 'paulo@nexus.app' };
    }
  }

  private getStoredLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveLogs(logs: AuditLogEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
    } catch (err) {
      console.warn('Failed to save audit logs:', err);
    }
  }

  public log(level: AuditLogLevel, category: AuditLogCategory, message: string, details?: Record<string, unknown>): AuditLogEntry {
    const userInfo = this.getActiveUserInfo();
    const mergedDetails = {
      executor_user: `${userInfo.user_name} (${userInfo.user_email})`,
      timestamp_iso: new Date().toISOString(),
      ...details,
    };

    const entry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      user_name: userInfo.user_name,
      details: mergedDetails,
    };

    const current = this.getStoredLogs();
    current.unshift(entry);
    this.saveLogs(current);

    // Forward to electron logging if present
    const electronAPI = (window as unknown as { electronAPI?: { logging?: { log?: (l: string, msg: string, cat?: string, data?: unknown) => void } } }).electronAPI;
    if (electronAPI?.logging?.log) {
      electronAPI.logging.log(level, message, category, details);
    }

    return entry;
  }

  public info(category: AuditLogCategory, message: string, details?: Record<string, unknown>): AuditLogEntry {
    return this.log('info', category, message, details);
  }

  public warn(category: AuditLogCategory, message: string, details?: Record<string, unknown>): AuditLogEntry {
    return this.log('warn', category, message, details);
  }

  public error(category: AuditLogCategory, message: string, details?: Record<string, unknown>): AuditLogEntry {
    return this.log('error', category, message, details);
  }

  public getLogs(filter?: { level?: string; category?: string; search?: string }): AuditLogEntry[] {
    let logs = this.getStoredLogs();
    if (filter?.level) {
      logs = logs.filter(l => l.level === filter.level);
    }
    if (filter?.category) {
      logs = logs.filter(l => l.category === filter.category);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      logs = logs.filter(l =>
        l.message.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
      );
    }
    return logs;
  }

  public clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear audit logs:', err);
    }
  }
}

export const auditLogger = new AuditLogger();
