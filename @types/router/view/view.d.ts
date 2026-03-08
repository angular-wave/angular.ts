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
/**
 * Tracks active `ui-view` instances and matches them with registered
 * view configs produced during state transitions.
 */
export declare class ViewService {
  _ngViews: ActiveUIView[];
  _viewConfigs: ViewConfig[];
  _listeners: Array<(tuples: ViewTuple[]) => void>;
  _viewConfigFactory: ViewConfigFactory | undefined;
  _rootContext: StateObject | null | undefined;
  /**
   * Creates an empty view registry ready to track active `ui-view` instances.
   */
  constructor();
  /**
   * Returns the singleton view service instance.
   */
  $get: () => ViewService;
  /**
   * Gets or sets the root view context used for relative `ui-view` targeting.
   */
  rootViewContext(context?: StateObject | null): StateObject | null | undefined;
  /**
   * Builds a view config for one view declaration along the specified path.
   */
  _createViewConfig(path: PathNode[], decl: ViewDeclaration): ViewConfig;
  /**
   * Removes a view config from the active registry.
   */
  deactivateViewConfig(viewConfig: ViewConfig): void;
  /**
   * Adds a view config to the active registry.
   */
  activateViewConfig(viewConfig: ViewConfig): void;
  /**
   * Re-matches active `ui-view` instances against currently registered view configs
   * and notifies both the views and registered listeners of the new assignments.
   */
  sync(): void;
  /**
   * Registers one active `ui-view` and returns a deregistration function.
   */
  registerUIView(ngView: ActiveUIView): () => void;
  /**
   * Returns the currently registered view configs.
   */
  available(): ViewConfig[];
  /**
   * Subscribes to view/config synchronization updates.
   */
  onSync(listener: (tuples: ViewTuple[]) => void): () => void;
  /**
   * Normalizes a relative `ui-view` target name into a fully-qualified target.
   */
  static normalizeUIViewTarget(
    context?: ViewContext | null,
    rawViewName?: string,
  ): string;
  /**
   * Builds a predicate that determines whether a view config matches
   * a specific active `ui-view`.
   */
  static matches(
    ngViewsByFqn: Record<string, ActiveUIView>,
    uiView: ActiveUIView,
  ): (viewConfig: ViewConfig) => boolean;
}
