import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { ViewConfig } from "../state/views.ts";
import type { ActiveUIView, ViewContext, ViewTuple } from "./interface.ts";
export type { ViewConfig } from "../state/views.ts";
type ViewConfigFactory = (
  path: PathNode[],
  decl: ViewDeclaration,
) => ViewConfig;
export declare class ViewService {
  _ngViews: ActiveUIView[];
  _viewConfigs: ViewConfig[];
  _listeners: Array<(tuples: ViewTuple[]) => void>;
  _viewConfigFactory: ViewConfigFactory | undefined;
  _rootContext: StateObject | null | undefined;
  constructor();
  $get: () => ViewService;
  rootViewContext(context?: StateObject | null): StateObject | null | undefined;
  _createViewConfig(path: PathNode[], decl: ViewDeclaration): ViewConfig;
  deactivateViewConfig(viewConfig: ViewConfig): void;
  activateViewConfig(viewConfig: ViewConfig): void;
  sync(): void;
  registerUIView(ngView: ActiveUIView): () => void;
  available(): ViewConfig[];
  onSync(listener: (tuples: ViewTuple[]) => void): () => void;
  static normalizeUIViewTarget(
    context?: ViewContext | null,
    rawViewName?: string,
  ): string;
  static matches(
    ngViewsByFqn: Record<string, ActiveUIView>,
    uiView: ActiveUIView,
  ): (viewConfig: ViewConfig) => boolean;
}
