export interface WorkerConfig {
  onMessage?: (data: any, event: MessageEvent) => void;
  onError?: (err: ErrorEvent) => void;
  autoRestart?: boolean;
  autoTerminate?: boolean;
  transformMessage?: (data: any) => any;
  logger?: ng.LogService;
  err?: ng.ExceptionHandlerService;
}

export interface WorkerConnection {
  post(data: any): void;
  terminate(): void;
  restart(): void;
  config: WorkerConfig;
}
