import { ViewDeclaration } from "../state/interface.ts";
import { PathNode } from "../path/path-node.js";

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
  config: ViewConfig;
  /** The state context in which the ng-view tag was created. */
  creationContext: ViewContext;
  /** A callback that should apply a ViewConfig (or clear the ng-view, if config is undefined) */
  configUpdated: (config: ViewConfig) => void;
}

/**
 * This interface represents a [[_ViewDeclaration]] that is bound to a [[PathNode]].
 *
 * A `ViewConfig` is the runtime definition of a single view.
 *
 * During a transition, `ViewConfig`s are created for each [[_ViewDeclaration]] defined on each "entering" [[StateObject]].
 * Then, the [[ViewService]] finds any matching `ng-view`(s) in the DOM, and supplies the ng-view
 * with the `ViewConfig`.  The `ng-view` then loads itself using the information found in the `ViewConfig`.
 *
 * A `ViewConfig` if matched with a `ng-view` by finding all `ng-view`s which were created in the
 * context named by the `ngVIewContextAnchor`, and finding the `ng-view` or child `ng-view` that matches
 * the `ngVIewName` address.
 */
export interface ViewConfig {
  /* The unique id for the ViewConfig instance */
  $id: number;
  /** The normalized view declaration from [[State.views]] */
  viewDecl: ViewDeclaration;

  /** The node the ViewConfig is bound to */
  path: PathNode[];

  loaded: boolean;

  /** Fetches templates, runs dynamic (controller|template)Provider code, lazy loads Components, etc */
  load(): Promise<ViewConfig>;
}

// A uiView and its matching viewConfig
export interface ViewTuple {
  ngView: ActiveUIView | undefined;
  viewConfig: ViewConfig;
}
