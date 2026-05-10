import { isObject } from "../../shared/utils.ts";

/**
 * Possible values for `data-swap` and realtime protocol `swap` fields.
 */
export const SwapMode = {
  /** (default) Replaces the contents inside the element */
  innerHTML: "innerHTML",

  /** Replaces the entire element, including the tag itself */
  outerHTML: "outerHTML",

  /** Inserts plain text (without parsing HTML) */
  textContent: "textContent",

  /** Inserts HTML immediately before the element itself */
  beforebegin: "beforebegin",

  /** Inserts HTML inside the element, before its first child */
  afterbegin: "afterbegin",

  /** Inserts HTML inside the element, after its last child */
  beforeend: "beforeend",

  /** Inserts HTML immediately after the element itself */
  afterend: "afterend",

  /** Removes the element entirely */
  delete: "delete",

  /** Performs no insertion (no-op) */
  none: "none",
} as const;

/**
 * Union type representing all possible DOM insertion modes.
 */
export type SwapModeType = keyof typeof SwapMode;

export interface RealtimeProtocolMessage {
  /** Plain value used as swap content when `html` is omitted. */
  data?: unknown;
  /** HTML or text payload to apply with the configured swap mode. */
  html?: unknown;
  /** Optional CSS selector that overrides the directive target for this message. */
  target?: string;
  /** Optional swap mode that overrides the directive swap mode for this message. */
  swap?: SwapModeType;
}

export interface RealtimeProtocolEventDetail<T = unknown, TSource = unknown> {
  data?: T;
  event?: Event | MessageEvent | null;
  source?: TSource;
  url?: string;
  error?: unknown;
}

export type SseProtocolMessage = RealtimeProtocolMessage;

export type SseProtocolEventDetail<T = unknown> = RealtimeProtocolEventDetail<
  T,
  ng.SseConnection
>;

export function isRealtimeProtocolMessage(
  data: unknown,
): data is RealtimeProtocolMessage {
  return (
    isObject(data) && ("html" in data || "target" in data || "swap" in data)
  );
}

export function getRealtimeProtocolContent(
  data: RealtimeProtocolMessage,
): unknown {
  return "html" in data ? data.html : data.data;
}
