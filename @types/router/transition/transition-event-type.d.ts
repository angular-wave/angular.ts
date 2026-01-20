/**
 * This class defines a type of hook, such as `onBefore` or `onEnter`.
 * Plugins can define custom hook types, such as sticky states does for `onInactive`.
 */
export class TransitionEventType {
  /**
   * @param {string} name
   * @param {number} hookPhase
   * @param {number} hookOrder
   * @param {any} criteriaMatchPath
   */
  constructor(
    name: string,
    hookPhase: number,
    hookOrder: number,
    criteriaMatchPath: any,
    reverseSort?: boolean,
    getResultHandler?: (
      hook: TransitionHook,
    ) => (result: import("./transition-hook.js").HookResult) => Promise<any>,
    getErrorHandler?: () => (error: any) => Promise<never>,
    synchronous?: boolean,
  );
  name: string;
  hookPhase: number;
  hookOrder: number;
  criteriaMatchPath: any;
  reverseSort: boolean;
  getResultHandler: (
    hook: TransitionHook,
  ) => (result: import("./transition-hook.js").HookResult) => Promise<any>;
  getErrorHandler: () => (error: any) => Promise<never>;
  synchronous: boolean;
}
import { TransitionHook } from "./transition-hook.js";
