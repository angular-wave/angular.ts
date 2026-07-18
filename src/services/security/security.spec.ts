/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import {
  applySecurityConfiguration,
  createSecurityPolicy as createRuntimeSecurityPolicy,
  createSecurityRuntimeConfiguration,
  type RequestPolicyContext,
  type SecurityPolicy,
  type SecurityPolicyConfig,
} from "./security.ts";

function createDirectSecurityPolicy(
  config: SecurityPolicyConfig,
  baseUrl = "https://example.test/",
): SecurityPolicy {
  const configuration = createSecurityRuntimeConfiguration();

  applySecurityConfiguration(configuration, config);

  return createRuntimeSecurityPolicy(configuration, () => baseUrl);
}

function requestContext(
  overrides: Partial<RequestPolicyContext> = {},
): RequestPolicyContext {
  return {
    operation: "request",
    method: "GET",
    url: "/resource",
    requestInit: { method: "GET" },
    ...overrides,
  };
}

function createSecurityPolicy() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const moduleName = `policy_${id}`;
  const app = window.angular.module(moduleName, []);

  app.config({
    $security: {
      defaultDecision: "allow",
      branches: ["jwt", "cookieSession"],
      allowInsecureTransport: false,
    },
  });

  return createInjector(["ng", moduleName]).get("$security") as SecurityPolicy;
}

describe("$security", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("applies branch order deterministically before request allow", async () => {
    const $security = createSecurityPolicy();

    const jwtFirst = await $security.check({
      operation: "request",
      method: "GET",
      url: "/resource",
      requestInit: {
        method: "GET",
        headers: {},
      },
      headers: {
        Authorization: "Bearer abc.def",
        Cookie: "session=abc",
      },
    });

    expect((jwtFirst as { scheme?: string }).scheme).toBe("jwt");

    const app = window.angular.module("policyReversed", []);
    app.config({
      $security: {
        defaultDecision: "allow",
        branches: ["cookieSession", "jwt"],
        allowInsecureTransport: false,
      },
    });
    const cookieFirst = (
      createInjector(["ng", "policyReversed"]).get(
        "$security",
      ) as SecurityPolicy
    ).check({
      operation: "request",
      method: "GET",
      url: "/resource",
      requestInit: {
        method: "GET",
        headers: {},
      },
      headers: {
        Authorization: "Bearer abc.def",
        Cookie: "session=abc",
      },
    });

    expect(((await cookieFirst) as { scheme?: string }).scheme).toBe(
      "cookieSession",
    );
  });

  it("fails requests with insecure transport by default", async () => {
    const app = window.angular.module("policyTransport", []);

    app.config({
      $security: {
        defaultDecision: "allow",
        allowInsecureTransport: false,
      },
    });
    const $security = createInjector(["ng", "policyTransport"]).get(
      "$security",
    ) as SecurityPolicy;

    const decision = await $security.check({
      operation: "request",
      method: "GET",
      url: "http://example.invalid/resource",
      requestInit: {
        method: "GET",
        headers: {},
        credentials: "include",
      },
      headers: {
        Authorization: "Bearer abc.def",
      },
    });

    expect(decision.type).toBe("deny");
    expect(decision.reason).toBe("insecure transport blocked");
  });

  it("allows insecure transport when explicitly enabled", async () => {
    const app = window.angular.module("policyTransportAllowed", []);

    app.config({
      $security: {
        defaultDecision: "allow",
        allowInsecureTransport: true,
      },
    });
    const $security = createInjector(["ng", "policyTransportAllowed"]).get(
      "$security",
    ) as SecurityPolicy;

    const decision = await $security.check({
      operation: "request",
      method: "GET",
      url: "http://example.invalid/resource",
      requestInit: {
        method: "GET",
        headers: {},
        credentials: "include",
      },
      headers: {},
    });

    expect(decision.type).toBe("allow");
  });

  it("dispatches generic policy checks by context operation", async () => {
    const app = window.angular.module("policyGenericCheck", []);

    app.config({
      $security: {
        defaultDecision: "deny",
        navigation: {
          rules: [
            {
              state: "dashboard",
              decision: "allow",
            },
          ],
        },
      },
    });
    const $security = createInjector(["ng", "policyGenericCheck"]).get(
      "$security",
    ) as SecurityPolicy;

    await expectAsync(
      $security.check({
        operation: "navigation",
        to: {
          name: "dashboard",
        },
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));

    await expectAsync(
      $security.check({
        operation: "request",
        method: "GET",
        url: "/resource",
        requestInit: {
          method: "GET",
          headers: {},
        },
        headers: {},
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "deny" }));
  });

  it("falls back to defaultDecision when no branches match", async () => {
    const app = window.angular.module("policyNoBranchMatch", []);

    app.config({
      $security: {
        defaultDecision: "deny",
        branches: ["jwt"],
      },
    });
    const $security = createInjector(["ng", "policyNoBranchMatch"]).get(
      "$security",
    ) as SecurityPolicy;

    const decision = await $security.check({
      operation: "request",
      method: "GET",
      url: "/resource",
      requestInit: {
        method: "GET",
        headers: {},
      },
      headers: {},
    });

    expect(decision.type).toBe("deny");
    expect(decision.reason).toBe(
      "No configured branch matched request context",
    );
  });

  it("attaches configured jwt credentials by branch order", async () => {
    const app = window.angular.module("policyJwtCredentials", []);

    app.config({
      $security: {
        defaultDecision: "deny",
        branches: ["jwt"],
        credentials: {
          jwt: () => "configured.jwt.token",
        },
      },
    });
    const $security = createInjector(["ng", "policyJwtCredentials"]).get(
      "$security",
    ) as SecurityPolicy;

    const decision = await $security.check({
      operation: "request",
      method: "GET",
      url: "/resource",
      requestInit: {
        method: "GET",
        headers: {},
      },
      headers: {},
    });
    const credentials = await $security.attachRequestAuth({
      operation: "request",
      method: "GET",
      url: "/resource",
      requestInit: {
        method: "GET",
        headers: {},
      },
      headers: {},
    });

    expect(decision.type).toBe("allow");
    expect((decision as { scheme?: string }).scheme).toBe("jwt");
    expect(credentials?.credential).toEqual({
      kind: "jwt",
      value: "configured.jwt.token",
    });
  });

  it("attaches configured cookie session credentials without cookie headers", async () => {
    const app = window.angular.module("policyCookieCredentials", []);

    app.config({
      $security: {
        defaultDecision: "deny",
        branches: ["cookieSession"],
        credentials: {
          cookieSession: {
            withCredentials: true,
          },
        },
      },
    });
    const $security = createInjector(["ng", "policyCookieCredentials"]).get(
      "$security",
    ) as SecurityPolicy;

    const context = {
      operation: "request" as const,
      method: "GET",
      url: "/resource",
      requestInit: {
        method: "GET",
        headers: {},
      },
      headers: {},
    };
    const decision = await $security.check(context);
    const credentials = await $security.attachRequestAuth(context);

    expect(decision.type).toBe("allow");
    expect((decision as { scheme?: string }).scheme).toBe("cookieSession");
    expect(credentials).toEqual({ withCredentials: true });
  });

  it("applies configured navigation rules before default decisions", async () => {
    const app = window.angular.module("policyNavigationRules", []);

    app.config({
      $security: {
        defaultDecision: "allow",
        navigation: {
          rules: [
            {
              state: "protected",
              decision: "redirect",
              target: "login",
              status: 302,
              reason: "login required",
            },
          ],
        },
      },
    });
    const $security = createInjector(["ng", "policyNavigationRules"]).get(
      "$security",
    ) as SecurityPolicy;

    const decision = await $security.check({
      operation: "navigation",
      to: {
        name: "protected",
        url: "/protected",
      },
    });

    expect(decision as unknown).toEqual({
      type: "redirect",
      status: 302,
      reason: "login required",
      target: "login",
      error: undefined,
      scheme: undefined,
    });
  });

  it("evaluates every credential-bearing transport form", async () => {
    const secure = createDirectSecurityPolicy({ defaultDecision: "allow" });

    await expectAsync(
      secure.check(
        requestContext({
          url: "//cdn.example.test/resource",
          requestInit: { credentials: "include" },
        }),
      ),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));
    await expectAsync(
      secure.check(
        requestContext({
          url: "https://example.test/resource",
          requestInit: { credentials: "include" },
        }),
      ),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));

    const insecureBase = createDirectSecurityPolicy(
      { defaultDecision: "allow" },
      "http://example.test/",
    );
    await expectAsync(
      insecureBase.check(
        requestContext({
          requestInit: { credentials: "include" },
        }),
      ),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        reason: "insecure transport blocked",
      }),
    );

    const invalidBase = createDirectSecurityPolicy(
      { defaultDecision: "allow" },
      "not a valid base URL",
    );
    await expectAsync(
      invalidBase.check(
        requestContext({
          url: "relative",
          requestInit: { credentials: "include" },
        }),
      ),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));
  });

  it("supports basic credentials from headers and configured sources", async () => {
    const fromHeader = createDirectSecurityPolicy({
      defaultDecision: "deny",
      branches: ["basic"],
    });
    const headerDecision = await fromHeader.check(
      requestContext({ headers: { AUTHORIZATION: "Basic encoded" } }),
    );

    expect(headerDecision).toEqual(
      jasmine.objectContaining({ type: "allow", scheme: "basic" }),
    );
    await expectAsync(
      fromHeader.attachRequestAuth(requestContext()),
    ).toBeResolvedTo(undefined);

    const configured = createDirectSecurityPolicy({
      defaultDecision: "deny",
      branches: ["basic"],
      credentials: { basic: "user:password" },
    });

    await expectAsync(configured.check(requestContext())).toBeResolvedTo(
      jasmine.objectContaining({ type: "allow", scheme: "basic" }),
    );
    await expectAsync(
      configured.attachRequestAuth(requestContext()),
    ).toBeResolvedTo({
      credential: { kind: "basic", value: "user:password" },
    });

    for (const basic of [() => "", () => null] as const) {
      const missing = createDirectSecurityPolicy({
        defaultDecision: "deny",
        branches: ["basic"],
        credentials: { basic },
      });

      await expectAsync(missing.check(requestContext())).toBeResolvedTo(
        jasmine.objectContaining({ type: "deny" }),
      );
      await expectAsync(
        missing.attachRequestAuth(requestContext()),
      ).toBeResolvedTo(undefined);
    }

    const optional = createDirectSecurityPolicy({
      defaultDecision: "allow",
      branches: ["basic"],
    });
    await expectAsync(optional.check(requestContext())).toBeResolvedTo(
      jasmine.objectContaining({ type: "allow", status: undefined }),
    );
  });

  it("normalizes every cookie-session configuration form", async () => {
    const cookieHeader = createDirectSecurityPolicy({
      defaultDecision: "deny",
      branches: ["cookieSession"],
    });

    await expectAsync(
      cookieHeader.check(
        requestContext({ headers: { Cookie: "session=present" } }),
      ),
    ).toBeResolvedTo(
      jasmine.objectContaining({ type: "allow", scheme: "cookieSession" }),
    );
    await expectAsync(
      cookieHeader.attachRequestAuth(requestContext()),
    ).toBeResolvedTo(undefined);

    for (const cookieSession of [false, { enabled: false }] as const) {
      const disabled = createDirectSecurityPolicy({
        defaultDecision: "deny",
        branches: ["cookieSession"],
        credentials: { cookieSession },
      });

      await expectAsync(disabled.check(requestContext())).toBeResolvedTo(
        jasmine.objectContaining({ type: "deny" }),
      );
    }

    const booleanSession = createDirectSecurityPolicy({
      defaultDecision: "deny",
      branches: ["cookieSession"],
      credentials: { cookieSession: true },
    });
    await expectAsync(
      booleanSession.attachRequestAuth(requestContext()),
    ).toBeResolvedTo({ withCredentials: true });

    const objectSession = createDirectSecurityPolicy({
      defaultDecision: "deny",
      branches: ["cookieSession"],
      credentials: {
        cookieSession: { enabled: true, withCredentials: false },
      },
    });
    await expectAsync(objectSession.check(requestContext())).toBeResolvedTo(
      jasmine.objectContaining({ type: "allow", scheme: "cookieSession" }),
    );
    await expectAsync(
      objectSession.attachRequestAuth(requestContext()),
    ).toBeResolvedTo({ withCredentials: false });
  });

  it("matches navigation state and URL rule variants", async () => {
    const policy = createDirectSecurityPolicy({
      defaultDecision: "deny",
      navigation: {
        rules: [
          { state: ["admin", "settings"], decision: "allow" },
          { state: "blocked", decision: "deny", reason: "blocked state" },
          { url: "/public", decision: "allow" },
          { url: /^\/reports\//, decision: "allow" },
          { decision: "allow" },
        ],
      },
    });

    await expectAsync(
      policy.check({ operation: "navigation", to: { name: "admin" } }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));
    await expectAsync(
      policy.check({ operation: "navigation", to: { name: "blocked" } }),
    ).toBeResolvedTo(
      jasmine.objectContaining({ type: "deny", reason: "blocked state" }),
    );
    await expectAsync(
      policy.check({ operation: "navigation", to: { url: "/public" } }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));
    await expectAsync(
      policy.check({ operation: "navigation", to: { url: "/reports/1" } }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));
    await expectAsync(
      policy.check({ operation: "navigation", to: { url: "/private" } }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "deny" }));
  });

  it("enforces route authentication and unknown requirements", async () => {
    const unauthenticated = createDirectSecurityPolicy({
      defaultDecision: "allow",
      branches: ["jwt"],
    });

    await expectAsync(
      unauthenticated.check({
        operation: "navigation",
        to: { name: "account" },
        routePolicy: {
          require: ["authenticated"],
          permissions: [],
          states: ["account"],
        },
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        status: 401,
        reason: "Authentication required",
      }),
    );

    const authenticated = createDirectSecurityPolicy({
      defaultDecision: "allow",
      branches: ["basic"],
      credentials: { basic: "user:password" },
    });
    await expectAsync(
      authenticated.check({
        operation: "navigation",
        to: { name: "account" },
        routePolicy: {
          require: ["authenticated"],
          permissions: [],
          states: ["account"],
        },
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));

    const jwtAuthenticated = createDirectSecurityPolicy({
      defaultDecision: "allow",
      branches: ["jwt"],
      credentials: { jwt: "jwt.token" },
    });
    await expectAsync(
      jwtAuthenticated.check({
        operation: "navigation",
        to: { name: "account" },
        routePolicy: {
          require: ["authenticated"],
          permissions: [],
          states: ["account"],
        },
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));

    const cookieAuthenticated = createDirectSecurityPolicy({
      defaultDecision: "allow",
      branches: ["cookieSession"],
      credentials: { cookieSession: true },
    });
    await expectAsync(
      cookieAuthenticated.check({
        operation: "navigation",
        to: { name: "account" },
        routePolicy: {
          require: ["authenticated"],
          permissions: [],
          states: ["account"],
        },
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));

    await expectAsync(
      authenticated.check({
        operation: "navigation",
        to: { name: "account" },
        routePolicy: {
          require: ["managed-device"],
          permissions: [],
          redirectTo: "unsupported",
          reason: "custom requirement",
          states: ["account"],
        },
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "redirect",
        target: "unsupported",
        reason: "custom requirement",
      }),
    );

    await expectAsync(
      authenticated.check({
        operation: "navigation",
        to: { name: "account" },
        routePolicy: {
          require: ["managed-device"],
          permissions: [],
          states: ["account"],
        },
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        reason: "Unknown navigation requirement 'managed-device'",
      }),
    );
  });

  it("enforces route permissions from static and dynamic sources", async () => {
    const denied = createDirectSecurityPolicy({
      defaultDecision: "allow",
      navigation: { permissions: () => null },
    });
    const routePolicy = {
      require: [],
      permissions: ["reports.read"],
      states: ["reports"],
    };

    await expectAsync(
      denied.check({
        operation: "navigation",
        to: { name: "reports" },
        routePolicy,
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        reason: "Permission 'reports.read' required",
      }),
    );

    const allowed = createDirectSecurityPolicy({
      defaultDecision: "allow",
      navigation: { permissions: ["reports.read"] },
    });
    await expectAsync(
      allowed.check({
        operation: "navigation",
        to: { name: "reports" },
        routePolicy,
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));

    const unconfigured = createDirectSecurityPolicy({
      defaultDecision: "allow",
    });
    await expectAsync(
      unconfigured.check({
        operation: "navigation",
        to: { name: "reports" },
        routePolicy,
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "deny" }));

    await expectAsync(
      allowed.check({
        operation: "navigation",
        to: { name: "public" },
        routePolicy: { ...routePolicy, public: true },
      }),
    ).toBeResolvedTo(jasmine.objectContaining({ type: "allow" }));
  });
});
