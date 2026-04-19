import { Queue } from "../shared/queue.ts";
import { StateParams } from "./params/state-params.ts";
import type { StateDeclaration } from "./state/interface.ts";
import type { StateObject } from "./state/state-object.ts";
import type { Transition } from "./transition/transition.ts";

/**
 * Mutable router globals shared across state, URL, and transition services.
 */
export class RouterProvider {
  params: StateParams;
  /** @internal */
  _configuredRouting: boolean;
  /** @internal */
  _lastStartedTransitionId: number;
  /** @internal */
  _transitionHistory: Queue<Transition>;
  /** @internal */
  _successfulTransitions: Queue<Transition>;
  current: StateDeclaration | undefined;
  $current: StateObject | undefined;
  transition: Transition | undefined;

  /**
   * Creates the shared mutable router globals container.
   */
  constructor() {
    this.params = new StateParams();
    this._configuredRouting = false;
    this._lastStartedTransitionId = -1;
    this._transitionHistory = new Queue<Transition>([], 1);
    this._successfulTransitions = new Queue<Transition>([], 1);
    this.current = undefined;
    this.$current = undefined;
    this.transition = undefined;
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

  /**
   * Returns the singleton router globals instance.
   */
  $get = (): RouterProvider => this;
}
