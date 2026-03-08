import type { LogServiceFactory } from "./interface.ts";
/**
 * Configuration provider for `$log` service
 */
export declare class LogProvider {
  debug: boolean;
  private _override;
  /** @private */
  constructor();
  /**
   * Override the default {@link LogService} implemenation
   */
  setLogger(fn: LogServiceFactory): void;
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
