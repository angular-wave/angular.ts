import type {
  GatePolicyDecisionType,
  PolicyContext,
  PolicyDecision,
} from "../../core/policy/policy.ts";

export type SecurityPolicyDecisionType = GatePolicyDecisionType;

export interface NavigationPolicyContext extends PolicyContext {
  operation: "navigation";
  from?: {
    name?: string;
    url?: string;
  };
  to: {
    name?: string;
    url?: string;
    params?: Record<string, string>;
  };
  transition?: {
    id?: string;
  };
  routePolicy?: SecurityNavigationRoutePolicyContext;
  userAgent?: string;
}

export interface SecurityNavigationRoutePolicyContext {
  require: string[];
  permissions: string[];
  redirectTo?: string;
  reason?: string;
  public?: boolean;
  states: string[];
}

export interface RequestPolicyContext extends PolicyContext {
  operation: "request";
  method: string;
  url: string;
  requestInit: RequestInit;
  headers?: Record<string, string>;
  hasBody?: boolean;
}

export type SecurityPolicyContext =
  | NavigationPolicyContext
  | RequestPolicyContext;

export interface SecurityCredential {
  kind: "jwt" | "cookieSession" | "basic" | "custom";
  value: string;
}

export interface SecurityRequestCredentials {
  headers?: Record<string, string>;
  credential?: SecurityCredential;
  withCredentials?: boolean;
}

export interface SecurityPolicyDecision extends PolicyDecision<SecurityPolicyDecisionType> {
  type: SecurityPolicyDecisionType;
  scheme?: "jwt" | "cookieSession" | "basic" | "custom";
  reason?: string;
}

export interface SecurityPolicyConfig {
  defaultDecision?: SecurityPolicyDecisionType;
  branches?: string[];
  allowInsecureTransport?: boolean;
  credentials?: SecurityPolicyCredentialConfig;
  navigation?: SecurityNavigationPolicyConfig;
}

export type SecurityCredentialSource =
  | string
  | (() => string | undefined | null);

export interface SecurityCookieSessionConfig {
  enabled?: boolean;
  withCredentials?: boolean;
}

export interface SecurityPolicyCredentialConfig {
  jwt?: SecurityCredentialSource;
  basic?: SecurityCredentialSource;
  cookieSession?: boolean | SecurityCookieSessionConfig;
}

export interface SecurityNavigationRule {
  state?: string | string[];
  url?: string | RegExp;
  decision: SecurityPolicyDecisionType;
  reason?: string;
  status?: number;
  target?: string;
}

export interface SecurityNavigationPolicyConfig {
  rules?: SecurityNavigationRule[];
  permissions?: string[] | (() => string[] | undefined | null);
}

export interface SecurityPolicy {
  check(context: SecurityPolicyContext): Promise<SecurityPolicyDecision>;
  attachRequestAuth(
    context: RequestPolicyContext,
  ): Promise<SecurityRequestCredentials | undefined>;
}

/** @internal */
export interface SecurityRuntimeConfiguration {
  defaultDecision: SecurityPolicyDecisionType;
  branches: string[];
  allowInsecureTransport: boolean;
  credentials: SecurityPolicyCredentialConfig;
  navigation: SecurityNavigationPolicyConfig;
}

const SECURITY_DECISION_ALLOW = "allow" as const;
const DEFAULT_SECURITY_DECISION = SECURITY_DECISION_ALLOW;

/** @internal */
export function createSecurityRuntimeConfiguration(): SecurityRuntimeConfiguration {
  return {
    defaultDecision: DEFAULT_SECURITY_DECISION,
    branches: [],
    allowInsecureTransport: false,
    credentials: {},
    navigation: {},
  };
}

/** @internal */
export function applySecurityConfiguration(
  configuration: SecurityRuntimeConfiguration,
  config: SecurityPolicyConfig,
): void {
  if (config.defaultDecision !== undefined) {
    configuration.defaultDecision = config.defaultDecision;
  }

  if (config.branches !== undefined) {
    configuration.branches = config.branches;
  }

  if (config.allowInsecureTransport !== undefined) {
    configuration.allowInsecureTransport = config.allowInsecureTransport;
  }

  if (config.credentials !== undefined) {
    configuration.credentials = {
      ...configuration.credentials,
      ...config.credentials,
    };
  }

  if (config.navigation !== undefined) {
    configuration.navigation = {
      ...configuration.navigation,
      ...config.navigation,
    };
  }
}

/**
 * Shared deterministic security policy used by framework services.
 *
 * The current implementation is intentionally minimal and explicit:
 * when no config is supplied, requests and navigations are allowed.
 *
 * Future roadmap steps add branch-specific auth providers while preserving this
 * runtime gate contract.
 *
 * @internal
 */
export function createSecurityPolicy(
  configuration: SecurityRuntimeConfiguration,
  getBaseUrl: () => string,
): SecurityPolicy {
  const normalizeDecision = (
    decision: SecurityPolicyDecision,
  ): SecurityPolicyDecision => {
    const { type, status, reason, target, error, scheme } = decision;

    return {
      type,
      status,
      reason,
      target,
      error,
      scheme,
    };
  };

  const asStringHeaders = (
    headers?: Record<string, string>,
  ): Record<string, string> => headers ?? {};

  const getHeader = (
    headers: Record<string, string>,
    name: string,
  ): string | undefined => {
    const key = name.toLowerCase();

    return Object.entries(headers).find(
      ([headerName]) => headerName.toLowerCase() === key,
    )?.[1];
  };

  const isInsecureRequest = (context: RequestPolicyContext): boolean => {
    if (context.requestInit.credentials !== "include") {
      return false;
    }

    const url = context.url;

    if (url.startsWith("//")) {
      return false;
    }

    if (url.startsWith("http://")) {
      return true;
    }

    if (url.startsWith("https://")) {
      return false;
    }

    try {
      const parsed = new URL(url, getBaseUrl());

      return parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const resolveCredentialSource = (
    source: SecurityCredentialSource | undefined,
  ): string | undefined => {
    if (source === undefined) {
      return undefined;
    }

    const value = typeof source === "function" ? source() : source;

    return value === null || value === "" ? undefined : value;
  };

  const isCookieSessionEnabled = (): boolean => {
    const cookieSession = configuration.credentials.cookieSession;

    if (cookieSession === undefined) {
      return false;
    }

    if (typeof cookieSession === "boolean") {
      return cookieSession;
    }

    return cookieSession.enabled !== false;
  };

  const evaluateRequestDecision = (
    context: RequestPolicyContext,
  ): Promise<SecurityPolicyDecision> => {
    if (!configuration.allowInsecureTransport && isInsecureRequest(context)) {
      return Promise.resolve(
        normalizeDecision({
          type: "deny",
          status: 401,
          reason: "insecure transport blocked",
        }),
      );
    }

    const headers = asStringHeaders(context.headers);

    for (const branch of configuration.branches) {
      if (branch === "jwt") {
        const authorization = getHeader(headers, "authorization");
        const token = resolveCredentialSource(configuration.credentials.jwt);

        if (authorization?.toLowerCase().startsWith("bearer ") || token) {
          return Promise.resolve(
            normalizeDecision({
              type: "allow",
              scheme: "jwt",
            }),
          );
        }
      }

      if (branch === "basic") {
        const authorization = getHeader(headers, "authorization");
        const basicCredential = resolveCredentialSource(
          configuration.credentials.basic,
        );

        if (
          authorization?.toLowerCase().startsWith("basic ") ||
          basicCredential
        ) {
          return Promise.resolve(
            normalizeDecision({
              type: "allow",
              scheme: "basic",
            }),
          );
        }
      }

      if (branch === "cookieSession") {
        const cookie = getHeader(headers, "cookie");

        if (cookie?.includes("session=") || isCookieSessionEnabled()) {
          return Promise.resolve(
            normalizeDecision({
              type: "allow",
              scheme: "cookieSession",
            }),
          );
        }
      }
    }

    if (configuration.branches.length > 0) {
      return Promise.resolve(
        normalizeDecision({
          type: configuration.defaultDecision,
          status: configuration.defaultDecision === "deny" ? 403 : undefined,
          reason: "No configured branch matched request context",
        }),
      );
    }

    return Promise.resolve(
      normalizeDecision({ type: configuration.defaultDecision }),
    );
  };

  const matchesNavigationRule = (
    rule: SecurityNavigationRule,
    context: NavigationPolicyContext,
  ): boolean => {
    if (rule.state !== undefined) {
      const states = Array.isArray(rule.state) ? rule.state : [rule.state];

      if (!states.includes(context.to.name ?? "")) {
        return false;
      }
    }

    if (rule.url !== undefined) {
      const url = context.to.url ?? "";

      if (typeof rule.url === "string" && rule.url !== url) {
        return false;
      }

      if (rule.url instanceof RegExp && !rule.url.test(url)) {
        return false;
      }
    }

    return rule.state !== undefined || rule.url !== undefined;
  };

  const hasNavigationCredential = (): boolean => {
    for (const branch of configuration.branches) {
      if (
        branch === "jwt" &&
        resolveCredentialSource(configuration.credentials.jwt)
      ) {
        return true;
      }

      if (
        branch === "basic" &&
        resolveCredentialSource(configuration.credentials.basic)
      ) {
        return true;
      }

      if (branch === "cookieSession" && isCookieSessionEnabled()) {
        return true;
      }
    }

    return false;
  };

  const resolveNavigationPermissions = (): string[] => {
    const permissions = configuration.navigation.permissions;

    if (permissions === undefined) {
      return [];
    }

    const resolved =
      typeof permissions === "function" ? permissions() : permissions;

    return resolved ?? [];
  };

  const routePolicyDecision = (
    context: NavigationPolicyContext,
  ): SecurityPolicyDecision | undefined => {
    const routePolicy = context.routePolicy;

    if (!routePolicy || routePolicy.public) {
      return undefined;
    }

    const redirectOrDeny = (
      reason: string,
      status = 403,
    ): SecurityPolicyDecision => {
      if (routePolicy.redirectTo) {
        return normalizeDecision({
          type: "redirect",
          status: 302,
          target: routePolicy.redirectTo,
          reason,
        });
      }

      return normalizeDecision({
        type: "deny",
        status,
        reason,
      });
    };

    for (const requirement of routePolicy.require) {
      if (requirement === "authenticated") {
        if (!hasNavigationCredential()) {
          return redirectOrDeny(
            routePolicy.reason ?? "Authentication required",
            401,
          );
        }

        continue;
      }

      return redirectOrDeny(
        routePolicy.reason ?? `Unknown navigation requirement '${requirement}'`,
      );
    }

    if (routePolicy.permissions.length) {
      const availablePermissions = resolveNavigationPermissions();

      for (const permission of routePolicy.permissions) {
        if (!availablePermissions.includes(permission)) {
          return redirectOrDeny(
            routePolicy.reason ?? `Permission '${permission}' required`,
          );
        }
      }
    }

    return undefined;
  };

  const evaluateNavigationDecision = (
    context: NavigationPolicyContext,
  ): Promise<SecurityPolicyDecision> => {
    let allowRule: SecurityNavigationRule | undefined;

    for (const rule of configuration.navigation.rules ?? []) {
      if (!matchesNavigationRule(rule, context)) {
        continue;
      }

      if (rule.decision === "allow") {
        allowRule = rule;
        continue;
      }

      return Promise.resolve(
        normalizeDecision({
          type: rule.decision,
          status: rule.status,
          reason: rule.reason,
          target: rule.target,
        }),
      );
    }

    const policyDecision = routePolicyDecision(context);

    if (policyDecision) {
      return Promise.resolve(policyDecision);
    }

    if (allowRule) {
      return Promise.resolve(
        normalizeDecision({
          type: allowRule.decision,
          status: allowRule.status,
          reason: allowRule.reason,
          target: allowRule.target,
        }),
      );
    }

    return Promise.resolve(
      normalizeDecision({ type: configuration.defaultDecision }),
    );
  };

  const check = (
    context: SecurityPolicyContext,
  ): Promise<SecurityPolicyDecision> =>
    context.operation === "navigation"
      ? evaluateNavigationDecision(context)
      : evaluateRequestDecision(context);

  const attachRequestAuth = (
    context: RequestPolicyContext,
  ): Promise<SecurityRequestCredentials | undefined> => {
    void context;

    for (const branch of configuration.branches) {
      if (branch === "jwt") {
        const token = resolveCredentialSource(configuration.credentials.jwt);

        if (token) {
          return Promise.resolve({
            credential: {
              kind: "jwt",
              value: token,
            },
          });
        }
      }

      if (branch === "basic") {
        const credential = resolveCredentialSource(
          configuration.credentials.basic,
        );

        if (credential) {
          return Promise.resolve({
            credential: {
              kind: "basic",
              value: credential,
            },
          });
        }
      }

      if (branch === "cookieSession" && isCookieSessionEnabled()) {
        const cookieSession = configuration.credentials.cookieSession;
        const withCredentials =
          typeof cookieSession === "object"
            ? cookieSession.withCredentials !== false
            : true;

        return Promise.resolve({ withCredentials });
      }
    }

    return Promise.resolve(undefined);
  };

  return { check, attachRequestAuth };
}
