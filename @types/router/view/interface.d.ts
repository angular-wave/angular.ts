import { ViewConfig } from "../state/views.js";
/** The context ref can be anything that has a `name` and a `parent` reference to another IContextRef */
export interface ViewContext {
  name: string;
  parent: ViewContext;
}
export interface ActiveUIView {
  /** An auto-incremented id */
  id: number;
  /** The ng-view short name */
  name: string;
  /** The ng-view's fully qualified name */
  fqn: string;
  /** The ViewConfig that is currently loaded into the ng-view */
  config: ViewConfig | null;
  /** The state context in which the ng-view tag was created. */
  creationContext: ViewContext;
  /** A callback that should apply a ViewConfig (or clear the ng-view, if config is undefined) */
  configUpdated: (config: ViewConfig) => void;
}
export interface ViewTuple {
  ngView: ActiveUIView | undefined;
  viewConfig: ViewConfig;
}
