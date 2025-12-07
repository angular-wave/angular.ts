import type { CompiledExpression } from "../parse/interface.ts";
export type ListenerFn = (newValue?: any, originalTarget?: object) => void;
export interface Listener {
  originalTarget: any;
  listenerFn: ListenerFn;
  watchFn: CompiledExpression;
  id: number;
  scopeId: number;
  property: string[];
  watchProp?: string;
  foreignListener?: ProxyConstructor;
}
