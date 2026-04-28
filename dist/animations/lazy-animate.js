import { _animate } from '../injection-tokens.js';
import { hasAnimate } from '../shared/utils.js';

/**
 * Creates a resolver that instantiates `$animate` only when animation-aware code
 * actually needs it.
 */
function createLazyAnimate($injector) {
    let $animate;
    return () => ($animate || ($animate = $injector.get(_animate)));
}
/**
 * Returns `$animate` only for nodes that opt into animation handling.
 */
function getAnimateForNode(getAnimate, node) {
    return hasAnimate(node) ? getAnimate() : undefined;
}

export { createLazyAnimate, getAnimateForNode };
