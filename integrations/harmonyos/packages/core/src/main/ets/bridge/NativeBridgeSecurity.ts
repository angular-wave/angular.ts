import { utf8ByteLength } from "./NativeBridgeProtocol.ts";

interface Origin {
  readonly scheme: "http" | "https" | "resource";
  readonly host: string;
  readonly port: number;
}

export class NativeBridgeSecurity {
  readonly sessionToken: string;

  private readonly destinationOrigin: Origin | null;

  constructor(destinationLocation: string, sessionToken: string) {
    this.destinationOrigin = parseOrigin(destinationLocation);
    this.sessionToken = sessionToken;
  }

  accepts(session: string | null | undefined, currentLocation: string | null | undefined): boolean {
    if (session === null || session === undefined || currentLocation === null || currentLocation === undefined) {
      return false;
    }
    const currentOrigin = parseOrigin(currentLocation);
    return (
      constantTimeEqual(session, this.sessionToken) &&
      this.destinationOrigin !== null &&
      currentOrigin !== null &&
      sameOrigin(this.destinationOrigin, currentOrigin)
    );
  }
}

function parseOrigin(location: string): Origin | null {
  if (location.length === 0 || /[\u0000-\u0020\\]/u.test(location)) return null;
  const separator = location.indexOf("://");
  if (separator < 1) return null;
  const scheme = location.slice(0, separator).toLowerCase();
  const remainder = location.slice(separator + 3);
  const boundary = remainder.search(/[/?#]/u);
  const authority = boundary < 0 ? remainder : remainder.slice(0, boundary);
  if (authority.length === 0 || authority.includes("@")) return null;
  if (scheme === "resource") {
    return authority.toLowerCase() === "rawfile"
      ? { scheme, host: "rawfile", port: 0 }
      : null;
  }
  if (scheme !== "http" && scheme !== "https") return null;

  const parsedAuthority = parseHttpAuthority(authority);
  if (parsedAuthority === null) return null;
  const port = parsedAuthority.port === null
    ? scheme === "https" ? 443 : 80
    : parsedAuthority.port;
  return { scheme, host: parsedAuthority.host, port };
}

function parseHttpAuthority(authority: string): { readonly host: string; readonly port: number | null } | null {
  if (authority.startsWith("[")) {
    const closingBracket = authority.indexOf("]");
    if (closingBracket < 2) return null;
    const address = authority.slice(1, closingBracket).toLowerCase();
    if (!/^[0-9a-f:.]+$/u.test(address) || !address.includes(":")) return null;
    const port = parsePort(authority.slice(closingBracket + 1));
    return port === undefined ? null : { host: `[${address}]`, port };
  }

  const separator = authority.lastIndexOf(":");
  const host = (separator < 0 ? authority : authority.slice(0, separator)).toLowerCase();
  if (
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(host) ||
    host.includes("..")
  ) {
    return null;
  }
  const port = parsePort(separator < 0 ? "" : authority.slice(separator));
  return port === undefined ? null : { host, port };
}

function parsePort(value: string): number | null | undefined {
  if (value.length === 0) return null;
  if (!/^:\d+$/u.test(value)) return undefined;
  const port = Number(value.slice(1));
  return port >= 1 && port <= 65535 ? port : undefined;
}

function sameOrigin(left: Origin, right: Origin): boolean {
  return left.scheme === right.scheme && left.host === right.host && left.port === right.port;
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = utf8ByteLength(left) ^ utf8ByteLength(right);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
