import { StreamConnectionConfig } from "../stream/interface.ts";
import { StreamConnection } from "../stream/stream.js";

/**
 * WebSocket-specific configuration
 */
export interface WebSocketConfig extends StreamConnectionConfig {
  /** Optional WebSocket subprotocols */
  protocols?: string[];

  /** Called when the WebSocket connection closes */
  onClose?: (event: CloseEvent) => void;
}

export type WebSocketService = (
  url: string,
  protocols?: string[],
  config?: WebSocketConfig,
) => StreamConnection;
