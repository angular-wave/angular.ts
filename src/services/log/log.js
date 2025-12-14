import { isError } from "../../shared/utils.js";

/**
 * Configuration provider for `$log` service
 */
export class LogProvider {
  /** @private */
  constructor() {
    /** @type {boolean} */
    this.debug = false;
    /** @private @type {import("./interface.ts").LogServiceFactory | null} */
    this._override = null;
  }

  /**
   * Override the default {@link LogService} implemenation
   * @param {import("./interface.ts").LogServiceFactory} fn
   */
  setLogger(fn) {
    this._override = fn;
  }

  /**
   * @private
   * @param {unknown} arg
   *
   */
  _formatError(arg) {
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
  _consoleLog(type) {
    const console = window.console || {};

    const logFn =
      console[type] ||
      console.log ||
      (() => {
        /* empty */
      });

    return (...args) => {
      const formattedArgs = args.map((arg) => this._formatError(arg));

      return logFn.apply(console, formattedArgs);
    };
  }

  /**
   * @returns {ng.LogService}
   */
  $get() {
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

        return (...args) => {
          if (this.debug) {
            fn.apply(this, args);
          }
        };
      })(),
    };
  }
}
