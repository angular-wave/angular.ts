/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import {
  applySecurityConfiguration,
  createSecurityPolicy,
  createSecurityRuntimeConfiguration,
  type NavigationPolicyContext,
  type RequestPolicyContext,
  type SecurityPolicy,
  type SecurityConfig,
  type SecurityPolicyContext,
} from "./security.ts";

function createDirectSecurityPolicy(
  config: SecurityConfig,
  baseUrl = "https://example.test/",
): SecurityPolicy {
  const configuration = createSecurityRuntimeConfiguration();

  applySecurityConfiguration(configuration, config);

  return createSecurityPolicy(configuration, () => baseUrl);
}

function requestContext(
  overrides: Partial<RequestPolicyContext> = {},
): RequestPolicyContext {
  return {
    operation: "request",
    transport: "http",
    method: "GET",
    url: "/resource",
    ...overrides,
  };
}

function navigationContext(
  overrides: Partial<NavigationPolicyContext> = {},
): NavigationPolicyContext {
  return {
    operation: "navigation",
    to: { name: "account" },
    ...overrides,
  };
}

function checkSecurityContext(
  policy: SecurityPolicy,
  context: SecurityPolicyContext,
) {
  return policy.check(context);
}

describe("$security", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("rejects malformed JavaScript security configuration", () => {
    const invalidConfigs: Array<[unknown, string]> = [
      [null, "$security config must be an object."],
      [{ fallback: "permit" }, "$security fallback must be 'allow' or 'deny'."],
      [
        { allowInsecureOrigins: "http://example.test" },
        "$security allowInsecureOrigins must be an array of strings.",
      ],
      [
        { allowInsecureOrigins: [1] },
        "$security allowInsecureOrigins must be an array of strings.",
      ],
      [{ credentials: "cookie" }, "$security credentials must be an object."],
      [
        { credentials: { bearer: 1 } },
        "$security bearer credential must be a string or function.",
      ],
      [
        { credentials: { basic: "user:password" } },
        "$security basic credentials must be an object.",
      ],
      [
        { credentials: { basic: { username: 1, password: "password" } } },
        "$security basic username must be a string or function.",
      ],
      [
        { credentials: { basic: { username: "user", password: 1 } } },
        "$security basic password must be a string or function.",
      ],
      [
        { credentials: { cookie: "yes" } },
        "$security cookie credential must be a boolean.",
      ],
      [
        { credentials: { order: "bearer" } },
        "$security credential order must contain bearer, basic, or cookie.",
      ],
      [
        { credentials: { order: ["digest"] } },
        "$security credential order must contain bearer, basic, or cookie.",
      ],
      [
        { isAuthenticated: "yes" },
        "$security isAuthenticated must be a boolean or function.",
      ],
      [
        { permissions: "reports.read" },
        "$security permissions must be an array of strings or function.",
      ],
      [
        { permissions: [1] },
        "$security permissions must be an array of strings or function.",
      ],
    ];

    for (const [config, message] of invalidConfigs) {
      expect(() =>
        applySecurityConfiguration(
          createSecurityRuntimeConfiguration(),
          config as SecurityConfig,
        ),
      ).toThrowError(message);
    }
  });

  it("applies typed module configuration to the runtime service", async () => {
    const app = window.angular.module("configuredSecurity", []);

    app.config({
      $security: {
        fallback: "deny",
        allowInsecureOrigins: [window.location.origin],
        credentials: {
          bearer: "configured.jwt.token",
        },
      },
    });

    const $security = createInjector(["ng", "configuredSecurity"]).get(
      "$security",
    ) as SecurityPolicy;
    const decision = await $security.check(requestContext());

    expect(decision).toEqual({
      type: "allow",
      credentials: {
        headers: { Authorization: "Bearer configured.jwt.token" },
      },
    });
  });

  it("derives enabled schemes from credentials and honors explicit order", () => {
    const jwtFirst = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: {
        bearer: "jwt.token",
        cookie: true,
      },
    });
    const cookieFirst = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: {
        bearer: "jwt.token",
        cookie: true,
        order: ["cookie", "cookie"],
      },
    });

    expect(jwtFirst.check(requestContext())).toEqual({
      type: "allow",
      credentials: {
        headers: { Authorization: "Bearer jwt.token" },
      },
    });
    expect(cookieFirst.check(requestContext())).toEqual({
      type: "allow",
      credentials: { withCredentials: true },
    });
  });

  it("evaluates each credential source only once per request", () => {
    let reads = 0;
    let receivedContext: RequestPolicyContext | undefined;
    const policy = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: {
        bearer: (context) => {
          reads += 1;
          receivedContext = context;
          return "single.read.token";
        },
      },
    });

    const context = requestContext();
    const decision = policy.check(context);

    expect(reads).toBe(1);
    expect(receivedContext).toBe(context);
    expect(decision.type).toBe("allow");
    expect(decision.type === "allow" && decision.credentials).toEqual({
      headers: { Authorization: "Bearer single.read.token" },
    });
    expect(checkSecurityContext(policy, context)).toEqual(decision);
  });

  it("recognizes caller-provided JWT and basic authorization headers", () => {
    const policy = createDirectSecurityPolicy({ fallback: "deny" });

    expect(
      policy.check(
        requestContext({ headers: { AUTHORIZATION: "Bearer external" } }),
      ),
    ).toEqual({ type: "allow", credentials: undefined });
    expect(
      policy.check(
        requestContext({ headers: { Authorization: "Basic encoded" } }),
      ),
    ).toEqual({ type: "allow", credentials: undefined });
  });

  it("attaches configured basic credentials in the allow decision", () => {
    const policy = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: {
        basic: { username: "user", password: "password" },
      },
    });

    expect(policy.check(requestContext())).toEqual({
      type: "allow",
      credentials: {
        headers: { Authorization: "Basic dXNlcjpwYXNzd29yZA==" },
      },
    });
  });

  it("rejects header-based credentials for Beacon transport", () => {
    const jwt = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { bearer: "token" },
    });
    const basic = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { basic: { username: "user", password: "password" } },
    });
    const externalJwt = createDirectSecurityPolicy({ fallback: "deny" });
    const emptyJwt = createDirectSecurityPolicy({
      credentials: { bearer: () => null },
    });

    expect(jwt.check(requestContext({ transport: "beacon" }))).toEqual({
      type: "deny",
      status: 401,
      reason: "Beacon transport cannot attach Authorization credentials",
    });
    expect(basic.check(requestContext({ transport: "beacon" }))).toEqual({
      type: "deny",
      status: 401,
      reason: "Beacon transport cannot attach Authorization credentials",
    });
    expect(
      externalJwt.check(
        requestContext({
          transport: "beacon",
          headers: { Authorization: "Bearer external" },
        }),
      ),
    ).toEqual({
      type: "deny",
      status: 401,
      reason: "Beacon transport cannot attach Authorization credentials",
    });
    expect(emptyJwt.check(requestContext({ transport: "beacon" }))).toEqual({
      type: "allow",
    });
  });

  it("rejects header credentials for Worker and Service Worker scripts", () => {
    const policy = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { bearer: "token" },
    });

    expect(policy.check(requestContext({ transport: "worker" }))).toEqual({
      type: "deny",
      status: 401,
      reason: "Worker transport cannot attach Authorization credentials",
    });
    expect(
      policy.check(requestContext({ transport: "service-worker" })),
    ).toEqual({
      type: "deny",
      status: 401,
      reason:
        "Service Worker transport cannot attach Authorization credentials",
    });
  });

  it("allows Beacon cookie credentials when enabled", () => {
    const included = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { cookie: true },
    });
    const beaconContext = requestContext({
      transport: "beacon",
      credentials: "include",
    });

    expect(included.check(beaconContext)).toEqual({
      type: "allow",
      credentials: { withCredentials: true },
    });
  });

  it("uses a boolean cookie credential configuration", () => {
    const disabled = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { cookie: false },
    });
    const browserManaged = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { cookie: true },
    });
    expect(disabled.check(requestContext()).type).toBe("deny");
    expect(browserManaged.check(requestContext())).toEqual({
      type: "allow",
      credentials: { withCredentials: true },
    });
  });

  it("uses the configured fallback when no credential matches", () => {
    const deny = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { bearer: () => null },
    });
    const allow = createDirectSecurityPolicy({
      credentials: {
        basic: { username: () => "", password: "password" },
      },
    });

    expect(deny.check(requestContext())).toEqual({
      type: "deny",
      status: 403,
      reason: "No configured credential matched request context",
    });
    expect(allow.check(requestContext())).toEqual({ type: "allow" });
  });

  it("uses fallback when an explicitly ordered scheme is not configured", () => {
    const policy = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { order: ["basic"] },
    });

    expect(policy.check(requestContext())).toEqual({
      type: "deny",
      status: 403,
      reason: undefined,
    });
  });

  it("blocks credentialed insecure transport unless explicitly allowed", () => {
    const secure = createDirectSecurityPolicy(
      { fallback: "allow" },
      "http://example.test/",
    );
    const optedOut = createDirectSecurityPolicy(
      { fallback: "allow", allowInsecureOrigins: ["http://example.test"] },
      "http://example.test/",
    );

    expect(secure.check(requestContext({ credentials: "include" }))).toEqual({
      type: "deny",
      status: 401,
      reason: "insecure transport blocked",
    });
    expect(
      secure.check(
        requestContext({
          url: "//cdn.example.test/resource",
          headers: { Authorization: "Bearer external" },
        }),
      ),
    ).toEqual(jasmine.objectContaining({ type: "deny" }));
    expect(optedOut.check(requestContext({ credentials: "include" }))).toEqual({
      type: "allow",
    });
  });

  it("ignores malformed insecure-origin allowlist entries", () => {
    const policy = createDirectSecurityPolicy(
      {
        fallback: "allow",
        allowInsecureOrigins: ["http://["],
      },
      "http://example.test/",
    );

    expect(policy.check(requestContext({ credentials: "include" }))).toEqual(
      jasmine.objectContaining({ type: "deny" }),
    );
  });

  it("denies when the platform base URL becomes invalid during evaluation", () => {
    const configuration = createSecurityRuntimeConfiguration();
    let baseUrlReads = 0;

    applySecurityConfiguration(configuration, {
      fallback: "allow",
      allowInsecureOrigins: ["http://example.test"],
    });

    const policy = createSecurityPolicy(configuration, () => {
      baseUrlReads += 1;

      return baseUrlReads === 1 ? "http://example.test/" : "invalid base";
    });

    expect(policy.check(requestContext({ credentials: "include" }))).toEqual(
      jasmine.objectContaining({ type: "deny" }),
    );
  });

  it("allows secure, uncredentialed, and unparseable request URLs", () => {
    const secure = createDirectSecurityPolicy({ fallback: "allow" });
    const invalid = createDirectSecurityPolicy(
      { fallback: "allow" },
      "not a valid base URL",
    );

    expect(
      secure.check(
        requestContext({
          url: "https://example.test/resource",
          credentials: "include",
        }),
      ),
    ).toEqual({ type: "allow" });
    expect(
      secure.check(requestContext({ url: "http://example.test/resource" })),
    ).toEqual({ type: "allow" });
    expect(
      invalid.check(
        requestContext({ url: "relative", credentials: "include" }),
      ),
    ).toEqual({ type: "allow" });
  });

  it("blocks credentials produced by configured schemes on insecure URLs", () => {
    const jwt = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { bearer: "token" },
    });
    const cookie = createDirectSecurityPolicy({
      fallback: "deny",
      credentials: { cookie: true },
    });
    const context = requestContext({ url: "http://example.test/resource" });

    expect(jwt.check(context).type).toBe("deny");
    expect(cookie.check(context).type).toBe("deny");
  });

  it("uses router policies as the only navigation declaration", async () => {
    const policy = createDirectSecurityPolicy({ fallback: "deny" });

    await expectAsync(policy.check(navigationContext())).toBeResolvedTo({
      type: "deny",
      status: 403,
      reason: undefined,
    });
    await expectAsync(
      policy.check(
        navigationContext({
          routePolicy: {
            public: true,
            authenticated: false,
            permissions: [],
            states: ["public"],
          },
        }),
      ),
    ).toBeResolvedTo({ type: "allow" });
  });

  it("uses authentication state independently from request credentials", async () => {
    const anonymous = createDirectSecurityPolicy({ fallback: "allow" });
    const credentialOnly = createDirectSecurityPolicy({
      fallback: "allow",
      credentials: { bearer: "token" },
    });
    const authenticated = createDirectSecurityPolicy({
      fallback: "deny",
      isAuthenticated: true,
    });
    const routePolicy = {
      authenticated: true,
      permissions: [],
      states: ["account"],
    };

    await expectAsync(
      anonymous.check(navigationContext({ routePolicy })),
    ).toBeResolvedTo({
      type: "deny",
      status: 401,
      reason: "Authentication required",
    });
    await expectAsync(
      credentialOnly.check(navigationContext({ routePolicy })),
    ).toBeResolvedTo({
      type: "deny",
      status: 401,
      reason: "Authentication required",
    });
    await expectAsync(
      authenticated.check(navigationContext({ routePolicy })),
    ).toBeResolvedTo({ type: "allow" });
  });

  it("supports contextual asynchronous authentication", async () => {
    const seen: NavigationPolicyContext[] = [];
    const basic = createDirectSecurityPolicy({
      fallback: "deny",
      isAuthenticated: async (context) => {
        seen.push(context);
        return true;
      },
      credentials: { basic: { username: "user", password: "password" } },
    });
    const cookie = createDirectSecurityPolicy({
      fallback: "deny",
      isAuthenticated: true,
      credentials: { cookie: true },
    });
    const routePolicy = {
      authenticated: true,
      permissions: [],
      states: ["account"],
    };

    await expectAsync(
      basic.check(navigationContext({ routePolicy })),
    ).toBeResolvedTo({ type: "allow" });
    await expectAsync(
      cookie.check(navigationContext({ routePolicy })),
    ).toBeResolvedTo({ type: "allow" });
    expect(seen).toHaveSize(1);
    expect(seen[0].routePolicy).toBe(routePolicy);
  });

  it("returns valid redirects for failed route requirements", async () => {
    const policy = createDirectSecurityPolicy({ fallback: "allow" });

    await expectAsync(
      policy.check(
        navigationContext({
          routePolicy: {
            authenticated: true,
            permissions: [],
            redirectTo: "login",
            reason: "Sign in first",
            states: ["account"],
          },
        }),
      ),
    ).toBeResolvedTo({
      type: "redirect",
      target: "login",
      reason: "Sign in first",
    });
  });

  it("supports static and contextual asynchronous authorization", async () => {
    const staticPolicy = createDirectSecurityPolicy({
      fallback: "deny",
      permissions: ["reports.read"],
    });
    const seen: Array<[string, string | undefined]> = [];
    const dynamicPolicy = createDirectSecurityPolicy({
      fallback: "deny",
      permissions: async (permission, context) => {
        seen.push([permission, context.to.name]);
        return permission === "reports.write";
      },
    });
    const routePolicy = {
      authenticated: false,
      permissions: ["reports.read"],
      states: ["reports"],
    };

    await expectAsync(
      staticPolicy.check(navigationContext({ routePolicy })),
    ).toBeResolvedTo({ type: "allow" });
    await expectAsync(
      staticPolicy.check(
        navigationContext({
          routePolicy: { ...routePolicy, permissions: ["reports.write"] },
        }),
      ),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        reason: "Permission 'reports.write' required",
      }),
    );
    await expectAsync(
      dynamicPolicy.check(
        navigationContext({
          routePolicy: { ...routePolicy, permissions: ["reports.write"] },
        }),
      ),
    ).toBeResolvedTo({ type: "allow" });
    expect(seen).toEqual([["reports.write", "account"]]);
  });

  it("denies required permissions when authorization is not configured", async () => {
    const policy = createDirectSecurityPolicy({ fallback: "allow" });

    await expectAsync(
      policy.check(
        navigationContext({
          routePolicy: {
            authenticated: false,
            permissions: ["reports.read"],
            states: ["reports"],
          },
        }),
      ),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        reason: "Permission 'reports.read' required",
      }),
    );
  });
});
