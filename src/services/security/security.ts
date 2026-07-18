import type { PolicyContext } from "../../core/policy/policy.ts";

export interface NavigationPolicyContext extends PolicyContext<"navigation"> {
  readonly from?: {
    readonly name?: string;
    readonly url?: string;
  };
  readonly to: {
    readonly name?: string;
    readonly url?: string;
    readonly params?: Readonly<Record<string, string>>;
  };
  readonly transition?: {
    readonly id?: string;
  };
  readonly routePolicy?: NavigationPolicyRequirements;
  readonly userAgent?: string;
}

/** Effective inherited security requirements supplied by the router. */
export interface NavigationPolicyRequirements {
  readonly authenticated: boolean;
  readonly permissions: readonly string[];
  readonly redirectTo?: string;
  readonly reason?: string;
  readonly public?: boolean;
  readonly states: readonly string[];
}

export interface RequestPolicyContext extends PolicyContext<"request"> {
  /** Framework transport performing the request. */
  readonly transport: "beacon" | "http" | "service-worker" | "worker";
  readonly method: string;
  readonly url: string;
  readonly credentials?: RequestCredentials;
  readonly headers?: Readonly<Record<string, string>>;
  readonly hasBody?: boolean;
}

export type SecurityPolicyContext =
  | NavigationPolicyContext
  | RequestPolicyContext;

export interface SecurityRequestCredentials {
  readonly headers?: Readonly<Record<string, string>>;
  readonly withCredentials?: boolean;
}

export type SecurityPolicyDecision =
  | {
      readonly type: "allow";
      readonly credentials?: SecurityRequestCredentials;
      readonly meta?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: "deny";
      readonly reason?: string;
      readonly status?: number;
      readonly error?: unknown;
      readonly meta?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: "redirect";
      readonly target: string;
      readonly reason?: string;
      readonly meta?: Readonly<Record<string, unknown>>;
    };

export interface SecurityConfig {
  fallback?: "allow" | "deny";
  /** HTTP origins explicitly permitted to carry credentials. */
  allowInsecureOrigins?: readonly string[];
  credentials?: SecurityCredentialsConfig;
  isAuthenticated?:
    | boolean
    | ((context: NavigationPolicyContext) => boolean | Promise<boolean>);
  permissions?:
    | readonly string[]
    | ((
        permission: string,
        context: NavigationPolicyContext,
      ) => boolean | Promise<boolean>);
}

export type SecurityCredentialSource =
  | string
  | ((context: RequestPolicyContext) => string | undefined | null);

export interface SecurityBasicCredentials {
  username: SecurityCredentialSource;
  password: SecurityCredentialSource;
}

export interface SecurityCredentialsConfig {
  bearer?: SecurityCredentialSource;
  basic?: SecurityBasicCredentials;
  cookie?: boolean;
  order?: readonly ("bearer" | "basic" | "cookie")[];
}

export interface SecurityPolicy {
  check(context: RequestPolicyContext): SecurityPolicyDecision;
  check(context: NavigationPolicyContext): Promise<SecurityPolicyDecision>;
  check(
    context: SecurityPolicyContext,
  ): SecurityPolicyDecision | Promise<SecurityPolicyDecision>;
}

type SecurityCredentialScheme = "bearer" | "basic" | "cookie";

/** @internal */
export interface SecurityRuntimeConfiguration {
  fallback: "allow" | "deny";
  allowInsecureOrigins: readonly string[];
  credentials: SecurityCredentialsConfig;
  isAuthenticated?: SecurityConfig["isAuthenticated"];
  permissions?: SecurityConfig["permissions"];
}

const DEFAULT_SECURITY_FALLBACK = "allow" as const;
const DEFAULT_CREDENTIAL_ORDER: readonly SecurityCredentialScheme[] = [
  "bearer",
  "basic",
  "cookie",
];

/** @internal */
export function createSecurityRuntimeConfiguration(): SecurityRuntimeConfiguration {
  return {
    fallback: DEFAULT_SECURITY_FALLBACK,
    allowInsecureOrigins: [],
    credentials: {},
  };
}

/** @internal */
export function applySecurityConfiguration(
  configuration: SecurityRuntimeConfiguration,
  config: SecurityConfig,
): void {
  assertSecurityConfig(config);

  if (config.fallback !== undefined) {
    configuration.fallback = config.fallback;
  }

  if (config.allowInsecureOrigins !== undefined) {
    configuration.allowInsecureOrigins = [...config.allowInsecureOrigins];
  }

  if (config.credentials !== undefined) {
    configuration.credentials = {
      ...configuration.credentials,
      ...config.credentials,
    };
  }

  if (config.isAuthenticated !== undefined) {
    configuration.isAuthenticated = config.isAuthenticated;
  }

  if (config.permissions !== undefined) {
    configuration.permissions = config.permissions;
  }
}

function assertSecurityConfig(
  config: unknown,
): asserts config is SecurityConfig {
  if (!isRecord(config)) {
    throw new Error("$security config must be an object.");
  }

  if (
    config.fallback !== undefined &&
    config.fallback !== "allow" &&
    config.fallback !== "deny"
  ) {
    throw new Error("$security fallback must be 'allow' or 'deny'.");
  }

  if (
    config.allowInsecureOrigins !== undefined &&
    (!Array.isArray(config.allowInsecureOrigins) ||
      !config.allowInsecureOrigins.every(
        (origin: unknown) => typeof origin === "string",
      ))
  ) {
    throw new Error(
      "$security allowInsecureOrigins must be an array of strings.",
    );
  }

  if (config.credentials !== undefined) {
    assertSecurityCredentialConfig(config.credentials);
  }

  if (
    config.isAuthenticated !== undefined &&
    typeof config.isAuthenticated !== "boolean" &&
    typeof config.isAuthenticated !== "function"
  ) {
    throw new Error("$security isAuthenticated must be a boolean or function.");
  }

  if (
    config.permissions !== undefined &&
    typeof config.permissions !== "function" &&
    (!Array.isArray(config.permissions) ||
      !config.permissions.every(
        (permission: unknown) => typeof permission === "string",
      ))
  ) {
    throw new Error(
      "$security permissions must be an array of strings or function.",
    );
  }
}

function assertSecurityCredentialConfig(config: unknown): void {
  if (!isRecord(config)) {
    throw new Error("$security credentials must be an object.");
  }

  if (
    config.bearer !== undefined &&
    !isSecurityCredentialSource(config.bearer)
  ) {
    throw new Error(
      "$security bearer credential must be a string or function.",
    );
  }

  if (config.basic !== undefined) {
    if (!isRecord(config.basic)) {
      throw new Error("$security basic credentials must be an object.");
    }

    if (!isSecurityCredentialSource(config.basic.username)) {
      throw new Error("$security basic username must be a string or function.");
    }

    if (!isSecurityCredentialSource(config.basic.password)) {
      throw new Error("$security basic password must be a string or function.");
    }
  }

  if (config.cookie !== undefined && typeof config.cookie !== "boolean") {
    throw new Error("$security cookie credential must be a boolean.");
  }

  if (
    config.order !== undefined &&
    (!Array.isArray(config.order) ||
      !config.order.every(
        (scheme: unknown) =>
          scheme === "bearer" || scheme === "basic" || scheme === "cookie",
      ))
  ) {
    throw new Error(
      "$security credential order must contain bearer, basic, or cookie.",
    );
  }
}

function isSecurityCredentialSource(
  value: unknown,
): value is SecurityCredentialSource {
  return typeof value === "string" || typeof value === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Creates the shared deterministic security policy used by framework services.
 *
 * Requests are evaluated once. An allow decision carries any credentials that
 * `$http` must apply before transport begins. Navigation authorization is
 * declared by the router state tree and resolved here.
 *
 * @internal
 */
export function createSecurityPolicy(
  configuration: SecurityRuntimeConfiguration,
  getBaseUrl: () => string,
): SecurityPolicy {
  const asStringHeaders = (
    headers?: Readonly<Record<string, string>>,
  ): Readonly<Record<string, string>> => headers ?? {};

  const getHeader = (
    headers: Readonly<Record<string, string>>,
    name: string,
  ): string | undefined => {
    const key = name.toLowerCase();

    return Object.entries(headers).find(
      ([headerName]) => headerName.toLowerCase() === key,
    )?.[1];
  };

  const isInsecureUrl = (url: string): boolean => {
    try {
      return new URL(url, getBaseUrl()).protocol === "http:";
    } catch {
      return false;
    }
  };

  const isAllowedInsecureOrigin = (url: string): boolean => {
    try {
      const origin = new URL(url, getBaseUrl()).origin;

      return configuration.allowInsecureOrigins.some((candidate) => {
        try {
          return new URL(candidate, getBaseUrl()).origin === origin;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  };

  const resolveCredentialSource = (
    source: SecurityCredentialSource | undefined,
    context: RequestPolicyContext,
  ): string | undefined => {
    const value = typeof source === "function" ? source(context) : source;

    return value === null || value === "" ? undefined : value;
  };

  const encodeBasicCredentials = (
    credentials: SecurityBasicCredentials,
    context: RequestPolicyContext,
  ): string | undefined => {
    const username = resolveCredentialSource(credentials.username, context);
    const password = resolveCredentialSource(credentials.password, context);

    if (username === undefined || password === undefined) {
      return undefined;
    }

    return btoa(`${username}:${password}`);
  };

  const isSchemeEnabled = (scheme: SecurityCredentialScheme): boolean => {
    if (scheme === "cookie") {
      return configuration.credentials.cookie === true;
    }

    return configuration.credentials[scheme] !== undefined;
  };

  const credentialOrder = (): SecurityCredentialScheme[] => {
    const result: SecurityCredentialScheme[] = [];

    for (const scheme of [
      ...(configuration.credentials.order ?? []),
      ...DEFAULT_CREDENTIAL_ORDER,
    ]) {
      if (isSchemeEnabled(scheme) && !result.includes(scheme)) {
        result.push(scheme);
      }
    }

    return result;
  };

  const fallbackDecision = (reason?: string): SecurityPolicyDecision =>
    configuration.fallback === "deny"
      ? { type: "deny", status: 403, reason }
      : { type: "allow" };

  const insecureDecision = (): SecurityPolicyDecision => ({
    type: "deny",
    status: 401,
    reason: "insecure transport blocked",
  });

  const permitsCredentialTransport = (
    context: RequestPolicyContext,
    credentials?: SecurityRequestCredentials,
  ): boolean => {
    if (!isInsecureUrl(context.url) || isAllowedInsecureOrigin(context.url)) {
      return true;
    }

    const headers = asStringHeaders(context.headers);
    const attachedHeaders = credentials?.headers ?? {};

    return !(
      context.credentials === "include" ||
      getHeader(headers, "authorization") !== undefined ||
      getHeader(headers, "cookie") !== undefined ||
      getHeader(attachedHeaders, "authorization") !== undefined ||
      credentials?.withCredentials === true
    );
  };

  const allowRequest = (
    context: RequestPolicyContext,
    credentials?: SecurityRequestCredentials,
  ): SecurityPolicyDecision =>
    permitsCredentialTransport(context, credentials)
      ? { type: "allow", credentials }
      : insecureDecision();

  const evaluateRequestDecision = (
    context: RequestPolicyContext,
  ): SecurityPolicyDecision => {
    const headers = asStringHeaders(context.headers);
    const authorization = getHeader(headers, "authorization");
    const transportLabel = {
      beacon: "Beacon",
      http: "HTTP",
      "service-worker": "Service Worker",
      worker: "Worker",
    }[context.transport];

    const unsupportedTransportCredentials = (): SecurityPolicyDecision => ({
      type: "deny",
      status: 401,
      reason: `${transportLabel} transport cannot attach Authorization credentials`,
    });

    if (authorization !== undefined) {
      return context.transport === "http"
        ? allowRequest(context)
        : unsupportedTransportCredentials();
    }

    for (const scheme of credentialOrder()) {
      if (scheme === "bearer") {
        const token = resolveCredentialSource(
          configuration.credentials.bearer,
          context,
        );

        if (context.transport !== "http" && token !== undefined) {
          return unsupportedTransportCredentials();
        }

        if (token) {
          return allowRequest(context, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      if (scheme === "basic") {
        const credential = encodeBasicCredentials(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- credentialOrder only returns configured schemes.
          configuration.credentials.basic!,
          context,
        );

        if (context.transport !== "http" && credential !== undefined) {
          return unsupportedTransportCredentials();
        }

        if (credential) {
          return allowRequest(context, {
            headers: { Authorization: `Basic ${credential}` },
          });
        }
      }

      if (scheme === "cookie") {
        return allowRequest(context, { withCredentials: true });
      }
    }

    if (!permitsCredentialTransport(context)) {
      return insecureDecision();
    }

    return fallbackDecision(
      credentialOrder().length
        ? "No configured credential matched request context"
        : undefined,
    );
  };

  const hasAuthenticatedPrincipal = (
    context: NavigationPolicyContext,
  ): Promise<boolean> => {
    const isAuthenticated = configuration.isAuthenticated;

    if (isAuthenticated === undefined) {
      return Promise.resolve(false);
    }

    return typeof isAuthenticated === "function"
      ? Promise.resolve(isAuthenticated(context)).then(Boolean)
      : Promise.resolve(isAuthenticated);
  };

  const hasPermission = (
    permission: string,
    context: NavigationPolicyContext,
  ): Promise<boolean> => {
    const permissions = configuration.permissions;

    if (permissions === undefined) {
      return Promise.resolve(false);
    }

    return typeof permissions === "function"
      ? Promise.resolve(permissions(permission, context))
      : Promise.resolve(permissions.includes(permission));
  };

  const routePolicyDecision = async (
    context: NavigationPolicyContext,
  ): Promise<SecurityPolicyDecision | undefined> => {
    const routePolicy = context.routePolicy;

    if (!routePolicy) {
      return undefined;
    }

    if (routePolicy.public) {
      return { type: "allow" };
    }

    const redirectOrDeny = (
      reason: string,
      status = 403,
    ): SecurityPolicyDecision =>
      routePolicy.redirectTo
        ? {
            type: "redirect",
            target: routePolicy.redirectTo,
            reason,
          }
        : { type: "deny", status, reason };

    if (
      routePolicy.authenticated &&
      !(await hasAuthenticatedPrincipal(context))
    ) {
      return redirectOrDeny(
        routePolicy.reason ?? "Authentication required",
        401,
      );
    }

    for (const permission of routePolicy.permissions) {
      if (!(await hasPermission(permission, context))) {
        return redirectOrDeny(
          routePolicy.reason ?? `Permission '${permission}' required`,
        );
      }
    }

    return { type: "allow" };
  };

  const evaluateNavigationDecision = async (
    context: NavigationPolicyContext,
  ): Promise<SecurityPolicyDecision> =>
    (await routePolicyDecision(context)) ?? fallbackDecision();

  function check(context: RequestPolicyContext): SecurityPolicyDecision;
  function check(
    context: NavigationPolicyContext,
  ): Promise<SecurityPolicyDecision>;
  function check(
    context: SecurityPolicyContext,
  ): SecurityPolicyDecision | Promise<SecurityPolicyDecision>;
  function check(
    context: SecurityPolicyContext,
  ): SecurityPolicyDecision | Promise<SecurityPolicyDecision> {
    return context.operation === "navigation"
      ? evaluateNavigationDecision(context)
      : evaluateRequestDecision(context);
  }

  return { check };
}
