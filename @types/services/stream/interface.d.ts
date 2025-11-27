export interface StreamConnectionConfig {
  /** Called when the connection opens */
  onOpen?: (event: Event) => void;
  /** Called when a message is received */
  onMessage?: (data: any, event: Event) => void;
  /** Called when an error occurs */
  onError?: (err: any) => void;
  /** Called when a reconnect attempt happens */
  onReconnect?: (attempt: number) => void;
  /** Delay between reconnect attempts in milliseconds */
  retryDelay?: number;
  /** Maximum number of reconnect attempts */
  maxRetries?: number;
  /** Timeout in milliseconds to detect heartbeat inactivity */
  heartbeatTimeout?: number;
  /** Function to transform incoming messages */
  transformMessage?: (data: any) => any;
}
