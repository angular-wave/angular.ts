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

  /** @private */
  formatError(arg) {
    if (isError(arg)) {
      if (arg.stack) {
        arg =
          arg.message && arg.stack.indexOf(arg.message) === -1
            ? `Error: ${arg.message}\n${arg.stack}`
            : arg.stack;
      } else if (arg.sourceURL) {
        arg = `${arg.message}\n${arg.sourceURL}:${arg.line}`;
      }
    }
    return arg;
  }

  /**
   * @private
   * @param {string} type
   */
  consoleLog(type) {
    const console = window.console || {};
    const logFn = console[type] || console.log || (() => {});

    return (...args) => {
      const formattedArgs = args.map((arg) => this.formatError(arg));
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
      log: this.consoleLog("log"),
      info: this.consoleLog("info"),
      warn: this.consoleLog("warn"),
      error: this.consoleLog("error"),
      debug: (() => {
        const fn = this.consoleLog("debug");
        return (...args) => {
          if (this.debug) {
            fn.apply(this, args);
          }
        };
      })(),
    };
  }
}
