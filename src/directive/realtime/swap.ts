import type { LazyAnimate } from "../../animations/lazy-animate.ts";
import {
  createDocumentFragment,
  emptyElement,
  getNormalizedAttr,
  removeElement,
} from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import {
  getCompiledFragmentRecord,
  replaceCompiledFragmentNodes,
  type CompiledFragmentRecord,
} from "../../core/compile/incremental-fragment.ts";
import {
  arrayFrom,
  isArray,
  isFunction,
  isInstanceOf,
  stringify,
  assertDefined,
} from "../../shared/utils.ts";
import type { SwapMode } from "./protocol.ts";

type SwapNodes = (Node | ChildNode)[];

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback?: () => void) => unknown;
};

/** Dependencies and per-element state used by realtime DOM swaps. */
export interface RealtimeSwapContext {
  /** Compiler used to link incoming HTML against the directive scope. */
  $compile: ng.CompileService;
  /** Logger used for missing target warnings. */
  $log: ng.LogService;
  /** Lazy `$animate` resolver so animation code is loaded only when needed. */
  getAnimate: LazyAnimate;
  /** Scope used when compiling incoming HTML. */
  scope: ng.Scope;
  /** Directive host element used when no target is configured. */
  element: Element;
  /** Prefix used in log messages. */
  logPrefix: string;
}

/** Per-message options that can override directive-level swap defaults. */
export interface RealtimeSwapOptions {
  /** CSS selector used for this single swap operation. */
  targetSelector?: string;
}

/** Applies a compiled realtime payload to the DOM with optional animation. */
export type RealtimeSwapHandler = (
  html: string | object,
  swap: SwapMode,
  options?: RealtimeSwapOptions,
) => boolean;

/** Creates a per-directive realtime DOM swap handler. */
export function createRealtimeSwapHandler({
  $compile,
  $log,
  getAnimate,
  scope,
  element,
  logPrefix,
}: RealtimeSwapContext): RealtimeSwapHandler {
  let content: ChildNode | ChildNode[] | undefined;
  let destroyed = false;
  const ownedFragments = new Set<CompiledFragmentRecord>();
  const activeAnimations = new Set<ng.AnimationHandle>();
  const placeholders = new Set<Node>();

  scope.$on("$destroy", () => {
    destroyed = true;
    activeAnimations.forEach((animation) => {
      animation.cancel();
    });
    activeAnimations.clear();
    placeholders.forEach((placeholder) => {
      placeholder.parentNode?.removeChild(placeholder);
    });
    placeholders.clear();
    disposeFragments(ownedFragments);
    content = undefined;
  });

  return (
    html: string | object,
    swap: SwapMode,
    options: RealtimeSwapOptions = {},
  ): boolean => {
    if (destroyed) return false;

    const animationEnabled = !!getNormalizedAttr(element, "animate");

    const animate = animationEnabled ? getAnimate() : undefined;

    let nodes: SwapNodes = [];

    if (!["textContent", "delete", "none"].includes(swap)) {
      if (!html) return false;

      const compiled = $compile(stringify(html))(scope) as
        | DocumentFragment
        | ChildNode;

      nodes = isInstanceOf(compiled, DocumentFragment)
        ? arrayFrom(compiled.childNodes)
        : [compiled];
      trackFragments(ownedFragments, nodes);
    }

    const targetSelector =
      options.targetSelector ??
      element.getAttribute("data-target") ??
      undefined;

    const target: Element | null = targetSelector
      ? document.querySelector(targetSelector)
      : element;

    if (!target) {
      disposeNodeFragments(nodes);
      $log.warn(`${logPrefix}: target "${String(targetSelector)}" not found`);

      return false;
    }

    const applySwap = (): boolean => {
      if (destroyed) {
        disposeNodeFragments(nodes);

        return false;
      }

      switch (swap) {
        case "outerHTML": {
          const parent = target.parentNode;

          if (!parent) {
            disposeNodeFragments(nodes);

            return false;
          }

          const frag = createDocumentFragment();

          nodes.forEach((x) => {
            frag.appendChild(x);
          });

          if (!animationEnabled) {
            parent.replaceChild(frag, target);
            disposeNodeFragment(target);
            disposeChildFragments(target);
            break;
          }

          const placeholder = document.createElement("span");
          const outgoingFragments = collectNodeTreeFragments(target);

          placeholder.style.display = "none";
          parent.insertBefore(placeholder, target.nextSibling);
          placeholders.add(placeholder);

          trackAnimation(assertDefined(animate).leave(target), (completed) => {
            if (!completed || destroyed) {
              placeholder.remove();
              placeholders.delete(placeholder);
              disposeNodeFragments(nodes);

              return;
            }

            disposeFragments(outgoingFragments);
            const insertedNodes = arrayFrom(frag.childNodes);

            for (const x of insertedNodes) {
              if (x.nodeType === NodeType._ELEMENT_NODE) {
                assertDefined(animate).enter(
                  x as Element,
                  parent as Element,
                  placeholder,
                );
              } else {
                parent.insertBefore(x, placeholder);
              }
            }

            content = insertedNodes;
            placeholder.remove();
            placeholders.delete(placeholder);
          });
          break;
        }

        case "textContent":
          if (animationEnabled) {
            const parent = target.parentNode;

            if (!parent) return false;

            const placeholder = document.createComment("ng-text-swap");
            const outgoingFragments = collectChildFragments(target);

            parent.insertBefore(placeholder, target);
            placeholders.add(placeholder);

            trackAnimation(
              assertDefined(animate).leave(target),
              (completed) => {
                if (!completed || destroyed) {
                  placeholder.remove();
                  placeholders.delete(placeholder);

                  return;
                }

                disposeFragments(outgoingFragments);
                target.textContent = stringify(html);
                trackAnimation(
                  assertDefined(animate).enter(target, parent, placeholder),
                  () => {
                    placeholder.remove();
                    placeholders.delete(placeholder);
                  },
                );
              },
            );
          } else {
            disposeChildFragments(target);
            target.textContent = stringify(html);
          }
          break;

        case "beforebegin": {
          const parent = target.parentNode;

          if (!parent) {
            disposeNodeFragments(nodes);

            return false;
          }

          nodes.forEach((node) => {
            if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
              assertDefined(animate).enter(
                node as Element,
                parent as Element,
                target,
              );
            } else {
              parent.insertBefore(node, target);
            }
          });
          break;
        }

        case "afterbegin": {
          const { firstChild } = target;

          [...nodes].reverse().forEach((node) => {
            if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
              assertDefined(animate).enter(
                node as Element,
                target,
                firstChild as Element,
              );
            } else {
              target.insertBefore(node, firstChild);
            }
          });
          break;
        }

        case "beforeend": {
          nodes.forEach((node) => {
            if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
              assertDefined(animate).enter(node as Element, target);
            } else {
              target.appendChild(node);
            }
          });
          break;
        }

        case "afterend": {
          const parent = target.parentNode;

          if (!parent) {
            disposeNodeFragments(nodes);

            return false;
          }
          const { nextSibling } = target;

          [...nodes].reverse().forEach((node) => {
            if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
              assertDefined(animate).enter(
                node as Element,
                parent as Element,
                nextSibling as Element,
              );
            } else {
              parent.insertBefore(node, nextSibling);
            }
          });
          break;
        }

        case "delete":
          if (animationEnabled) {
            const outgoingFragments = collectNodeTreeFragments(target);

            trackAnimation(
              assertDefined(animate).leave(target),
              (completed) => {
                if (!completed || destroyed) return;

                disposeFragments(outgoingFragments);
              },
            );
          } else {
            disposeNodeFragment(target);
            disposeChildFragments(target);
            removeElement(target);
          }
          break;

        case "none":
          break;

        case "innerHTML":
        default:
          if (animationEnabled) {
            if (
              content &&
              !isArray(content) &&
              content.nodeType !== NodeType._TEXT_NODE
            ) {
              const outgoingFragments = collectNodeTreeFragments(content);

              trackAnimation(
                assertDefined(animate).leave(content as Element),
                (completed) => {
                  if (!completed || destroyed) {
                    disposeNodeFragments(nodes);

                    return;
                  }

                  disposeFragments(outgoingFragments);
                  content = nodes[0] as ChildNode;
                  assertDefined(animate).enter(nodes[0] as Element, target);
                },
              );
            } else {
              content = nodes[0] as ChildNode | undefined;

              if (content?.nodeType === NodeType._TEXT_NODE) {
                emptyElement(target);
                target.replaceChildren(...nodes);
              } else {
                assertDefined(animate).enter(nodes[0] as Element, target);
              }
            }
          } else {
            const replacementFragment = getSingleCompiledFragment(nodes);

            if (replacementFragment) {
              replaceCompiledFragmentNodes(target, replacementFragment);
              ownedFragments.add(replacementFragment);
            } else {
              disposeChildFragments(target);
              emptyElement(target);
              target.replaceChildren(...nodes);
              trackFragments(ownedFragments, nodes);
            }
          }
          break;
      }

      return true;
    };

    if (
      shouldUseViewTransition(
        getNormalizedAttr(element, "viewTransition"),
        target,
        animationEnabled,
      )
    ) {
      const documentWithTransitions = document as ViewTransitionDocument;

      documentWithTransitions.startViewTransition(() => {
        applySwap();
      });

      return true;
    }

    return applySwap();
  };

  function trackAnimation(
    animation: ng.AnimationHandle,
    complete: (completed: boolean) => void,
  ): void {
    activeAnimations.add(animation);
    animation.done((completed) => {
      activeAnimations.delete(animation);
      complete(completed);
    });
  }
}

function getSingleCompiledFragment(
  nodes: readonly Node[],
): CompiledFragmentRecord | undefined {
  let fragment: CompiledFragmentRecord | undefined;

  for (const node of nodes) {
    const nodeFragment = getCompiledFragmentRecord(node);

    if (!nodeFragment) {
      return undefined;
    }

    fragment ??= nodeFragment;

    if (fragment !== nodeFragment) {
      return undefined;
    }
  }

  return fragment;
}

function trackFragments(
  fragments: Set<CompiledFragmentRecord>,
  nodes: readonly Node[],
): void {
  for (const node of nodes) {
    const fragment = getCompiledFragmentRecord(node);

    if (fragment && !fragment.disposed) {
      fragments.add(fragment);
    }
  }
}

function disposeFragments(fragments: Set<CompiledFragmentRecord>): void {
  const current = Array.from(fragments);

  fragments.clear();

  for (const fragment of current) {
    fragment.dispose();
  }
}

function disposeNodeFragment(node: Node): void {
  const fragment = getCompiledFragmentRecord(node);

  if (fragment && !fragment.disposed) {
    fragment.dispose();
  }
}

function disposeNodeFragments(nodes: readonly Node[]): void {
  const fragments = new Set<CompiledFragmentRecord>();

  trackFragments(fragments, nodes);
  disposeFragments(fragments);
}

function disposeChildFragments(target: Element): void {
  disposeFragments(collectChildFragments(target));
}

function collectNodeTreeFragments(node: Node): Set<CompiledFragmentRecord> {
  const fragments = new Set<CompiledFragmentRecord>();
  const fragment = getCompiledFragmentRecord(node);

  if (fragment && !fragment.disposed) {
    fragments.add(fragment);
  }

  if (node instanceof Element) {
    trackFragments(fragments, Array.from(node.childNodes));
  }

  return fragments;
}

function collectChildFragments(target: Element): Set<CompiledFragmentRecord> {
  const fragments = new Set<CompiledFragmentRecord>();

  trackFragments(fragments, Array.from(target.childNodes));

  return fragments;
}

function shouldUseViewTransition(
  attrValue: string | undefined,
  target: Element,
  animationEnabled: boolean,
): boolean {
  if (animationEnabled) return false;

  const documentWithTransitions = document as ViewTransitionDocument;

  const startViewTransition = Reflect.get(
    documentWithTransitions,
    "startViewTransition",
  );

  if (!isFunction(startViewTransition)) return false;

  if (!target.isConnected) return false;

  const targetValue = target.getAttribute("data-view-transition");

  return (
    isTruthyTransitionFlag(attrValue) || isTruthyTransitionFlag(targetValue)
  );
}

function isTruthyTransitionFlag(value: unknown): boolean {
  return value === "" || value === true || value === "true";
}
