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

/**
 * Type of the injectable WebSocket service returned by the provider.
 * Acts as a factory for pre-configured WebSocket connections.
 */
export type WebSocketService = (
  /** The WebSocket URL (already pre-configured if passed at module registration) */
  url?: string,
  /** Optional WebSocket subprotocols */
  protocols?: string[],
  /** Optional configuration (merges with defaults) */
  config?: WebSocketConfig,
) => StreamConnection;
