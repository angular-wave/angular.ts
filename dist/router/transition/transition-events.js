import { makeEvent } from './hook-registry.js';
import { PATH_TYPES } from './path-types.js';
import { TransitionEventType } from './transition-event-type.js';
import { TransitionHookPhase, TransitionHook } from './transition-hook.js';

/** @internal */
function defineCoreTransitionEvents(transitionService) {
    const paths = PATH_TYPES;
    const NORMAL_SORT = false;
    const REVERSE_SORT = true;
    const SYNCHRONOUS = true;
    defineTransitionEvent(transitionService, "onCreate", TransitionHookPhase._CREATE, 0, paths.to, NORMAL_SORT, (hook, result) => {
        TransitionHook._logRejectedResult(hook, result);
    }, (hook, error) => TransitionHook._throwError(hook, error), SYNCHRONOUS);
    defineTransitionEvent(transitionService, "onBefore", TransitionHookPhase._BEFORE, 0, paths.to);
    defineTransitionEvent(transitionService, "onStart", TransitionHookPhase._RUN, 0, paths.to);
    defineTransitionEvent(transitionService, "onExit", TransitionHookPhase._RUN, 100, paths.exiting, REVERSE_SORT);
    defineTransitionEvent(transitionService, "onRetain", TransitionHookPhase._RUN, 200, paths.retained);
    defineTransitionEvent(transitionService, "onEnter", TransitionHookPhase._RUN, 300, paths.entering);
    defineTransitionEvent(transitionService, "onFinish", TransitionHookPhase._RUN, 400, paths.to);
    defineTransitionEvent(transitionService, "onSuccess", TransitionHookPhase._SUCCESS, 0, paths.to, NORMAL_SORT, (hook, result) => {
        TransitionHook._logRejectedResult(hook, result);
    }, (hook, error) => TransitionHook._logError(hook, error), SYNCHRONOUS);
    defineTransitionEvent(transitionService, "onError", TransitionHookPhase._ERROR, 0, paths.to, NORMAL_SORT, (hook, result) => {
        TransitionHook._logRejectedResult(hook, result);
    }, (hook, error) => TransitionHook._logError(hook, error), SYNCHRONOUS);
}
function defineTransitionEvent(transitionService, name, hookPhase, hookOrder, criteriaMatchPath, reverseSort = false, resultHandler = (hook, result) => TransitionHook._handleResult(hook, result), errorHandler = (hook, error) => TransitionHook._rejectError(hook, error), synchronous = false) {
    const eventType = new TransitionEventType(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort, resultHandler, errorHandler, synchronous);
    transitionService._eventTypes.push(eventType);
    makeEvent(transitionService, transitionService, eventType);
}

export { defineCoreTransitionEvents };
