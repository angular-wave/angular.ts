import { StateParams } from "./params/state-params.ts";
import type { StateDeclaration } from "./state/interface.ts";
import type { StateObject } from "./state/state-object.ts";
import type { Transition } from "./transition/transition.ts";

/**
 * Mutable router state/config shared across state, URL, and transition services.
 *
 * @internal
 */
export class RouterProvider {
  /** @internal */
  _params: StateParams;
  /** @internal */
  _configuredRouting: boolean;
  /** @internal */
  _lastStartedTransitionId: number;
  /** @internal */
  _lastStartedTransition: Transition | undefined;
  /** @internal */
  _lastSuccessfulTransition: Transition | undefined;
  /** @internal */
  _successfulTransitionCleanup: ((trans: Transition) => void) | undefined;
  /** @internal */
  _injector: ng.InjectorService | undefined;
  /** @internal */
  _current: StateDeclaration | undefined;
  /** @internal */
  _currentState: StateObject | undefined;
  /** @internal */
  _transition: Transition | undefined;

  /**
   * Creates the shared mutable router globals container.
   */
  constructor() {
    this._params = new StateParams();
    this._configuredRouting = false;
    this._lastStartedTransitionId = -1;
    this._lastStartedTransition = undefined;
    this._lastSuccessfulTransition = undefined;
    this._successfulTransitionCleanup = undefined;
    this._injector = undefined;
    this._current = undefined;
    this._currentState = undefined;
    this._transition = undefined;
  }

  /**
   * Marks that the app has configured URL-driven router behavior.
   */
  /** @internal */
  _markConfiguredRouting(): void {
    this._configuredRouting = true;
  }

  /**
   * Returns true when URL-driven router behavior has been configured.
   */
  /** @internal */
  _hasConfiguredRouting(): boolean {
    return this._configuredRouting;
  }

  /** @internal */
  _setSuccessfulTransition(trans: Transition): void {
    if (this._lastSuccessfulTransition && this._successfulTransitionCleanup) {
      this._successfulTransitionCleanup(this._lastSuccessfulTransition);
    }

    this._lastSuccessfulTransition = trans;
  }

  /**
   * Returns the singleton router internals instance.
   */
  $get(): RouterProvider {
    return this;
  }
}
