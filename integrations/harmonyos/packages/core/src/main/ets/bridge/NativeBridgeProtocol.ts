export const NATIVE_BRIDGE_PROTOCOL_VERSION = 1;
export const NATIVE_BRIDGE_MAX_MESSAGE_BYTES = 256 * 1024;

export type NativeBridgeErrorCode =
  | "internal"
  | "cancelled"
  | "denied"
  | "permanently_denied"
  | "interrupted"
  | "invalid_message"
  | "invalid_params"
  | "invalid_property"
  | "payload_too_large"
  | "protocol_mismatch"
  | "unauthorized"
  | "unknown_element"
  | "unknown_instance"
  | "unknown_method"
  | "unknown_target"
  | "unavailable";

export interface NativeBridgeRequest {
  readonly id: string;
  readonly target: string;
  readonly method: string;
  readonly params: Readonly<Record<string, unknown>> | null;
  readonly session: string | null;
}

export interface NativeBridgeParseSuccess {
  readonly ok: true;
  readonly request: NativeBridgeRequest;
}

export interface NativeBridgeParseFailure {
  readonly ok: false;
  readonly id: string | null;
  readonly code: NativeBridgeErrorCode;
  readonly message: string;
}

export type NativeBridgeParseResult =
  | NativeBridgeParseSuccess
  | NativeBridgeParseFailure;

export function parseNativeBridgeRequest(
  message: string | null | undefined,
): NativeBridgeParseResult {
  if (message === null || message === undefined || message.trim().length === 0) {
    return failure(null, "invalid_message", "Native message is empty");
  }
  if (utf8ByteLength(message) > NATIVE_BRIDGE_MAX_MESSAGE_BYTES) {
    return failure(
      null,
      "payload_too_large",
      `Native message exceeds ${NATIVE_BRIDGE_MAX_MESSAGE_BYTES} bytes`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return failure(null, "invalid_message", "Native message is not valid JSON");
  }
  if (!isRecord(parsed)) {
    return failure(null, "invalid_message", "Native message must be an object");
  }

  const id = nonEmptyString(parsed.id);
  if (id === null) {
    return failure(null, "invalid_message", "Native message requires id");
  }
  if (parsed.protocol !== NATIVE_BRIDGE_PROTOCOL_VERSION) {
    return failure(id, "protocol_mismatch", "Unsupported native protocol version");
  }

  const target = nonEmptyString(parsed.target);
  if (target === null) {
    return failure(id, "invalid_message", "Native message requires target");
  }
  const method = nonEmptyString(parsed.method);
  if (method === null) {
    return failure(id, "invalid_message", "Native message requires method");
  }
  let params: Readonly<Record<string, unknown>> | null = null;
  if (parsed.params !== undefined && parsed.params !== null) {
    if (!isRecord(parsed.params)) {
      return failure(id, "invalid_params", "Native message params must be an object");
    }
    params = parsed.params;
  }
  if (parsed.session !== undefined && nonEmptyString(parsed.session) === null) {
    return failure(id, "invalid_message", "Native message session must be a non-empty string");
  }

  return {
    ok: true,
    request: {
      id,
      target,
      method,
      params,
      session:
        parsed.session === undefined ? null : nonEmptyString(parsed.session),
    },
  };
}

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function failure(
  id: string | null,
  code: NativeBridgeErrorCode,
  message: string,
): NativeBridgeParseFailure {
  return { ok: false, id, code, message };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
