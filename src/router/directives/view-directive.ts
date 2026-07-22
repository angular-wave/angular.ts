import {
  _anchorScroll,
  _interpolate,
  _parse,
  _scope,
  _state,
} from "../../injection-tokens.ts";
import {
  arrayFrom,
  assertDefined,
  isArray,
  isDefined,
  isInstanceOf,
  isString,
} from "../../shared/utils.ts";
import {
  dealoc,
  getCacheData,
  getInheritedData,
  getNormalizedAttr,
  removeElement,
  setCacheData,
} from "../../shared/dom.ts";
import {
  getCompiledFragmentRecord,
  type CompiledFragmentRecord,
} from "../../core/compile/incremental-fragment.ts";
import {
  type ViewConfig,
  type ActiveNgView,
  type ViewContext,
  type ViewService,
  type NgViewAnimData,
  type NgViewData,
  type RetainedViewEntry,
  loadViewConfig,
} from "../view/view.ts";
import type { StateRuntime } from "../state/state-service.ts";

interface PromiseResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function getFirstElementFromClone(
  clone: Node | Node[] | NodeList | DocumentFragment | null | undefined,
): HTMLElement | null {
  if (!clone) return null;

  if (isInstanceOf(clone, HTMLElement)) {
    return clone;
  }

  if (isInstanceOf(clone, DocumentFragment)) {
    const firstElement = clone.firstElementChild;

    return isInstanceOf(firstElement, HTMLElement) ? firstElement : null;
  }

  if (isInstanceOf(clone, NodeList) || isArray(clone)) {
    for (let i = 0, l = clone.length; i < l; i++) {
      const node = clone[i];

      if (isInstanceOf(node, HTMLElement)) {
        return node;
      }
    }

    return null;
  }

  return isInstanceOf(clone, Element) ? (clone as HTMLElement) : null;
}

function getRootNodesFromClone(
  clone: Node | Node[] | NodeList | DocumentFragment | null | undefined,
): Node[] {
  if (!clone) {
    return [];
  }

  if (isInstanceOf(clone, DocumentFragment)) {
    return arrayFrom(clone.childNodes);
  }

  return isInstanceOf(clone, NodeList) || isArray(clone)
    ? arrayFrom(clone)
    : [clone];
}

interface ActiveNgViewRootData {
  $cfg: { _viewDecl: { _context?: ViewContext } };
  $ngView: Partial<ActiveNgView>;
}

function withResolvers<T>(): PromiseResolvers<T> {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;

  let reject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    promise,
    resolve: assertDefined(resolve),
    reject: assertDefined(reject),
  };
}

/**
 * `ng-view`: A viewport directive which is filled in by a view from the active state.
 *
 * ### Attribute Runtime
 *
 * - `name`: (Optional) A view name.
 *   Named views are targeted from [[StateDeclaration.views]] entries.
 *
 * - `autoscroll`: an expression. When it evaluates to true, the `ng-view` will be scrolled into view when it is activated.
 *   Uses [[$anchorScroll]] to do the scrolling.
 *
 * - `onload`: Expression to evaluate whenever the view updates.
 *
 * #### Example:
 * A state can render into the unnamed `$default` view, or target named views.
 *
 * ```html
 * <div ng-view></div>
 * <div ng-view="messagelist"></div>
 * ```
 *
 * ```js
 * app.router("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 *
 * app.router("messages", {
 *   views: {
 *     messagelist: "messageList"
 *   }
 * })
 * ```
 *
 * #### Examples for `autoscroll`:
 * ```html
 * <!-- If autoscroll present with no expression,
 *      then scroll ng-view into view -->
 * <ng-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ng-view into view if expression evaluates to true -->
 * <ng-view autoscroll='true'/>
 * <ng-view autoscroll='false'/>
 * <ng-view autoscroll='scopeVariable'/>
 * ```
 *
 * Resolve data:
 *
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve`.
 *
 * #### Example:
 * ```js
 * app.router('home', {
 *   template: '<my-component user="$resolve.user"></my-component>',
 *   resolve: {
 *     user: ['UserService', function(UserService) { return UserService.fetchUser(); }]
 *   }
 * });
 * ```
 */

ViewDirective.$inject = [_state, _anchorScroll, _interpolate, _parse];

/**
 * Renders and updates the currently active view configuration.
 */
export function ViewDirective(
  $state: StateRuntime,
  $anchorScroll: ng.AnchorScrollService,
  $interpolate: ng.InterpolateService,
  $parse: ng.ParseService,
): ng.Directive {
  const $view: ViewService = $state._viewService;

  const rootContext = $view._rootViewContext() as ViewContext;

  const rootData: ActiveNgViewRootData = {
    $cfg: { _viewDecl: { _context: rootContext } },
    $ngView: {},
  };

  const directive: ng.Directive & { count: number } = {
    count: 0,
    terminal: true,
    priority: 400,
    transclude: "element",
    compile(tElement: Element, $transclude?: ng.TranscludeFn) {
      const transclude = assertDefined($transclude);
      const onloadExp = getNormalizedAttr(tElement, "onload") ?? "";
      const autoScrollExp = getNormalizedAttr(tElement, "autoscroll");
      const viewNameExp =
        getNormalizedAttr(tElement, "ngView") ??
        getNormalizedAttr(tElement, "name") ??
        "";

      return function (scope: ng.Scope, $element: HTMLElement) {
        const inherited =
            (getInheritedData($element, "$ngView") as
              | ActiveNgViewRootData
              | undefined) ?? rootData,
          rawName: unknown = assertDefined($interpolate(viewNameExp))(scope),
          name = isString(rawName) && rawName ? rawName : "$default";

        const onloadFn = onloadExp ? $parse(onloadExp) : undefined;

        const autoScrollFn = autoScrollExp ? $parse(autoScrollExp) : undefined;

        let currentEl: HTMLElement | null = null;

        let currentScope: ng.Scope | null = null;

        let currentNodes: Node[] = [];

        let currentFragment: CompiledFragmentRecord | null = null;

        let currentAnimation: NgViewAnimData | undefined;

        let currentConfig: ViewConfig | undefined;

        let viewConfig: ViewConfig | undefined;

        let configUpdateVersion = 0;

        let destroyed = false;

        let initialTemplate: string | undefined;

        const inheritedContext = inherited.$cfg._viewDecl._context;

        const parentFqn = inheritedContext?.name ?? inherited.$ngView._fqn;

        const activeNgView: ActiveNgView = {
          _id: directive.count++, // Global sequential ID for ng-view tags added to DOM
          _element: $element,
          _name: name, // ng-view name, retained internally for nested view matching
          _fqn: parentFqn ? `${parentFqn}.${name}` : name, // fully qualified name, describes location in DOM
          _config: null,
          _configUpdated: configUpdatedCallback,
          get _creationContext(): ViewContext {
            return (
              inheritedContext ??
              inherited.$ngView._creationContext ??
              rootContext
            );
          },
        };

        function configUpdatedCallback(config: ViewConfig | undefined): void {
          if (destroyed) return;

          const updateVersion = ++configUpdateVersion;

          if (!config) {
            if (!viewConfig) return;

            queueMicrotask(() => {
              if (
                updateVersion !== configUpdateVersion ||
                viewConfig !== undefined
              ) {
                return;
              }

              activeNgView._config = null;
              updateView(undefined);
            });

            viewConfig = undefined;
            activeNgView._config = null;

            return;
          }

          if (viewConfig === config) return;

          activeNgView._config = config;
          viewConfig = config;

          if (!config._loaded) {
            void loadViewConfig(config).then((loadedConfig) => {
              if (
                updateVersion !== configUpdateVersion ||
                viewConfig !== config
              ) {
                return undefined;
              }

              updateView(loadedConfig);

              return undefined;
            });

            return;
          }

          updateView(config);
        }

        setCacheData($element, "$ngView", { $ngView: activeNgView });
        const unregister = $view._registerNgView(activeNgView);

        if (!viewConfig) {
          updateView();
        }

        scope.$on("$destroy", function () {
          destroyed = true;
          configUpdateVersion++;
          viewConfig = undefined;
          activeNgView._config = null;
          unregister();
          currentConfig = undefined;
          cleanupLastView();
        });

        function cleanupLastView(): void {
          const destroyedScope = currentScope;
          const retention = currentConfig?._retention;

          if (
            retention?._mode === "keep-alive" &&
            currentConfig &&
            currentEl &&
            currentScope &&
            currentFragment &&
            currentAnimation
          ) {
            const retainedElement = currentEl;
            const retainedScope = currentScope;
            const retainedNodes = currentNodes;
            const retainedFragment = currentFragment;
            const retainedAnimation = currentAnimation;
            const retainedConfig = currentConfig;

            if (retention._pause === "schedulers") {
              retainedScope.$broadcast("$viewRetentionPause", retainedConfig);
            }

            removeElement(retainedElement, true);
            retainedAnimation.$$animLeave.resolve(undefined);
            currentEl = null;
            currentScope = null;
            currentNodes = [];
            currentFragment = null;
            currentAnimation = undefined;
            currentConfig = undefined;

            $view._retainView({
              _key: retention._key,
              _config: retainedConfig,
              _element: retainedElement,
              _nodes: retainedNodes,
              _fragment: retainedFragment,
              _scope: retainedScope,
              _animation: retainedAnimation,
            });

            return;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            const _viewData = getCacheData(currentEl, "$ngViewAnim") as
              | NgViewAnimData
              | undefined;
            const elementScope = getInheritedData(currentEl, _scope) as
              | ng.Scope
              | undefined;

            if (
              destroyedScope &&
              elementScope &&
              elementScope !== destroyedScope &&
              elementScope.$parent === destroyedScope &&
              !elementScope.$handler._destroyed
            ) {
              elementScope.$destroy();
            }

            if (currentFragment && !currentFragment.disposed) {
              currentFragment.dispose();
            } else {
              removeElement(currentEl);
            }
            _viewData?.$$animLeave.resolve(undefined);
            currentEl = null;
          }

          currentNodes = [];
          currentFragment = null;
          currentAnimation = undefined;
          currentConfig = undefined;
        }

        function updateView(config?: ViewConfig): void {
          const retained = config
            ? $view._restoreRetainedView(config)
            : undefined;

          if (config && retained) {
            restoreRetainedView(config, retained);

            return;
          }

          const newScope = scope.$new();

          const animEnter = withResolvers<undefined>();

          const animLeave = withResolvers<undefined>();

          const $ngViewAnim: NgViewAnimData = {
            $animEnter: animEnter.promise,
            $animLeave: animLeave.promise,
            $$animLeave: animLeave,
          };

          /**
           * Fired once the view **begins loading**, *before* the DOM is rendered.
           *
           * @param event Event object.
           * @param viewName Name of the view.
           */
          newScope.$emit("$viewContentLoading", name);

          let enteredElement: HTMLElement | null = null;

          let enteredNodes: Node[] = [];

          let enteredFragment: CompiledFragmentRecord | null = null;

          transclude(newScope, (clone) => {
            const elementClone = getFirstElementFromClone(clone);

            const cloneNodes = getRootNodesFromClone(clone);

            if (!elementClone) {
              return;
            }

            initialTemplate ??= elementClone.innerHTML;

            const viewData: NgViewData = {
              $cfg: config,
              $ngView: activeNgView,
            };

            for (let i = 0; i < cloneNodes.length; i++) {
              const node = cloneNodes[i];

              setCacheData(node, "$ngViewAnim", $ngViewAnim);
              setCacheData(node, "$ngView", viewData);
            }

            enteredElement = elementClone;
            enteredNodes = cloneNodes;
            enteredFragment = assertDefined(
              getCompiledFragmentRecord(assertDefined(cloneNodes[0])),
            );

            $element.after(elementClone);
            animEnter.resolve(undefined);
            cleanupLastView();
            currentEl = elementClone;
            currentScope = newScope;
            currentNodes = enteredNodes;
            currentFragment = enteredFragment;
            currentAnimation = $ngViewAnim;

            if (
              (isDefined(autoScrollExp) && !autoScrollExp) ||
              (autoScrollExp && autoScrollFn?.(scope))
            ) {
              $anchorScroll(elementClone);
            }
          });

          if (currentScope !== newScope) return;

          if (newScope.$handler._destroyed) {
            return;
          }

          const host = assertDefined(enteredElement);

          const viewData = getCacheData(host, "$ngView") as
            | NgViewData
            | undefined;

          $view._fillView({
            host,
            rootNodes: enteredNodes,
            scope: newScope,
            config,
            initial: viewData?.$initial ?? initialTemplate ?? "",
            activeNgView,
            animation: $ngViewAnim,
          });

          currentConfig = config;
          newScope.$emit("$viewContentAnimationEnded");
          /**
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param event Event object.
           */
          newScope.$emit("$viewContentLoaded", config ?? viewConfig);
          onloadFn?.(newScope);
        }

        function restoreRetainedView(
          config: ViewConfig,
          retained: RetainedViewEntry,
        ): void {
          const viewData: NgViewData = {
            $cfg: config,
            $ngView: activeNgView,
            $filled: true,
          };

          for (let i = 0; i < retained._nodes.length; i++) {
            const node = retained._nodes[i];

            setCacheData(node, "$ngViewAnim", retained._animation);
            setCacheData(node, "$ngView", viewData);
          }

          retained._scope.$emit("$viewContentLoading", name);
          $element.after(...retained._nodes);
          cleanupLastView();
          if (config._retention?._pause === "schedulers") {
            retained._scope.$broadcast("$viewRetentionResume", config);
          }
          currentEl = retained._element;
          currentScope = retained._scope;
          currentNodes = retained._nodes;
          currentFragment = assertDefined(retained._fragment);
          currentAnimation = retained._animation;
          currentConfig = config;
          retained._scope.$emit("$viewContentAnimationEnded");
          retained._scope.$emit("$viewContentLoaded", config);
          onloadFn?.(retained._scope);
        }
      };
    },
  };

  return directive;
}

/**
 * Clears stale fallback content before a routed `ng-view` clone links children.
 *
 * The mounted view is filled later by `ViewService`; this guard only preserves
 * the old two-directive transclusion ordering without owning view rendering.
 */
export function ViewDirectiveContentGuard(): ng.Directive {
  return {
    priority: -400,
    compile(tElement: HTMLElement) {
      const initial = tElement.innerHTML;

      return {
        pre(_scope: ng.Scope, $element: HTMLElement) {
          const data = getCacheData($element, "$ngView") as
            | NgViewData
            | undefined;

          if (data) {
            data.$initial ??= initial;
          }

          if (data?.$cfg && !data.$filled) {
            dealoc($element, true);
          }
        },
      };
    },
  };
}
