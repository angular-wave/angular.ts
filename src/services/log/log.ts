import { isError } from "../../shared/utils.ts";

/**
 * A function that logs messages. Accepts any number of arguments.
 */
export type LogCall = (...args: any[]) => void;

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

/**
 * A function that returns a LogService implementation.
 */
export type LogServiceFactory = (...args: any[]) => LogService;

/**
 * Configuration provider for `$log` service
 */
export class LogProvider {
  debug: boolean;
  private _override: LogServiceFactory | null;

  /** @private */
  constructor() {
    this.debug = false;
    this._override = null;
  }

  /**
   * Override the default {@link LogService} implemenation
   */
  setLogger(fn: LogServiceFactory): void {
    this._override = fn;
  }

  /**
   * @private
   * Normalizes `Error` objects into readable log output.
   */
  private _formatError(arg: unknown): unknown {
    if (isError(arg)) {
      if (arg.stack) {
        arg =
          arg.message && arg.stack.indexOf(arg.message) === -1
            ? `Error: ${arg.message}\n${arg.stack}`
            : arg.stack;
      }
    }

    return arg;
  }

  /**
   * @private
   * Builds a console-backed logger for the requested method name.
   */
  private _consoleLog(type: string): LogCall {
    const console =
      (window.console as Console & Record<string, LogCall>) ||
      ({} as Partial<Record<string, LogCall>> & Record<string, LogCall>);

    const logFn =
      console[type] ||
      console.log ||
      (() => {
        /* empty */
      });

    return (...args) => {
      const formattedArgs = args.map((arg) => this._formatError(arg));

      return logFn.apply(console, formattedArgs as any[]);
    };
  }

  /** Creates the runtime `$log` service. */
  $get(): ng.LogService {
    if (this._override) {
      return this._override();
    }

    return {
      log: this._consoleLog("log"),
      info: this._consoleLog("info"),
      warn: this._consoleLog("warn"),
      error: this._consoleLog("error"),
      debug: (() => {
        const fn = this._consoleLog("debug");

        return (...args: unknown[]) => {
          if (this.debug) {
            fn.apply(this, args);
          }
        };
      })(),
    };
  }
}
