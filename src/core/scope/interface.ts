import type { CompiledExpression } from "../parse/interface.ts";

export type ListenerFn = (newValue?: any, originalTarget?: object) => void;

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
