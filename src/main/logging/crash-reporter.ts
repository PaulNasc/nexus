import { app, crashReporter as electronCrashReporter } from 'electron';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';

export interface CrashReport {
  id: string;
  timestamp: string;
  type: 'main' | 'renderer' | 'gpu';
  error?: string;
  stack?: string;
  context?: Record<string, unknown>;
  sessionId: string;
  appVersion: string;
  platform: string;
}

export interface CrashReportOptions {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  type?: 'main' | 'renderer' | 'gpu';
}

export class CrashReporterManager {
  private static instance: CrashReporterManager;
  private crashReportsPath: string;
  private sessionId: string;
  private initialized = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.crashReportsPath = this.getCrashReportsPath();
    this.ensureCrashReportsDir();
  }

  public static getInstance(): CrashReporterManager {
    if (!CrashReporterManager.instance) {
      CrashReporterManager.instance = new CrashReporterManager();
    }
    return CrashReporterManager.instance;
  }

  private generateSessionId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  private getCrashReportsPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'crash-reports');
  }

  private ensureCrashReportsDir(): void {
    try {
      if (!fs.existsSync(this.crashReportsPath)) {
        fs.mkdirSync(this.crashReportsPath, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating crash reports directory:', error);
    }
  }

  public initialize(uploadToServer = false): void {
    if (this.initialized) return;

    try {
      if (uploadToServer) {
        // Configure Electron's built-in crash reporter if needed
        electronCrashReporter.start({
          productName: 'Nexus',
          companyName: 'Nexus',
          submitURL: '', // Add your crash report server URL here
          uploadToServer: false, // Set to true when you have a server
          ignoreSystemCrashHandler: false,
          compress: true,
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing crash reporter:', error);
    }
  }

  public reportCrash(
    type: 'main' | 'renderer' | 'gpu',
    error: Error | string,
    context?: Record<string, unknown>
  ): void {
    try {
      const report: CrashReport = {
        id: createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 16),
        timestamp: new Date().toISOString(),
        type,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        sessionId: this.sessionId,
        appVersion: app.getVersion(),
        platform: process.platform,
      };

      const reportPath = path.join(
        this.crashReportsPath,
        `crash-${report.timestamp.replace(/[:.]/g, '-')}-${report.id}.json`
      );

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.error(`Crash report saved: ${reportPath}`);
    } catch (err) {
      console.error('Error saving crash report:', err);
    }
  }

  public getCrashReports(options: CrashReportOptions = {}): CrashReport[] {
    try {
      const files = fs.readdirSync(this.crashReportsPath)
        .filter(f => f.startsWith('crash-') && f.endsWith('.json'))
        .sort()
        .reverse();

      const reports: CrashReport[] = [];

      for (const file of files) {
        if (options.limit && reports.length >= options.limit) break;

        try {
          const filePath = path.join(this.crashReportsPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const report = JSON.parse(content) as CrashReport;

          // Apply filters
          if (options.type && report.type !== options.type) continue;
          if (options.startDate && new Date(report.timestamp) < options.startDate) continue;
          if (options.endDate && new Date(report.timestamp) > options.endDate) continue;

          reports.push(report);
        } catch (err) {
          console.error(`Error reading crash report ${file}:`, err);
        }
      }

      return reports;
    } catch (error) {
      console.error('Error getting crash reports:', error);
      return [];
    }
  }

  public clearOldReports(olderThanDays = 30): number {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const files = fs.readdirSync(this.crashReportsPath)
        .filter(f => f.startsWith('crash-') && f.endsWith('.json'));

      let deletedCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.crashReportsPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const report = JSON.parse(content) as CrashReport;

          if (new Date(report.timestamp) < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (err) {
          console.error(`Error processing crash report ${file}:`, err);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error clearing old crash reports:', error);
      return 0;
    }
  }

  public deleteCrashReport(reportId: string): boolean {
    try {
      const files = fs.readdirSync(this.crashReportsPath)
        .filter(f => f.includes(reportId) && f.endsWith('.json'));

      if (files.length === 0) return false;

      for (const file of files) {
        fs.unlinkSync(path.join(this.crashReportsPath, file));
      }

      return true;
    } catch (error) {
      console.error('Error deleting crash report:', error);
      return false;
    }
  }

  public getReportsPath(): string {
    return this.crashReportsPath;
  }
}

// Export singleton instance
export const crashReporterManager = CrashReporterManager.getInstance();
