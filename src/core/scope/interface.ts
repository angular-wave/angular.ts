import type { CompiledExpression } from "../parse/interface.ts";

export type ListenerFn = (newValue?: any, originalTarget?: object) => void;

export type NonScope = string[] | boolean | undefined;

export interface Listener {
  originalTarget: any;
  listenerFn: ListenerFn;
  watchFn: CompiledExpression;
  id: number; // Deregistration id
  scopeId: number; // The scope id that created the Listener
  property: string[];
  watchProp?: string; // The original property to watch if different from observed key
  foreignListener?: ProxyConstructor;
}

export interface ScopeEvent {
  /**
   * the scope on which the event was $emit-ed or $broadcast-ed.
   */
  targetScope: ng.Scope;
  /**
   * the scope that is currently handling the event. Once the event propagates through the scope hierarchy, this property is set to null.
   */
  currentScope: ng.Scope;
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
   * true if preventDefault was called.
   */
  defaultPrevented: boolean;
}
