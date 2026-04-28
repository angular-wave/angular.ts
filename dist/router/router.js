import { Queue } from '../shared/queue.js';
import { StateParams } from './params/state-params.js';

/**
 * Mutable router state/config shared across state, URL, and transition services.
 *
 * @internal
 */
class _RouterProvider {
    /**
     * Creates the shared mutable router globals container.
     */
    constructor() {
        this._params = new StateParams();
        this._configuredRouting = false;
        this._lastStartedTransitionId = -1;
        this._transitionHistory = new Queue([], 1);
        this._successfulTransitions = new Queue([], 1);
        this._injector = undefined;
        this._current = undefined;
        this._currentState = undefined;
        this._transition = undefined;
    }
    /**
     * Marks that the app has configured URL-driven router behavior.
     */
    /** @internal */
    _markConfiguredRouting() {
        this._configuredRouting = true;
    }
    /**
     * Returns true when URL-driven router behavior has been configured.
     */
    /** @internal */
    _hasConfiguredRouting() {
        return this._configuredRouting;
    }
    /**
     * Returns the singleton router internals instance.
     */
    $get() {
        return this;
    }
}

export { _RouterProvider };
