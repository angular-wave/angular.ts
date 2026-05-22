import { isString } from "../../shared/utils.ts";
import type { StateObject } from "./state-object.ts";

/** @internal */
export function normalizeNgViewTarget(
  context: StateObject,
  rawViewName = "",
): { ngViewName: string; ngViewContextAnchor: string } {
  const viewAtContext = rawViewName.split("@");

  const [viewName, viewContextAnchor] = viewAtContext;

  let ngViewName = viewName || "$default";

  let ngViewContextAnchor = isString(viewContextAnchor)
    ? viewContextAnchor
    : "^";

  const relativeViewNameSugar = /^(\^(?:\.\^)*)\.(.*$)/.exec(ngViewName);

  if (relativeViewNameSugar) {
    [, ngViewContextAnchor, ngViewName] = relativeViewNameSugar;
  }

  if (ngViewName.startsWith("!")) {
    ngViewName = ngViewName.substring(1);
    ngViewContextAnchor = "";
  }

  const relativeMatch = /^(\^(?:\.\^)*)$/;

  if (relativeMatch.exec(ngViewContextAnchor)) {
    let anchorState: StateObject | null | undefined = context;

    let hops = 0;

    for (let i = 0; i < ngViewContextAnchor.length; i++) {
      if (ngViewContextAnchor[i] === "^") {
        hops++;
      }
    }

    for (let i = 0; i < hops; i++) {
      anchorState = anchorState?.parent;
    }

    if (!anchorState) {
      anchorState = context;

      while (anchorState.parent) anchorState = anchorState.parent;
    }

    ngViewContextAnchor = anchorState.name;
  } else if (ngViewContextAnchor === ".") {
    ngViewContextAnchor = context.name;
  }

  return { ngViewName, ngViewContextAnchor };
}
