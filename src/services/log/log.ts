import { isError } from "../../shared/utils.ts";
import type { LogCall, LogServiceFactory } from "./interface.ts";

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
   * @param {unknown} arg
   *
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
   * @param {string} type
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

  /**
   * @returns {ng.LogService}
   */
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
