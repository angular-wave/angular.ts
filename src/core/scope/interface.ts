import type { CompiledExpression } from "../parse/interface.ts";

export type ListenerFn = (newValue?: any, originalTarget?: object) => void;

export type NonScope = string[] | boolean;

export interface NonScopeMarked {
  $nonscope?: NonScope;
  [key: string]: any; // allow arbitrary properties
  constructor?: {
    $nonscope?: NonScope;
  };
}

export interface Listener {
  originalTarget: any;
  listenerFn: ListenerFn;
  watchFn: CompiledExpression;
  id: number; // Deregistration id
  scopeId: number; // The scope id that created the Listener
  property: string[];
  watchProp?: string; // The original property to watch if different from observed key
}

export interface ScopeEvent {
  /**
   * the scope on which the event was $emit-ed or $broadcast-ed.
   */
  targetScope: typeof Proxy<ng.Scope>;
  /**
   * the scope that is currently handling the event. Once the event propagates through the scope hierarchy, this property is set to null.
   */
  currentScope: typeof Proxy<ng.Scope> | null;
  /**
   * name of the event.
   */
  name: string;
  /**
   * calling stopPropagation function will cancel further event propagation (available only for events that were $emit-ed).
   */
  stopPropagation?(): void;
  /**
   * calling preventDefault sets defaultPrevented flag to true.
   */
  preventDefault(): void;
  /**
   * Whether propagation has been stopped
   */
  stopped: boolean;
  /**
   * true if preventDefault was called.
   */
  defaultPrevented: boolean;
}
