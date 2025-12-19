export class SseProvider {
  /** @type {ng.SseConfig} */
  defaults: ng.SseConfig;
  $get: (
    | string
    | ((
        log: ng.LogService,
      ) => (
        url: string,
        config?: import("./interface.ts").SseConfig,
      ) => import("./interface.ts").SseConnection)
  )[];
  _$log: import("../log/interface.ts").LogService;
  #private;
}
