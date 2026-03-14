/**
 * A function that logs messages. Accepts any number of arguments.
 */
export type LogCall = (...args: any[]) => void;

/**
 * A function that returns a LogService implementation.
 */
export type LogServiceFactory = (...args: any[]) => LogService;

/**
 * Service for logging messages at various levels.
 */
export interface LogService {
  /**
   * Log a debug message.
   */
  debug: LogCall;

  /**
   * Log an error message.
   */
  error: LogCall;

  /**
   * Log an info message.
   */
  info: LogCall;

  /**
   * Log a general message.
   */
  log: LogCall;

  /**
   * Log a warning message.
   */
  warn: LogCall;
}
