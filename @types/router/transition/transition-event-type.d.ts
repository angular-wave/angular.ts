import { TransitionHook } from "./transition-hook.ts";
import type { HookResult, PathType } from "./interface.ts";
type GetResultHandler = (hook: TransitionHook) => (result: HookResult) => any;
type GetErrorHandler = (hook?: {
  logError: (error: any) => any;
}) => (error: any) => any;
export declare class TransitionEventType {
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
    reverseSort?: boolean,
    getResultHandler?: GetResultHandler,
    getErrorHandler?: GetErrorHandler,
    synchronous?: boolean,
  );
}
export {};
