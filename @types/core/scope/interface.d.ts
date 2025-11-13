import type { CompiledExpression } from "../parse/interface.ts";
import { Scope } from "./scope.js";
export interface AsyncQueueTask {
  handler: Scope;
  fn: (...args: any[]) => any;
  locals: Record<string, any>;
}
export type ListenerFn = (newValue?: any, originalTarget?: object) => void;
export interface Listener {
  originalTarget: object;
  listenerFn: ListenerFn;
  watchFn: CompiledExpression;
  id: number;
  scopeId: number;
  property: string[];
  watchProp?: string;
  foreignListener?: ProxyConstructor;
}
