import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const [, , generatedSourcesDir] = process.argv;

if (!generatedSourcesDir) {
  console.error("Usage: verify-generated-jsinterop.mjs <generated-sources-dir>");
  process.exit(1);
}

function listJavaFiles(dir) {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stat = statSync(path);

      return stat.isDirectory() ? listJavaFiles(path) : [path];
    })
    .filter((path) => path.endsWith(".java"));
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

const files = listJavaFiles(generatedSourcesDir);
const contents = new Map(
  files.map((path) => [relative(generatedSourcesDir, path), readFileSync(path, "utf8")]),
);
const allSource = [...contents.values()].join("\n");

assert(files.length > 0, `No generated Java files found in ${generatedSourcesDir}`);
assert(allSource.includes("@JsType"), "Generated Java sources do not contain @JsType.");
assert(
  /name\s*=\s*"ng\.[A-Za-z_$][\w$]*"/.test(allSource),
  'Generated Java sources do not contain ng.* native types.',
);

for (const expected of [
  "Angular",
  "NgModule",
  "Scope",
  "HttpService",
  "RestService",
  "EventBusService",
]) {
  assert(
    new RegExp(`\\b(?:class|interface)\\s+${expected}\\b`).test(allSource),
    `Missing generated Java type: ${expected}`,
  );
}

for (const [path, content] of contents) {
  assert(!content.includes("TODO Auto-generated"), `Generator TODO marker found in ${path}`);
  assert(!content.includes("Unknown type"), `Generator error marker found in ${path}`);

  if (path !== "org/angular/ts/ng/InjectionTokenMap.java") {
    assert(
      !/^\s*[^/\n]*\b\$[A-Za-z][A-Za-z0-9_]*\s*\(/m.test(content),
      `Generated Java method retains a dollar prefix in ${path}`,
    );
    assert(
      !/\b(?:Dollar[A-Z]|dollar[A-Z])/.test(content),
      `Generated Java identifier encodes a dollar-prefixed method in ${path}`,
    );
  }
}

const directiveLinkFn = contents.get(
  "org/angular/ts/ng/DirectiveLinkFn.java",
);
const directiveFactoryFn = contents.get(
  "org/angular/ts/ng/DirectiveFactoryFn.java",
);
const directiveCompileFn = contents.get(
  "org/angular/ts/ng/DirectiveCompileFn.java",
);
const directive = contents.get("org/angular/ts/ng/Directive.java");
const ngModule = contents.get("org/angular/ts/ng/NgModule.java");
const cookieService = contents.get("org/angular/ts/ng/CookieService.java");
const eventBusService = contents.get("org/angular/ts/ng/EventBusService.java");
const serviceWorkerService = contents.get(
  "org/angular/ts/ng/ServiceWorkerService.java",
);
const serviceWorkerMessageEvent = contents.get(
  "org/angular/ts/ng/ServiceWorkerMessageEvent.java",
);
const webSocketConfig = contents.get("org/angular/ts/ng/WebSocketConfig.java");
const component = contents.get("org/angular/ts/ng/Component.java");
const componentViewContext = contents.get(
  "org/angular/ts/ng/ProgrammaticViewContext.java",
);
const directiveViewContext = contents.get(
  "org/angular/ts/ng/ProgrammaticViewContext.java",
);

assert(
  directiveLinkFn?.includes("@JsFunction"),
  "Generated DirectiveLinkFn is not a @JsFunction callback.",
);
assert(
  directiveLinkFn?.includes("onInvoke(Scope scope,HTMLElement element)"),
  "Generated DirectiveLinkFn does not preserve meaningful parameter names.",
);
assert(
  /@param scope [^\n]+[\s\S]*@param element [^\n]+[\s\S]*onInvoke\(Scope scope,HTMLElement element\)/.test(
    directiveLinkFn ?? "",
  ),
  "Generated DirectiveLinkFn does not preserve callback parameter documentation.",
);
assert(
  directiveFactoryFn?.includes("@JsFunction"),
  "Generated DirectiveFactoryFn is not a @JsFunction callback.",
);
assert(
  directiveCompileFn?.includes("@JsFunction"),
  "Generated DirectiveCompileFn is not a @JsFunction callback.",
);
assert(
  directive?.includes("DirectiveCompileFn getCompile()"),
  "Generated Directive.getCompile does not return DirectiveCompileFn.",
);
assert(
  directive?.includes("setCompile(DirectiveCompileFn compile)"),
  "Generated Directive.setCompile does not accept DirectiveCompileFn.",
);
assert(
  directive?.includes("setLink(DirectiveLinkFn link)"),
  "Generated Directive.setLink does not accept DirectiveLinkFn.",
);
assert(
  ngModule?.includes(
    "directive(String name,DirectiveFactoryFn directiveFactory)",
  ),
  "Generated NgModule.directive does not accept DirectiveFactoryFn.",
);
assert(
  ngModule?.includes(
    "AngularTS module registration surface for controllers, directives, services",
  ),
  "Generated NgModule does not preserve its AngularTS type documentation.",
);
assert(
  ngModule?.includes("Declare built-in AngularTS service configuration"),
  "Generated NgModule.config does not preserve its AngularTS member documentation.",
);
assert(
  /Declare built-in AngularTS service configuration[\s\S]*@param config [^\n]+[\s\S]*config\(Object config\)/.test(
    ngModule ?? "",
  ),
  "Generated NgModule.config does not preserve its parameter documentation.",
);
assert(
  cookieService?.includes("jsinterop.base.JsPropertyMap<String> getAll()"),
  "Generated CookieService.getAll does not preserve its TypeScript record value type.",
);
assert(
  eventBusService?.includes(
    "Subscription subscribe(String topic,EventBusListener fn)",
  ),
  "Generated EventBusService.subscribe does not preserve its listener and subscription contracts.",
);
assert(
  serviceWorkerService?.includes(
    "elemental2.dom.ServiceWorkerRegistration getRegistration()",
  ),
  "Generated ServiceWorkerService.registration does not preserve its browser type.",
);
assert(
  serviceWorkerService?.includes(
    "Promise<elemental2.dom.ServiceWorkerRegistration> ready()",
  ) || serviceWorkerService?.includes(
    "elemental2.promise.Promise<elemental2.dom.ServiceWorkerRegistration> ready()",
  ),
  "Generated ServiceWorkerService.ready does not preserve its promise result type.",
);
assert(
  serviceWorkerService?.includes(
    "elemental2.dom.RegistrationOptions options",
  ),
  "Generated ServiceWorkerService.register does not preserve its browser options type.",
);
assert(
  serviceWorkerMessageEvent?.includes(
    "elemental2.dom.MessageEvent<TData> getEvent()",
  ),
  "Generated ServiceWorkerMessageEvent.event does not preserve its browser type argument.",
);
assert(
  webSocketConfig?.includes(
    "elemental2.core.JsArray<String> getProtocols()",
  ),
  "Generated WebSocketConfig.protocols does not preserve its TypeScript array type.",
);
assert(
  component?.includes(
    "ProgrammaticView<TControllerInstance,Object,TScopeInstance,TElement> getView()",
  ) &&
    component?.includes(
      "setView(ProgrammaticView<TControllerInstance,Object,TScopeInstance,TElement> view)",
    ) &&
    !component?.includes("ViewCallback"),
  "Generated Component.view does not preserve the named ProgrammaticView callback.",
);
assert(
  componentViewContext?.includes("Controller getController()") &&
    componentViewContext?.includes("Scope getScope()") &&
    componentViewContext?.includes("TranscludeCallback getTransclude()"),
  "Generated ProgrammaticViewContext does not preserve idiomatic Java accessors.",
);
assert(
  directiveViewContext?.includes("TRequired getRequired()") &&
    directiveViewContext?.includes("TController getController()"),
  "Generated ProgrammaticViewContext does not preserve typed controller accessors.",
);

const httpService = contents.get("org/angular/ts/ng/HttpService.java");
assert(
  httpService?.includes(
    "elemental2.core.JsArray<HttpRequestConfig> pendingRequests",
  ),
  "Generated HttpService.pendingRequests does not preserve its TypeScript array element type.",
);

const scope = contents.get("org/angular/ts/ng/Scope.java");
assert(
  scope?.includes("Runs synchronous scope mutations as one batch"),
  "Generated Scope.batch does not preserve its AngularTS member documentation.",
);
assert(
  /Runs synchronous scope mutations as one batch[\s\S]*@param fn [^\n]+[\s\S]*batch\(BatchListener<T> fn\)/.test(
    scope ?? "",
  ),
  "Generated Scope.batch does not preserve its parameter documentation.",
);
