import { TransitionHook } from "./transition-hook.ts";
import type { HookResult, PathType } from "./interface.ts";

type GetResultHandler = (hook: TransitionHook) => (result: HookResult) => any;

type GetErrorHandler = (hook?: {
  logError: (error: any) => any;
}) => (error: any) => any;

export class TransitionEventType {
  name: string;
  hookPhase: number;
  hookOrder: number;
  criteriaMatchPath: PathType;
  reverseSort: boolean;
  getResultHandler: GetResultHandler;
  getErrorHandler: GetErrorHandler;
  synchronous: boolean;

  constructor(
    name: string,
    hookPhase: number,
    hookOrder: number,
    criteriaMatchPath: PathType,
    reverseSort = false,
    getResultHandler: GetResultHandler = TransitionHook.HANDLE_RESULT,
    getErrorHandler: GetErrorHandler = TransitionHook.REJECT_ERROR,
    synchronous = false,
  ) {
    this.name = name;
    this.hookPhase = hookPhase;
    this.hookOrder = hookOrder;
    this.criteriaMatchPath = criteriaMatchPath;
    this.reverseSort = reverseSort;
    this.getResultHandler = getResultHandler;
    this.getErrorHandler = getErrorHandler;
    this.synchronous = synchronous;
  }
}
