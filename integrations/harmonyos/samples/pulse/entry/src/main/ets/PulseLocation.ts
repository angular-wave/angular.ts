export const DEFAULT_PULSE_LOCATION = "http://127.0.0.1:4175/";

const HTTP_LOCATION = /^(https?):\/\/(\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::([0-9]{1,5}))?((?:\/[^#]*)|(?:\?[^#]*))?(?:#.*)?$/i;

export function pulseLocation(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return DEFAULT_PULSE_LOCATION;
  const match = HTTP_LOCATION.exec(value);
  if (match === null) return DEFAULT_PULSE_LOCATION;
  const port = match[3];
  if (port !== undefined && Number(port) > 65_535) return DEFAULT_PULSE_LOCATION;
  const suffix = match[4] ?? "";
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  const authority = port === undefined ? match[2]! : `${match[2]!}:${port}`;
  return `${match[1]!.toLowerCase()}://${authority.toLowerCase()}${path}`;
}
