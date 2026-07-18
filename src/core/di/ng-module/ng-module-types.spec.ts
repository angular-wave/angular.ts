import { NgModule } from "./ng-module.ts";
import { Angular } from "../../../angular.ts";
import type { MachineContract } from "../../../services/machine/machine.ts";
import type {
  WorkflowContract,
  WorkflowCommandContext,
} from "../../../services/workflow/workflow.ts";

class GameStateService {
  strikeCount = 0;
}

class InjectedGameStateService {
  static $inject = ["gameState"];

  constructor(readonly gameState: GameStateService) {}
}

const module = new NgModule("type-regression", []);

module.service("gameState", GameStateService);
module.service("injectedGameState", InjectedGameStateService);
module.service("legacyGameState", function LegacyGameStateService() {
  return undefined;
});
module.model("user", {
  name: "John",
  authenticated: false,
});
module.model("session", () => ({
  token: undefined as string | undefined,
}));
module.constant("initialToken", "abc");
module.model("typedSession", [
  "initialToken",
  (initialToken: string) => ({
    token: initialToken,
  }),
]);
module.model<{ count: number }>("counter", () => ({
  count: 0,
}));
module.serviceWorker("/sw.js", {
  scope: "/",
  type: "module",
  updateViaCache: "imports",
  autoRegister: false,
});
// @ts-expect-error service worker script URL must be string, URL, or injectable
module.serviceWorker(1);
// @ts-expect-error service worker config must be object or injectable
module.serviceWorker("/sw.js", true);
// @ts-expect-error primitives are not reactive model roots
module.model("countValue", 0);
// @ts-expect-error arrays are not reactive model roots
module.model("items", []);
// @ts-expect-error keyed config overload is not public
module.config("log", { debug: true });
// @ts-expect-error provider callback config is internal
module.config(() => {});
module.config({
  $anchorScroll: {
    autoScrolling: false,
  },
});
module.config({
  $aria: {
    ariaDisabled: false,
    ariaCurrent: true,
    ariaCurrentToken: "page",
    bindKeydown: false,
    bindRoleForState: true,
    diagnostics: true,
  },
});
module.config({
  $aria: {
    // @ts-expect-error ariaCurrentToken only accepts standardized aria-current tokens
    ariaCurrentToken: "route",
  },
});
module.config({
  $log: {
    debug: true,
  },
});
module.config({
  $rest: {
    defaults: {
      withCredentials: false,
    },
  },
});
module.config({
  $router: {
    strict: false,
    caseInsensitive: true,
    defaultSquash: "~",
  },
});
module.router({
  name: "admin",
  url: "/admin",
  abstract: true,
  policy: {
    navigation: {
      authenticated: true,
      permissions: ["admin:read"],
      redirectTo: "login",
      reason: "admin only",
    },
  },
});
module.router({
  name: "account",
  url: "/account",
  component: "accountShell",
  policy: {
    navigation: {
      authenticated: true,
      redirectTo: "login",
    },
  },
  children: [
    {
      name: "profile",
      url: "/profile",
      resolve: {
        profile: () => ({ name: "John" }),
      },
    },
    {
      name: "account.security",
      url: "/security",
      policy: {
        navigation: {
          permissions: ["account:security"],
        },
      },
      children: [
        {
          name: "devices",
          url: "/devices",
          template: "<account-devices></account-devices>",
        },
      ],
    },
  ],
});
const typedRouteTreeModule = module.router({
  name: "workspace",
  url: "/workspace",
  children: [
    {
      name: "editor",
      url: "/editor/:id",
    },
  ],
} as const);

// @ts-expect-error inferred router modules reject unknown state names
typedRouteTreeModule.router({
  name: "workspace",
  children: [{ name: "unknown", url: "/unknown" }],
});

type TypedAdminRoutes = {
  "admin.users": {
    params: { page?: number };
    resolves: { users: { id: string }[] };
  };
  "admin.roles": {};
};

const typedAngular = new Angular({ registerBuiltins: false });
const typedAdminModule = typedAngular.module<TypedAdminRoutes>(
  "typedAdmin",
  [],
);
const namespaceTypedAdminModule: ng.RouterModule<TypedAdminRoutes> =
  typedAdminModule;

typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "users",
      url: "/users",
      params: {
        page: { type: "int" },
      },
      resolve: {
        users: () => [{ id: "1" }],
      },
    },
  ],
});
// @ts-expect-error explicitly typed router modules reject unknown state names
typedAdminModule.router({
  name: "admin",
  children: [{ name: "audit", url: "/audit" }],
});
// @ts-expect-error typed router module state params reject unknown keys
typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "users",
      url: "/users",
      params: { cursor: { type: "string" } },
    },
  ],
});
// @ts-expect-error typed router module resolves reject unknown keys
typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "users",
      url: "/users",
      resolve: { user: () => ({ id: "1" }) },
    },
  ],
});
// @ts-expect-error typed router module resolve values must match route map values
typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "users",
      url: "/users",
      resolve: { users: () => ({ id: "1" }) },
    },
  ],
});
const configuredTypedAdminModule = typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "users",
      url: "/users",
      params: { page: { type: "int" } },
      resolve: { users: () => [{ id: "1" }] },
    },
  ],
});
typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "roles",
      url: "/roles",
    },
  ],
});
// @ts-expect-error typed router trees reject child states outside the route map
typedAdminModule.router({
  name: "admin",
  children: [
    {
      name: "audit",
      url: "/audit",
    },
  ],
});
configuredTypedAdminModule.router({
  name: "admin",
  children: [{ name: "roles", url: "/roles" }],
});
configuredTypedAdminModule.lazyState("admin", () => []);
configuredTypedAdminModule.lazyState("admin.**", () => []);
configuredTypedAdminModule.lazyState("admin.roles", () => []);
configuredTypedAdminModule.lazyState("admin.roles.**", () => []);
// @ts-expect-error typed router modules preserve the explicit route map after router(...)
configuredTypedAdminModule.router({
  name: "admin",
  children: [{ name: "audit", url: "/audit" }],
});
// @ts-expect-error typed lazy state namespaces must match the route map
configuredTypedAdminModule.lazyState("admin.audit.**", () => []);
void namespaceTypedAdminModule;
// @ts-expect-error router declaration requires a name
module.router({ url: "/missing-name" });
// @ts-expect-error router children must be router declarations
module.router({ name: "invalidChildren", children: ["child"] });
module.config({
  $compile: {
    strictComponentBindingsEnabled: true,
    propertySecurityContexts: [
      {
        elementName: "*",
        propertyName: "title",
        context: "resourceUrl",
      },
    ],
  },
});
module.config({
  $log: {
    logger: () => ({
      debug() {
        /* empty */
      },
      error() {
        /* empty */
      },
      info() {
        /* empty */
      },
      log() {
        /* empty */
      },
      warn() {
        /* empty */
      },
    }),
  },
});
module.config({
  $cookie: {
    defaults: {
      path: "/",
      samesite: "Lax",
      secure: true,
    },
  },
});
module.config({
  $exceptionHandler: {
    handler(error) {
      throw error;
    },
  },
});
module.config({
  $eventBus: {
    deliveryPolicy(context) {
      return context.topic.startsWith("admin:") ? "drop" : "deliver";
    },
  },
});
module.config({
  $eventBus: {
    // @ts-expect-error event delivery decision must be deliver or drop
    deliveryPolicy: () => "queue",
  },
});
module.config({
  $http: {
    defaults: {
      headers: {
        common: {
          Authorization: "Bearer token",
        },
        post: {
          "X-Mode": "configured",
        },
      },
      withCredentials: true,
      xsrfCookieName: "APP-XSRF",
      xsrfHeaderName: "X-APP-XSRF",
      paramSerializer(params) {
        return Object.keys(params).join("&");
      },
    },
    interceptors: [
      "authInterceptor",
      () => ({
        request(config) {
          return config;
        },
      }),
    ],
    xsrfTrustedOrigins: ["https://api.example.com"],
  },
});
module.config({
  $interpolate: {
    startSymbol: "[[",
    endSymbol: "]]",
  },
});
module.config({
  $location: {
    html5Mode: true,
    hashPrefix: "!",
  },
});
module.config({
  $location: {
    html5Mode: {
      enabled: true,
      requireBase: false,
      rewriteLinks: "internal-link",
    },
  },
});
module.config({
  $sce: {
    enabled: true,
  },
});
module.config({
  $sceDelegate: {
    trustedResourceUrlList: ["self", "https://cdn.example.com/**", /^https?:/],
    bannedResourceUrlList: ["https://cdn.example.com/private/**"],
    aHrefSanitizationTrustedUrlList: /^https?:/,
    imgSrcSanitizationTrustedUrlList: /^\s*(https?|data:image\/)/,
  },
});
module.config({
  $templateCache: {
    cache: new Map([["cached.html", "<p>Cached</p>"]]),
  },
});
module.config({
  $templateRequest: {
    httpOptions: {
      headers: {
        "X-Template": "configured",
      },
      withCredentials: true,
      timeout: 1000,
    },
  },
});
module.config({
  $security: {
    fallback: "allow",
    credentials: {
      bearer: () => "token",
      cookie: true,
      order: ["bearer", "cookie"],
    },
    permissions: async (permission, context) =>
      permission === "admin:read" && context.to.name === "admin",
  },
});
module.config({
  $sse: {
    defaults: {
      withCredentials: true,
      params: {
        channel: "alerts",
      },
      retryDelay: 500,
      maxRetries: 3,
      heartbeatTimeout: 10_000,
    },
  },
});
module.config({
  $websocket: {
    defaults: {
      protocols: ["json"],
      retryDelay: 750,
      maxRetries: 5,
      heartbeatTimeout: 30_000,
    },
  },
});
module.config({
  $webTransport: {
    defaults: {
      allowPooling: true,
      congestionControl: "low-latency",
      reconnect: true,
      retryDelay: (attempt) => attempt * 100,
      maxRetries: 2,
      serverCertificateHashes: [
        {
          algorithm: "sha-256",
          value: new Uint8Array(),
        },
      ],
    },
  },
});
module.config({
  $anchorScroll: {
    autoScrolling: true,
  },
  $aria: {
    ariaHidden: true,
    ariaInvalid: false,
    bindRoleForClick: true,
    diagnostics: false,
  },
  $log: {
    debug: false,
  },
  $cookie: {
    defaults: {
      domain: "example.test",
    },
  },
  $exceptionHandler: {
    handler(error) {
      throw error;
    },
  },
  $http: {
    defaults: {
      cache: true,
    },
    interceptors: [],
    xsrfTrustedOrigins: [],
  },
  $interpolate: {
    startSymbol: "[[",
    endSymbol: "]]",
  },
  $location: {
    html5Mode: false,
  },
  $sce: {
    enabled: false,
  },
  $sceDelegate: {
    trustedResourceUrlList: null,
    bannedResourceUrlList: [],
  },
  $rest: {
    defaults: {
      timeout: 1000,
    },
  },
  $templateCache: {
    cache: new Map(),
  },
  $templateRequest: {
    httpOptions: {
      responseType: "text",
    },
  },
  $security: {
    fallback: "deny",
    allowInsecureOrigins: [],
    isAuthenticated: async () => true,
    credentials: {
      bearer: "token",
      basic: { username: "user", password: "password" },
      cookie: true,
      order: ["basic", "bearer"],
    },
    permissions: ["admin:read"],
  },
  $htmlCanvas: {
    enabled: false,
    throwOnUnsupported: true,
    defaultScheduler: "paint",
    defaultMode: "2d",
    requireFlag: true,
  },
  $sse: {
    defaults: {
      eventTypes: ["notice"],
      heartbeatTimeout: 5000,
    },
  },
  $websocket: {
    defaults: {
      protocols: ["json", "binary"],
      heartbeatTimeout: 0,
    },
  },
  $webTransport: {
    defaults: {
      reconnect: false,
      retryDelay: 1000,
    },
  },
});
module.lazyState("admin.**", () => [
  {
    name: "admin",
    url: "/admin",
    component: "adminPage",
  },
]);
module.lazyState("settings", async (target, injector) => ({
  name: String(target.identifier()),
  url: "/settings",
  template: injector ? "<settings-page></settings-page>" : "<span></span>",
}));
// @ts-expect-error unknown config key
module.config({ unknown: {} });
// @ts-expect-error bare service config keys are not public
module.config({ http: { defaults: {} } });
// @ts-expect-error bare service config keys are not public
module.config({ security: { fallback: "deny" } });
// @ts-expect-error invalid anchor scroll config field
module.config({ $anchorScroll: { enabled: false } });
// @ts-expect-error anchor scroll autoScrolling must be boolean
module.config({ $anchorScroll: { autoScrolling: "false" } });
// @ts-expect-error invalid aria config field
module.config({ $aria: { disabled: false } });
// @ts-expect-error aria config fields must be boolean
module.config({ $aria: { ariaDisabled: "false" } });
// @ts-expect-error invalid log config field
module.config({ $log: { verbose: true } });
// @ts-expect-error invalid cookie config field
module.config({ $cookie: { defaults: { samesite: "Invalid" } } });
// @ts-expect-error invalid exception handler config field
module.config({ $exceptionHandler: { swallow: true } });
// @ts-expect-error exception handler must be callable
module.config({ $exceptionHandler: { handler: true } });
// @ts-expect-error invalid http config field
module.config({ $http: { timeout: 1000 } });
// @ts-expect-error http defaults withCredentials must be boolean
module.config({ $http: { defaults: { withCredentials: "true" } } });
// @ts-expect-error http interceptors must be injectable interceptor factories
module.config({ $http: { interceptors: [42] } });
// @ts-expect-error http xsrf trusted origins must be strings
module.config({ $http: { xsrfTrustedOrigins: [42] } });
// @ts-expect-error invalid interpolate config field
module.config({ $interpolate: { open: "[[" } });
// @ts-expect-error interpolate symbols must be strings
module.config({ $interpolate: { startSymbol: 1 } });
// @ts-expect-error invalid location config field
module.config({ $location: { html5Mode: { unknown: true } } });
// @ts-expect-error invalid location rewriteLinks type
module.config({ $location: { html5Mode: { rewriteLinks: 1 } } });
// @ts-expect-error invalid sce config field
module.config({ $sce: { strict: false } });
// @ts-expect-error sce enabled must be boolean
module.config({ $sce: { enabled: "false" } });
// @ts-expect-error invalid sceDelegate config field
module.config({ $sceDelegate: { trustedUrls: ["self"] } });
// @ts-expect-error sceDelegate matchers must be strings or RegExp
module.config({ $sceDelegate: { trustedResourceUrlList: [{}] } });
// @ts-expect-error sceDelegate sanitizer lists must be RegExp
module.config({ $sceDelegate: { aHrefSanitizationTrustedUrlList: "https" } });
// @ts-expect-error security fallback must be allow or deny
module.config({ $security: { fallback: "block" } });
// @ts-expect-error insecure origin entries must be strings
module.config({ $security: { allowInsecureOrigins: [1] } });
// @ts-expect-error security bearer credential source must be a string or function
module.config({ $security: { credentials: { bearer: 1 } } });
// @ts-expect-error security cookie config must be boolean
module.config({ $security: { credentials: { cookie: "session" } } });
module.config({
  $security: {
    credentials: {
      // @ts-expect-error security credential order only accepts built-in schemes
      order: ["custom"],
    },
  },
});
module.config({
  $htmlCanvas: {
    enabled: true,
    throwOnUnsupported: true,
    defaultScheduler: "paint",
    defaultMode: "webgl",
    requireFlag: true,
  },
});
module.config({
  $htmlCanvas: {
    enabled: "auto",
    throwOnUnsupported: true,
    defaultScheduler: "raf",
    defaultMode: "webgpu",
  },
});
const htmlCanvasNamespaceConfig: ng.HtmlCanvasConfig = {
  enabled: false,
  defaultScheduler: "paint",
  defaultMode: "2d",
};
void htmlCanvasNamespaceConfig;
// @ts-expect-error active html canvas config requires strict failure handling
module.config({ $htmlCanvas: { enabled: true } });
// @ts-expect-error html canvas enabled must be boolean or auto
module.config({ $htmlCanvas: { enabled: "yes" } });
// @ts-expect-error html canvas scheduler must be paint or raf
module.config({ $htmlCanvas: { enabled: false, defaultScheduler: "timeout" } });
// @ts-expect-error html canvas mode must be 2d, webgl, or webgpu
module.config({ $htmlCanvas: { enabled: false, defaultMode: "svg" } });
// @ts-expect-error invalid sse config field
module.config({ $sse: { credentials: true } });
// @ts-expect-error sse withCredentials must be boolean
module.config({ $sse: { defaults: { withCredentials: "true" } } });
// @ts-expect-error websocket protocols must be strings
module.config({ $websocket: { defaults: { protocols: [1] } } });
// @ts-expect-error websocket maxRetries must be number
module.config({ $websocket: { defaults: { maxRetries: "forever" } } });
const webComponentConfig: ng.WebComponentConfig = {
  defaults: {
    isolate: true,
    shadow: { mode: "closed" },
  },
};
module.config({ $webComponent: webComponentConfig });
module.config({
  $webComponent: {
    defaults: {
      // @ts-expect-error web component shadow mode must be open or closed
      shadow: { mode: "private" },
    },
  },
});
// @ts-expect-error invalid webTransport config field
module.config({ $webTransport: { heartbeatTimeout: 1000 } });
// @ts-expect-error webTransport retryDelay must be number or function
module.config({ $webTransport: { defaults: { retryDelay: "fast" } } });
module.config({
  $webTransport: {
    // @ts-expect-error webTransport congestionControl rejects unknown values
    defaults: { congestionControl: "balanced" },
  },
});
module.config({
  $compile: {
    // @ts-expect-error compile strict mode must be boolean
    strictComponentBindingsEnabled: "true",
  },
});
module.config({
  $compile: {
    propertySecurityContexts: {
      // @ts-expect-error compile property context list must be an array
      elementName: "div",
      propertyName: "href",
      context: "url",
    },
  },
});
module.config({
  $compile: {
    propertySecurityContexts: [
      {
        elementName: "div",
        propertyName: "href",
        // @ts-expect-error compile property context field must be strings
        context: 1,
      },
    ],
  },
});
// @ts-expect-error invalid templateCache config field
module.config({ $templateCache: { store: new Map() } });
// @ts-expect-error templateCache cache must use string template content
module.config({ $templateCache: { cache: new Map<string, number>() } });
// @ts-expect-error invalid templateRequest config field
module.config({ $templateRequest: { options: {} } });
// @ts-expect-error templateRequest httpOptions must be an object
module.config({ $templateRequest: { httpOptions: true } });
// @ts-expect-error templateRequest timeout must be number or Promise
module.config({ $templateRequest: { httpOptions: { timeout: "1000" } } });
// @ts-expect-error invalid rest config field
module.config({ $rest: { defaults: "invalid" } });
// @ts-expect-error invalid rest config field
module.config({ $rest: { default: {} } });
// @ts-expect-error invalid router config field
module.config({ $router: { trailingSlash: false } });
// @ts-expect-error router strict must be boolean
module.config({ $router: { strict: "false" } });
// @ts-expect-error router default squash value must be boolean or string
module.config({ $router: { defaultSquash: 1 } });
module.config({
  $router: {
    paramTypes: {
      slug: {
        pattern: /[a-z]+-[0-9]+/i,
        encode: (value: string) => `s-${value}`,
        decode: (value: string) => value.replace(/^s-/, ""),
        is: (value: unknown) => typeof value === "string",
        equals: (a: unknown, b: unknown) => a === b,
      },
    },
    viewTransitions: true,
    loading: "loading",
    retry: 2,
    fallbackTo: "fallback",
    errorBoundary: "error",
    error: {
      state: "error",
      params: {},
    },
  },
});
// @ts-expect-error router param type pattern must be a regular expression when provided
module.config({ $router: { paramTypes: { slug: { pattern: "a" } } } });
// @ts-expect-error router viewTransitions must be boolean
module.config({ $router: { viewTransitions: "auto" } });
// @ts-expect-error router retry must be boolean, number, or policy function
module.config({ $router: { retry: "again" } });
// @ts-expect-error router fallback target must be a state name or target object
module.config({ $router: { fallbackTo: ["fallback"] } });
// @ts-expect-error unknown object config key
module.config({ unknown: {} });
// @ts-expect-error invalid object config field
module.config({ $log: { verbose: true } });
// @ts-expect-error lazy state prefix must be a string
module.lazyState(1, () => undefined);
// @ts-expect-error lazy state loader must be callable
module.lazyState("admin", {});
interface SessionMachineContract extends MachineContract {
  data: { roomId: string };
  events: { join: { roomId: string } };
  state: "setup" | "waiting";
}

module.machine<SessionMachineContract>("sessionMachine", {
  initial: "setup",
  data: {
    roomId: "",
  },
  states: {
    setup: {
      on: {
        join: {
          to: "waiting",
          update({ data, payload }) {
            data.roomId = payload.roomId;
          },
        },
      },
    },
    waiting: {},
  },
});
interface ModuleBuildContract extends WorkflowContract {
  data: { output: string };
  commands: ModuleBuildCommands;
  state: "idle" | "building" | "failed";
}

interface ModuleBuildCommands {
  build: { input: string; output: { file: string } };
}

module.workflow<ModuleBuildContract>("buildWorkflow", {
  id: "build-workflow",
  initial: "idle",
  data: {
    output: "",
  },
  commands: {
    build: {
      from: "idle",
      pending: "building",
      execute({ input }: WorkflowCommandContext<ModuleBuildContract, string>) {
        return { file: input };
      },
      success: {
        to: "idle",
        update({ data, output }) {
          data.output = output.file;
        },
      },
      failure: "failed",
    },
  },
});
module.workflowSupervisor("pipelineSupervisor", {
  id: "pipeline-supervisor",
  workflows: {
    build: {
      id: "supervised-build",
      initial: "idle",
      data: {
        output: "",
      },
      commands: {
        build: {
          from: "idle",
          pending: "building",
          execute({
            input,
          }: WorkflowCommandContext<ModuleBuildContract, string>) {
            return { file: input };
          },
          success: {
            to: "idle",
            update({
              data,
              output,
            }: {
              data: { output: string };
              output: { file: string };
            }) {
              data.output = output.file;
            },
          },
          failure: "failed",
        },
      },
    },
  },
  persistence: "indexeddb",
  autoPersist: true,
});
module.workflowSupervisor("dynamicPipelineSupervisor", () => ({
  id: "dynamic-pipeline-supervisor",
  workflows: {
    build: {
      id: "dynamic-supervised-build",
      initial: "idle",
      data: {
        output: "",
      },
      commands: {},
    },
  },
}));
// @ts-expect-error workflow supervisor config requires workflows
module.workflowSupervisor("missingWorkflows", {
  id: "missing-workflows",
});
