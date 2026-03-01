import path from 'path';
import fs from 'fs';
import { app } from 'electron';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private _logDir: string | null = null;
  private _logFile: string | null = null;

  private get logDir(): string {
    if (!this._logDir) {
      this._logDir = path.join(app.getPath('userData'), 'logs');
      this.ensureLogDir();
    }
    return this._logDir;
  }

  private get logFile(): string {
    if (!this._logFile) {
      this._logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);
    }
    return this._logFile;
  }

  private ensureLogDir(): void {
    if (this._logDir && !fs.existsSync(this._logDir)) {
      fs.mkdirSync(this._logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data !== undefined) {
      logMessage += ` ${JSON.stringify(data)}`;
    }
    return logMessage;
  }

  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  debug(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('debug', message, data);
    console.debug(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  info(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('info', message, data);
    console.info(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  warn(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('warn', message, data);
    console.warn(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  error(message: string, data?: any): void {
    const formattedMessage = this.formatMessage('error', message, data);
    console.error(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  cleanOldLogs(daysToKeep = 7): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}

export const logger = new Logger();
