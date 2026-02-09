import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import {
  LogEntry,
  AuditLogEntry,
  PerformanceLogEntry,
  SecurityLogEntry,
  LogConfig,
  LogManager
} from '../../shared/types/logging';

export class SecureLogger implements LogManager {
  private static instance: SecureLogger;
  private logs: LogEntry[] = [];
  private config: LogConfig;
  private logFilePath: string;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.config = this.loadConfig();
    this.config.maxEntries = Math.min(this.config.maxEntries, 6);
    this.logFilePath = this.getLogFilePath();
    this.initializeLogFile();
  }

  public static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  private generateSessionId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  private loadConfig(): LogConfig {
    const defaultConfig: LogConfig = {
      enabled: true,
      level: 'info',
      maxEntries: 6,
      retentionDays: 30,
      encryptLogs: false,
      includeStackTraces: false,
      categories: {
        security: true,
        performance: true,
        user: true,
        system: true,

        database: true
      }
    };

    try {
      // Tentar carregar configuração do localStorage (renderer) ou arquivo (main)
      if (typeof (globalThis as any).window !== 'undefined') {
        const stored = (globalThis as any).window.localStorage.getItem('nexus-log-config')
          || (globalThis as any).window.localStorage.getItem('krigzis-log-config');
        if (stored) {
          (globalThis as any).window.localStorage.setItem('nexus-log-config', stored);
          return { ...defaultConfig, ...JSON.parse(stored) };
        }
      }
    } catch (error) {
      console.error('Error loading log config:', error);
    }

    return defaultConfig;
  }

  private getLogFilePath(): string {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    return path.join(logsDir, `nexus-${new Date().toISOString().split('T')[0]}.log`);
  }

  private initializeLogFile(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        const header = `# Nexus Log File - ${new Date().toISOString()}\n# Session ID: ${this.sessionId}\n\n`;
        fs.writeFileSync(this.logFilePath, header);
      }
    } catch (error) {
      console.error('Error initializing log file:', error);
    }
  }

  private shouldLog(level: string, category: string): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.categories[category as keyof typeof this.config.categories]) return false;

    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const entryLevelIndex = levels.indexOf(level);

    return entryLevelIndex >= configLevelIndex;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'key'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  public createLogEntry(
    level: LogEntry['level'],
    message: string,
    category: LogEntry['category'],
    data?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      sessionId: this.sessionId,
      data: this.sanitizeData(data),
      stack: this.config.includeStackTraces ? new Error().stack : undefined
    };
  }

  public log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level, entry.category)) return;

    entry.sessionId = this.sessionId;
    entry.data = this.sanitizeData(entry.data);

    this.logs.push(entry);
    this.writeToFile(entry);
    this.cleanupOldLogs();
  }

  public audit(entry: AuditLogEntry): void {
    entry.category = 'security';
    entry.sessionId = this.sessionId;
    entry.data = this.sanitizeData(entry.data);

    this.logs.push(entry);
    this.writeToFile(entry);

    // Log de auditoria sempre é importante
    console.log(`[AUDIT] ${entry.action} - ${entry.success ? 'SUCCESS' : 'FAILED'}`);
  }

  public performance(entry: PerformanceLogEntry): void {
    entry.category = 'performance';
    entry.sessionId = this.sessionId;
    entry.data = this.sanitizeData(entry.data);

    this.logs.push(entry);
    this.writeToFile(entry);
  }

  public security(entry: SecurityLogEntry): void {
    entry.category = 'security';
    entry.sessionId = this.sessionId;
    entry.data = this.sanitizeData(entry.data);

    this.logs.push(entry);
    this.writeToFile(entry);

    // Logs de segurança sempre são importantes
    console.log(`[SECURITY] ${entry.event} - ${entry.severity.toUpperCase()}`);
  }

  // Métodos de conveniência para diferentes níveis de log
  public info(message: string, category: LogEntry['category'] = 'system', data?: any): void {
    const entry = this.createLogEntry('info', message, category, data);
    this.log(entry);
  }

  public warn(message: string, category: LogEntry['category'] = 'system', data?: any): void {
    const entry = this.createLogEntry('warn', message, category, data);
    this.log(entry);
  }

  public error(message: string, category: LogEntry['category'] = 'system', data?: any): void {
    const entry = this.createLogEntry('error', message, category, data);
    this.log(entry);
  }

  public debug(message: string, category: LogEntry['category'] = 'system', data?: any): void {
    const entry = this.createLogEntry('debug', message, category, data);
    this.log(entry);
  }

  private writeToFile(entry: LogEntry): void {
    try {
      const logLine = JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString()
      }) + '\n';

      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  private cleanupOldLogs(): void {
    this.config.maxEntries = Math.min(this.config.maxEntries, 6);
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }
  }

  public getLogs(options: {
    level?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    // Filtrar por nível
    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }

    // Filtrar por categoria
    if (options.category) {
      filteredLogs = filteredLogs.filter(log => log.category === options.category);
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar paginação
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  public getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      oldestEntry: undefined as string | undefined,
      newestEntry: undefined as string | undefined
    };

    this.logs.forEach(log => {
      // Contar por nível
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      // Contar por categoria
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    if (this.logs.length > 0) {
      const sortedLogs = [...this.logs].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      stats.oldestEntry = sortedLogs[0].timestamp;
      stats.newestEntry = sortedLogs[sortedLogs.length - 1].timestamp;
    }

    return stats;
  }

  public clearLogs(olderThan?: Date): number {
    const initialCount = this.logs.length;

    if (olderThan) {
      this.logs = this.logs.filter(log =>
        new Date(log.timestamp) >= olderThan
      );
    } else {
      this.logs = [];
    }

    const clearedCount = initialCount - this.logs.length;

    if (clearedCount > 0) {
      try {
        fs.writeFileSync(this.logFilePath, '');
        this.initializeLogFile();
        this.info(`Cleared ${clearedCount} log entries`, 'system');
      } catch (error) {
        console.error('Error clearing logs:', error);
      }
    }

    return clearedCount;
  }

  public exportLogs(options: {
    level?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): string {
    let logsToExport = [...this.logs];

    // Filtros
    if (options.level) {
      logsToExport = logsToExport.filter(log => log.level === options.level);
    }

    if (options.category) {
      logsToExport = logsToExport.filter(log => log.category === options.category);
    }

    if (options.startDate) {
      logsToExport = logsToExport.filter(log =>
        new Date(log.timestamp) >= options.startDate!
      );
    }

    if (options.endDate) {
      logsToExport = logsToExport.filter(log =>
        new Date(log.timestamp) <= options.endDate!
      );
    }

    // Ordenar por timestamp
    logsToExport.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const exportData = {
      exportTimestamp: new Date().toISOString(),
      totalEntries: logsToExport.length,
      filters: options,
      logs: logsToExport
    };

    return JSON.stringify(exportData, null, 2);
  }

  public updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };

    try {
      if (typeof (globalThis as any).window !== 'undefined') {
        (globalThis as any).window.localStorage.setItem('krigzis-log-config', JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('Error saving log config:', error);
    }
  }

  public getConfig(): LogConfig {
    return { ...this.config };
  }
}

// Funções de conveniência para uso global
export const logger = SecureLogger.getInstance();

export const logInfo = (message: string, category: LogEntry['category'] = 'system', data?: any) => {
  logger.log(logger.createLogEntry('info', message, category, data));
};

export const logWarn = (message: string, category: LogEntry['category'] = 'system', data?: any) => {
  logger.log(logger.createLogEntry('warn', message, category, data));
};

export const logError = (message: string, category: LogEntry['category'] = 'system', data?: any) => {
  logger.log(logger.createLogEntry('error', message, category, data));
};

export const logDebug = (message: string, category: LogEntry['category'] = 'system', data?: any) => {
  logger.log(logger.createLogEntry('debug', message, category, data));
}; 