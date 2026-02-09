export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  category: 'security' | 'performance' | 'user' | 'system' | 'database' | 'update-download' | 'version';
  userId?: string;
  sessionId?: string;
  data?: Record<string, any>;
  stack?: string;
}

export interface AuditLogEntry extends LogEntry {
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export interface PerformanceLogEntry extends LogEntry {
  duration: number;
  operation: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface SecurityLogEntry extends LogEntry {
  event: 'login' | 'logout' | 'permission_denied' | 'suspicious_activity' | 'api_call';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
}

export interface LogConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  maxEntries: number;
  retentionDays: number;
  encryptLogs: boolean;
  includeStackTraces: boolean;
  categories: {
    security: boolean;
    performance: boolean;
    user: boolean;
    system: boolean;

    database: boolean;
  };
}

export interface LogManager {
  log(entry: LogEntry): void;
  audit(entry: AuditLogEntry): void;
  performance(entry: PerformanceLogEntry): void;
  security(entry: SecurityLogEntry): void;
  getLogs(options?: { level?: string; category?: string; limit?: number; offset?: number }): LogEntry[];
  getLogStats(): { total: number; byLevel: Record<string, number>; byCategory: Record<string, number>; oldestEntry?: string; newestEntry?: string; };
  clearLogs(olderThan?: Date): number;
  exportLogs(options?: { level?: string; category?: string; startDate?: Date; endDate?: Date }): string;
} 