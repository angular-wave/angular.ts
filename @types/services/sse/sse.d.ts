/**
 * SSE Provider
 *
 * Usage:
 *   const source = $sse('/events', {
 *     onMessage: (data) => console.log(data),
 *     onError: (err) => console.error(err),
 *     retryDelay: 2000,
 *     heartbeatTimeout: 10000,
 *   });
 *
 *   source.close();
 */
export class SseProvider {
  /**
   * Optional provider-level defaults
   * @type {ng.SseConfig}
   */
  defaults: ng.SseConfig;
  $get: (string | ((log: ng.LogService) => ng.SseService))[];
  $log: import("../log/interface.ts").LogService;
  #private;
}
