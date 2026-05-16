import type { LazyAnimate } from "../../animations/lazy-animate.ts";
import {
  createDocumentFragment,
  emptyElement,
  removeElement,
} from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import {
  arrayFrom,
  isArray,
  isInstanceOf,
  stringify,
  assertDefined,
} from "../../shared/utils.ts";
import type { SwapModeType } from "./protocol.ts";

type SwapNodes = Array<Node | ChildNode>;

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
  /** Read-only normalized attribute access for directive defaults. */
  $attributes: ng.AttributesService;
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
  swap: SwapModeType,
  options?: RealtimeSwapOptions,
) => boolean;

/** Creates a per-directive realtime DOM swap handler. */
export function createRealtimeSwapHandler({
  $compile,
  $log,
  getAnimate,
  scope,
  $attributes,
  element,
  logPrefix,
}: RealtimeSwapContext): RealtimeSwapHandler {
  let content: ChildNode | ChildNode[] | undefined;

  return (
    html: string | object,
    swap: SwapModeType,
    options: RealtimeSwapOptions = {},
  ): boolean => {
    const animationEnabled = !!$attributes.read(element, "animate");

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
    }

    const targetSelector =
      options.targetSelector || $attributes.read(element, "target");

    const target: Element | null = targetSelector
      ? document.querySelector(targetSelector)
      : element;

    if (!target) {
      $log.warn(`${logPrefix}: target "${targetSelector}" not found`);

      return false;
    }

    const applySwap = (): boolean => {
      switch (swap) {
        case "outerHTML": {
          const parent = target.parentNode;

          if (!parent) return false;

          const frag = createDocumentFragment();

          nodes.forEach((x) => frag.appendChild(x));

          if (!animationEnabled) {
            parent.replaceChild(frag, target);
            break;
          }

          const placeholder = document.createElement("span");

          placeholder.style.display = "none";
          parent.insertBefore(placeholder, target.nextSibling);

          assertDefined(animate)
            .leave(target)
            .done(() => {
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
            });
          break;
        }

        case "textContent":
          if (animationEnabled) {
            assertDefined(animate)
              .leave(target)
              .done(() => {
                target.textContent = stringify(html);
                assertDefined(animate).enter(
                  target,
                  target.parentNode as Element,
                );
              });
          } else {
            target.textContent = stringify(html);
          }
          break;

        case "beforebegin": {
          const parent = target.parentNode;

          if (!parent) return false;

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

          if (!parent) return false;
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
            assertDefined(animate)
              .leave(target)
              .done(() => {
                removeElement(target);
              });
          } else {
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
              assertDefined(animate)
                .leave(content as Element)
                .done(() => {
                  content = nodes[0] as ChildNode;
                  assertDefined(animate).enter(nodes[0] as Element, target);
                });
            } else {
              content = nodes[0] as ChildNode;

              if (
                content &&
                !isArray(content) &&
                content.nodeType === NodeType._TEXT_NODE
              ) {
                emptyElement(target);
                target.replaceChildren(...nodes);
              } else {
                assertDefined(animate).enter(nodes[0] as Element, target);
              }
            }
          } else {
            emptyElement(target);
            target.replaceChildren(...nodes);
          }
          break;
      }

      return true;
    };

    if (
      shouldUseViewTransition(
        $attributes.read(element, "viewTransition"),
        target,
        animationEnabled,
      )
    ) {
      const documentWithTransitions = document as ViewTransitionDocument;

      documentWithTransitions.startViewTransition?.(() => {
        applySwap();
      });

      return true;
    }

    return applySwap();
  };
}

function shouldUseViewTransition(
  attrValue: string | undefined,
  target: Element,
  animationEnabled: boolean,
): boolean {
  if (animationEnabled) return false;

  const documentWithTransitions = document as ViewTransitionDocument;

  if (!documentWithTransitions.startViewTransition) return false;

  if (!target.isConnected) return false;

  const targetValue = target.getAttribute("data-view-transition");

  return (
    isTruthyTransitionFlag(attrValue) || isTruthyTransitionFlag(targetValue)
  );
}

function isTruthyTransitionFlag(value: unknown): boolean {
  return value === "" || value === true || value === "true";
}
