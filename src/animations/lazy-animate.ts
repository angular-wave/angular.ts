import { _animate } from "../injection-tokens.ts";
import { hasAnimate } from "../shared/utils.ts";

export type LazyAnimate = () => ng.AnimateService;

/**
 * Creates a resolver that instantiates `$animate` only when animation-aware code
 * actually needs it.
 */
export function createLazyAnimate($injector: ng.InjectorService): LazyAnimate {
  let $animate: ng.AnimateService | undefined;

  return () => ($animate ||= $injector.get(_animate) as ng.AnimateService);
}

/**
 * Returns `$animate` only for nodes that opt into animation handling.
 */
export function getAnimateForNode(
  getAnimate: LazyAnimate,
  node: Node,
): ng.AnimateService | undefined {
  return hasAnimate(node) ? getAnimate() : undefined;
}
