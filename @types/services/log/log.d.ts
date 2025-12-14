/**
 * Configuration provider for `$log` service
 */
export class LogProvider {
  /** @type {boolean} */
  debug: boolean;
  /** @private @type {import("./interface.ts").LogServiceFactory | null} */
  private _override;
  /**
   * Override the default {@link LogService} implemenation
   * @param {import("./interface.ts").LogServiceFactory} fn
   */
  setLogger(fn: import("./interface.ts").LogServiceFactory): void;
  /**
   * @private
   * @param {unknown} arg
   *
   */
  private _formatError;
  /**
   * @private
   * @param {string} type
   */
  private _consoleLog;
  /**
   * @returns {ng.LogService}
   */
  $get(): ng.LogService;
}
