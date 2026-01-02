/**
 * This class defines a type of hook, such as `onBefore` or `onEnter`.
 * Plugins can define custom hook types, such as sticky states does for `onInactive`.
 */
export class TransitionEventType {
  constructor(
    name: any,
    hookPhase: any,
    hookOrder: any,
    criteriaMatchPath: any,
    reverseSort?: boolean,
    getResultHandler?: (hook: any) => (result: any) => any,
    getErrorHandler?: () => (error: any) => Promise<never>,
    synchronous?: boolean,
  );
  name: any;
  hookPhase: any;
  hookOrder: any;
  criteriaMatchPath: any;
  reverseSort: boolean;
  getResultHandler: (hook: any) => (result: any) => any;
  getErrorHandler: () => (error: any) => Promise<never>;
  synchronous: boolean;
}
