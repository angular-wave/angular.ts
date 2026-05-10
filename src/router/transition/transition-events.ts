import { makeEvent } from "./hook-registry.ts";
import { PATH_TYPES, type PathType } from "./path-types.ts";
import {
  TransitionEventType,
  type TransitionErrorHandler,
  type TransitionResultHandler,
} from "./transition-event-type.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import type { TransitionService } from "./transition-service.ts";

/** @internal */
export function defineCoreTransitionEvents(
  transitionService: TransitionService,
): void {
  const TH = TransitionHook;

  const paths = PATH_TYPES;

  const NORMAL_SORT = false;

  const REVERSE_SORT = true;

  const SYNCHRONOUS = true;

  defineTransitionEvent(
    transitionService,
    "onCreate",
    TransitionHookPhase._CREATE,
    0,
    paths.to,
    NORMAL_SORT,
    TH._logRejectedResult,
    TH._throwError,
    SYNCHRONOUS,
  );
  defineTransitionEvent(
    transitionService,
    "onBefore",
    TransitionHookPhase._BEFORE,
    0,
    paths.to,
  );
  defineTransitionEvent(
    transitionService,
    "onStart",
    TransitionHookPhase._RUN,
    0,
    paths.to,
  );
  defineTransitionEvent(
    transitionService,
    "onExit",
    TransitionHookPhase._RUN,
    100,
    paths.exiting,
    REVERSE_SORT,
  );
  defineTransitionEvent(
    transitionService,
    "onRetain",
    TransitionHookPhase._RUN,
    200,
    paths.retained,
  );
  defineTransitionEvent(
    transitionService,
    "onEnter",
    TransitionHookPhase._RUN,
    300,
    paths.entering,
  );
  defineTransitionEvent(
    transitionService,
    "onFinish",
    TransitionHookPhase._RUN,
    400,
    paths.to,
  );
  defineTransitionEvent(
    transitionService,
    "onSuccess",
    TransitionHookPhase._SUCCESS,
    0,
    paths.to,
    NORMAL_SORT,
    TH._logRejectedResult,
    TH._logError,
    SYNCHRONOUS,
  );
  defineTransitionEvent(
    transitionService,
    "onError",
    TransitionHookPhase._ERROR,
    0,
    paths.to,
    NORMAL_SORT,
    TH._logRejectedResult,
    TH._logError,
    SYNCHRONOUS,
  );
}

function defineTransitionEvent(
  transitionService: TransitionService,
  name: string,
  hookPhase: TransitionHookPhase,
  hookOrder: number,
  criteriaMatchPath: PathType,
  reverseSort = false,
  resultHandler: TransitionResultHandler = TransitionHook._handleResult,
  errorHandler: TransitionErrorHandler = TransitionHook._rejectError,
  synchronous = false,
): void {
  const eventType = new TransitionEventType(
    name,
    hookPhase,
    hookOrder,
    criteriaMatchPath,
    reverseSort,
    resultHandler,
    errorHandler,
    synchronous,
  );

  transitionService._eventTypes.push(eventType);
  makeEvent(transitionService, transitionService, eventType);
}
