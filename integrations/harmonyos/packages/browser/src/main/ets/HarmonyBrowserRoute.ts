export interface BrowserPlatform {
  open(location: string): void | Promise<void>;
}

export type BrowserRouteErrorSink = (error: unknown) => void;

/** Intercepts external web locations while leaving same-origin AngularTS routes in ArkWeb. */
export class HarmonyBrowserRoute {
  private readonly applicationOrigin: string;
  private readonly platform: BrowserPlatform;
  private readonly reportError: BrowserRouteErrorSink;

  constructor(
    applicationLocation: string,
    platform: BrowserPlatform,
    reportError: BrowserRouteErrorSink = () => undefined,
  ) {
    this.applicationOrigin = origin(applicationLocation);
    this.platform = platform;
    this.reportError = reportError;
  }

  matches(location: string): boolean {
    const candidate = webLocation(location);
    return candidate !== null && candidate.origin !== this.applicationOrigin;
  }

  intercept(location: string): boolean {
    const candidate = webLocation(location);
    if (candidate === null || candidate.origin === this.applicationOrigin) return false;
    void Promise.resolve(this.platform.open(candidate.href)).catch(this.reportError);
    return true;
  }
}

interface ParsedLocation {
  readonly href: string;
  readonly origin: string;
}

function webLocation(location: string): ParsedLocation | null {
  return parseLocation(location, false);
}

function origin(location: string): string {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*@/u.test(location)) {
    throw new TypeError("applicationLocation must not contain credentials");
  }
  const value = parseLocation(location, true);
  if (value === null) {
    throw new TypeError("applicationLocation must use HTTP, HTTPS, or packaged rawfile resources");
  }
  return value.origin;
}

function parseLocation(location: string, allowResource: boolean): ParsedLocation | null {
  if (location.length === 0 || /[\u0000-\u0020\\]/u.test(location)) return null;
  const separator = location.indexOf("://");
  if (separator < 1) return null;
  const scheme = location.slice(0, separator).toLowerCase();
  if (!/^[a-z][a-z0-9+.-]*$/u.test(scheme)) return null;
  const remainder = location.slice(separator + 3);
  const boundary = remainder.search(/[/?#]/u);
  const authority = boundary < 0 ? remainder : remainder.slice(0, boundary);
  const suffix = boundary < 0 ? "" : remainder.slice(boundary);
  if (authority.length === 0) return null;
  if (authority.includes("@")) return null;
  if (scheme === "resource") {
    return allowResource && authority.toLowerCase() === "rawfile"
      ? { href: `resource://rawfile${suffix}`, origin: "resource://rawfile" }
      : null;
  }
  if (scheme !== "http" && scheme !== "https") return null;
  const parsedAuthority = parseHttpAuthority(authority);
  if (parsedAuthority === null) return null;
  const defaultPort = scheme === "https" ? 443 : 80;
  const port = parsedAuthority.port === null ? defaultPort : parsedAuthority.port;
  const serializedPort = port === defaultPort ? "" : `:${port}`;
  const path = suffix.length === 0 || suffix.startsWith("?") || suffix.startsWith("#")
    ? `/${suffix}`
    : suffix;
  return {
    href: `${scheme}://${parsedAuthority.host}${serializedPort}${path}`,
    origin: `${scheme}://${parsedAuthority.host}${serializedPort}`,
  };
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
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(host) || host.includes("..")) {
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
