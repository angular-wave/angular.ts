import { copy } from "../../shared/common.js";

/**
 * A [[TransitionHookFn]] which updates global ng-router state
 *
 * Registered using `transitionService.onBefore({}, updateGlobalState);`
 *
 * Before a [[Transition]] starts, updates the global value of "the current transition" ([[Globals.transition]]).
 * After a successful [[Transition]], updates the global values of "the current state"
 * ([[Globals.current]] and [[Globals.$current]]) and "the current param values" ([[Globals.params]]).
 *
 * See also the deprecated properties:
 * [[StateService.transition]], [[StateService.current]], [[StateService.params]]
 *
 * @param {import('../transition/transition.js').Transition} trans
 */
const updateGlobalState = (trans) => {
  const { _globals } = trans;

  const transitionSuccessful = () => {
    _globals._successfulTransitions.enqueue(trans);
    _globals._$current = trans.$to();
    _globals._current = _globals._$current.self;
    copy(trans.params(), _globals._params);
  };

  const clearCurrentTransition = () => {
    // Do not clear globals.transition if a different transition has started in the meantime
    if (_globals._transition === trans) _globals._transition = null;
  };

  trans.onSuccess({}, transitionSuccessful, { priority: 10000 });
  trans.promise.then(clearCurrentTransition, clearCurrentTransition);
};

export const registerUpdateGlobalState = (transitionService) =>
  transitionService.onCreate({}, updateGlobalState);
