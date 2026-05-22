import { isString } from '../../shared/utils.js';

/** @internal */
function normalizeNgViewTarget(context, rawViewName = "") {
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
        let anchorState = context;
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
            while (anchorState.parent)
                anchorState = anchorState.parent;
        }
        ngViewContextAnchor = anchorState.name;
    }
    else if (ngViewContextAnchor === ".") {
        ngViewContextAnchor = context.name;
    }
    return { ngViewName, ngViewContextAnchor };
}

export { normalizeNgViewTarget };
