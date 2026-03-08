import {
  assertNotHasOwnProperty,
  errorHandlingConfig,
  hasOwn,
  isArray,
  isObject,
  isString,
  minErr,
  ngAttrPrefixes,
  values,
} from "./shared/utils.js";
import {
  getController,
  getInjector,
  getScope,
  setCacheData,
} from "./shared/dom.ts";
import type {
  AngularBootstrapConfig,
  InvocationDetail,
  Provider,
} from "./interface.ts";
import { createInjector } from "./core/di/injector.ts";
import { NgModule } from "./core/di/ng-module/ng-module.ts";
import { registerNgModule } from "./ng.ts";
import { unnestR } from "./shared/common.ts";
import { $injectTokens as $t } from "./injection-tokens.ts";
import { annotate } from "./core/di/di.ts";
import { validateIsString } from "./shared/validate.ts";
import type { StateRegistryProvider } from "./router/state/state-registry.ts";
import type { Resolvable } from "./router/resolve/resolvable.ts";

const ngMinErr = minErr("ng");
const $injectorMinErr = minErr("$injector");
const STRICT_DI = "strict-di";

type ModuleRegistry = Record<string, NgModule | null>;
type AppElement = { _element: HTMLElement; _module: string | null };
type WindowWithAngular = Window & typeof globalThis & { angular?: Angular };

const moduleRegistry: ModuleRegistry = {};

export class Angular extends EventTarget {
  private subapps: Angular[] = [];
  private _bootsrappedModules: Array<string | any> = [];

  public $eventBus!: ng.PubSubService;
  public $injector!: ng.InjectorService;
  public $rootScope!: ng.Scope;
  public version = "[VI]{version}[/VI]";
  public getController = getController;
  public getInjector = getInjector;
  public getScope = getScope;
  public errorHandlingConfig = errorHandlingConfig;
  public $t: ng.InjectionTokens = {} as ng.InjectionTokens;

  constructor(subapp = false) {
    super();

    values($t).forEach((token) => {
      (this.$t as Record<string, string>)[token] = token;
    });

    if (!subapp) {
      (window as WindowWithAngular).angular = this;
    }

    registerNgModule(this);
  }

  module(
    name: string,
    requires?: string[],
    configFn?: ng.Injectable<any>,
  ): NgModule {
    assertNotHasOwnProperty(name, "module");

    if (requires && hasOwn(moduleRegistry, name)) {
      moduleRegistry[name] = null;
    }

    return ensure(moduleRegistry, name, () => {
      if (!requires) {
        throw $injectorMinErr(
          "nomod",
          "Module '{0}' is not available. Possibly misspelled or not loaded",
          name,
        );
      }

      return new NgModule(name, requires, configFn);
    });
  }

  dispatchEvent(event: Event): boolean {
    const customEvent = event as CustomEvent<string | InvocationDetail>;
    const $parse = this.$injector.get($t._parse);
    const injectable = customEvent.type;
    const target = this.$injector.has(injectable)
      ? this.$injector.get(injectable)
      : this.getScopeByName(injectable);

    if (!target) {
      const { detail } = customEvent;

      if (isInvocationDetail(detail) && detail._reply) {
        detail._reply.reject(new Error(`No target found for "${injectable}"`));
      }

      return false;
    }

    const { detail } = customEvent;
    const expr = isString(detail)
      ? detail
      : isInvocationDetail(detail)
        ? detail.expr
        : "";

    try {
      const result = $parse(expr)(target);

      if (isInvocationDetail(detail) && detail._reply) {
        Promise.resolve(result).then(
          detail._reply.resolve,
          detail._reply.reject,
        );
      }
    } catch (err) {
      if (isInvocationDetail(detail) && detail._reply) {
        detail._reply.reject(err);
      }
    }

    return true;
  }

  emit(input: string): void {
    const { type, expr } = this.splitInvocation(input);
    this.dispatchEvent(new CustomEvent(type, { detail: expr }));
  }

  call(input: string): Promise<any> {
    const { type, expr } = this.splitInvocation(input);

    return new Promise((resolve, reject) => {
      const ok = this.dispatchEvent(
        new CustomEvent(type, {
          detail: { expr, __reply: { resolve, reject } } as never,
        }),
      );

      if (!ok) {
        reject(new Error(`Dispatch failed for "${type}"`));
      }
    });
  }

  bootstrap(
    element: string | HTMLElement | HTMLDocument,
    modules?: Array<string | any>,
    config: AngularBootstrapConfig = { strictDi: false },
  ): ng.InjectorService {
    if (element instanceof Element && getInjector(element)) {
      throw ngMinErr("btstrpd", "App already bootstrapped");
    }

    if (isArray(modules)) {
      this._bootsrappedModules = modules;
    }

    this._bootsrappedModules.unshift([
      "$provide",
      ($provide: Provider) => {
        $provide.value($t._rootElement, element);
      },
    ]);

    this._bootsrappedModules.unshift("ng");

    const injector = createInjector(this._bootsrappedModules, config.strictDi);

    injector.invoke([
      $t._rootScope,
      $t._rootElement,
      $t._compile,
      $t._injector,
      (
        scope: ng.Scope,
        el: HTMLElement,
        compile: ng.CompileService,
        $injector: ng.InjectorService,
      ) => {
        this.$rootScope = scope;
        this.$injector = $injector;

        setCacheData(el, $t._injector, $injector);

        const compileFn = compile(el);
        compileFn(scope);

        if (!hasOwn($injector, "strictDi")) {
          try {
            $injector.invoke(() => {
              /* empty */
            });
          } catch (error) {
            const errorStr =
              error instanceof Error ? error.toString() : String(error);

            $injector.strictDi = !!/strict mode/.exec(errorStr);
          }
        }

        const stateRegistry = $injector.get(
          $t._stateRegistry,
        ) as StateRegistryProvider;

        stateRegistry
          .getAll()
          .map((state) => state._state().resolvables)
          .reduce(unnestR, [])
          .filter((resolvable: Resolvable) => resolvable.deps === "deferred")
          .forEach((resolvable: Resolvable) => {
            resolvable.deps = annotate(
              resolvable.resolveFn,
              $injector.strictDi,
            );
          });
      },
    ]);

    return injector;
  }

  injector(modules: any[], strictDi?: boolean): ng.InjectorService {
    this.$injector = createInjector(modules, strictDi);
    return this.$injector;
  }

  init(element: HTMLElement | HTMLDocument): void {
    const appElements: AppElement[] = [];
    let multimode = false;

    ngAttrPrefixes.forEach((prefix) => {
      const name = `${prefix}app`;
      let candidates: HTMLElement[] | NodeListOf<Element>;

      if (
        element.nodeType === 1 &&
        (element as HTMLElement).hasAttribute(name)
      ) {
        candidates = [element as HTMLElement];
      } else {
        candidates = element.querySelectorAll(`[${name}]`);
      }

      candidates.forEach((el) => {
        appElements.push({
          _element: el as HTMLElement,
          _module: (el as HTMLElement).getAttribute(name),
        });
      });
    });

    appElements.forEach((app) => {
      const strictDi =
        app._element.hasAttribute(STRICT_DI) ||
        app._element.hasAttribute(`data-${STRICT_DI}`);

      if (multimode) {
        const submodule = new Angular(true);
        this.subapps.push(submodule);
        submodule.bootstrap(app._element, app._module ? [app._module] : [], {
          strictDi,
        });
      } else {
        this.bootstrap(app._element, app._module ? [app._module] : [], {
          strictDi,
        });
      }

      multimode = true;
    });
  }

  getScopeByName(name: string): ng.Scope | undefined {
    validateIsString(name, "name");

    const $rootScope = this.$injector.get($t._rootScope) as ng.RootScopeService;
    const scope = $rootScope.$searchByName(name);

    return scope ? (scope.$proxy as unknown as ng.Scope) : undefined;
  }

  private splitInvocation(input: string): { type: string; expr: string } {
    if (typeof input !== "string") {
      throw new TypeError("Invocation must be a string.");
    }

    const trimmed = input.trim();
    const parts = trimmed.split(".");

    if (parts.length < 2) {
      throw new Error(
        `Invalid invocation "${input}". Expected "<target>.<expression>".`,
      );
    }

    const type = String(parts.shift()).trim();
    const expr = parts.join(".").trim();

    if (!type || !expr) {
      throw new Error(
        `Invalid invocation "${input}". Expected "<target>.<expression>".`,
      );
    }

    return { type, expr };
  }
}

function ensure(
  obj: ModuleRegistry,
  name: string,
  factory: () => NgModule,
): NgModule {
  return obj[name] || (obj[name] = factory());
}

function isInvocationDetail(value: unknown): value is InvocationDetail {
  return (
    isObject(value) && typeof (value as InvocationDetail).expr === "string"
  );
}
