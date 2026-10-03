const MAX_REQUEST_LENGTH = 1024 * 1024;
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

type JsonRecord = Record<string, unknown>;

/** Converts WebAuthn creation JSON into the binary fields expected by HarmonyOS. */
export function credentialCreationOptions(requestJson: string): JsonRecord {
  const options = parseRequest(requestJson, "credentials.create-passkey");
  const publicKey = record(options.publicKey ?? options, "publicKey");
  const user = record(publicKey.user, "publicKey.user");
  const normalized: JsonRecord = {
    ...publicKey,
    challenge: binary(publicKey.challenge, "publicKey.challenge"),
    user: {
      ...user,
      id: binary(user.id, "publicKey.user.id"),
    },
  };
  if (publicKey.excludeCredentials !== undefined) {
    normalized.excludeCredentials = descriptors(
      publicKey.excludeCredentials,
      "publicKey.excludeCredentials",
    );
  }
  return { ...options, publicKey: normalized };
}

/** Converts WebAuthn authentication JSON into the binary fields expected by HarmonyOS. */
export function credentialRequestOptions(requestJson: string): JsonRecord {
  const options = parseRequest(requestJson, "credentials.get");
  const publicKey = record(options.publicKey ?? options, "publicKey");
  const normalized: JsonRecord = {
    ...publicKey,
    challenge: binary(publicKey.challenge, "publicKey.challenge"),
  };
  if (publicKey.allowCredentials !== undefined) {
    normalized.allowCredentials = descriptors(
      publicKey.allowCredentials,
      "publicKey.allowCredentials",
    );
  }
  return { ...options, publicKey: normalized };
}

function parseRequest(source: string, operation: string): JsonRecord {
  if (typeof source !== "string" || source.length === 0) {
    throw new TypeError(`${operation} requires non-empty request JSON`);
  }
  if (source.length > MAX_REQUEST_LENGTH) {
    throw new TypeError(`${operation} request JSON is too large`);
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new TypeError(`${operation} requires valid request JSON`);
  }
  return record(value, "request");
}

function descriptors(value: unknown, path: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  return value.map((entry, index) => {
    const descriptor = record(entry, `${path}[${index}]`);
    return {
      ...descriptor,
      id: binary(descriptor.id, `${path}[${index}].id`),
    };
  });
}

function record(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  return value as JsonRecord;
}

function binary(value: unknown, path: string): Uint8Array {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty base64url string`);
  }
  const padding = value.indexOf("=");
  const unpadded = padding < 0 ? value : value.slice(0, padding);
  if (
    !/^[A-Za-z0-9_-]+$/u.test(unpadded) ||
    (padding >= 0 && !/^={1,2}$/u.test(value.slice(padding))) ||
    unpadded.length % 4 === 1
  ) {
    throw new TypeError(`${path} must be a valid base64url string`);
  }

  const outputLength = Math.floor((unpadded.length * 6) / 8);
  const output = new Uint8Array(outputLength);
  let bits = 0;
  let bitCount = 0;
  let outputIndex = 0;
  for (const character of unpadded) {
    bits = bits * 64 + BASE64URL.indexOf(character);
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      output[outputIndex] = Math.floor(bits / 2 ** bitCount) & 255;
      outputIndex += 1;
      bits %= 2 ** bitCount;
    }
  }
  return output;
}
