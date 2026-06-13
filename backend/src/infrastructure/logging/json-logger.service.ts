import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

type LogEntry = {
  level: LogLevel;
  timestamp: string;
  context?: string;
  message: string;
  trace?: string;
  [key: string]: unknown;
};

@Injectable()
export class JsonLogger extends ConsoleLogger {
  private readonly jsonEnabled = process.env.LOG_FORMAT === 'json';

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    if (!this.jsonEnabled) {
      super[level](String(message), context);
      return;
    }

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      context,
      message: this.formatLogMessage(message),
      trace,
    };

    if (this.isRecord(message)) {
      Object.assign(entry, message);
    }

    const output = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(`${output}\n`);
      return;
    }

    process.stdout.write(`${output}\n`);
  }

  private formatLogMessage(message: unknown): string {
    if (this.isRecord(message) && typeof message.event === 'string') {
      return message.event;
    }

    return String(message);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
