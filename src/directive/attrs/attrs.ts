import { _sce } from "../../injection-tokens.ts";
import {
  BOOLEAN_ATTR,
  getNormalizedAttr,
  getNormalizedAttrName,
  setNormalizedAttr,
} from "../../shared/dom.ts";
import {
  directiveNormalize,
  entries,
  getNodeName,
  isNullOrUndefined,
  isString,
  createErrorFactory,
  stringify,
  trim,
} from "../../shared/utils.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";

export const REGEX_STRING_REGEXP = /^\/(.+)\/([a-z]*)$/;

const $compileError = createErrorFactory("$compile");

function sanitizeSrcset(
  $sce: ng.SceService,
  value: unknown,
  invokeType: string,
): unknown {
  if (!value) {
    return value;
  }

  if (!isString(value)) {
    throw $compileError(
      "srcset",
      'Can\'t pass trusted values to `{0}`: "{1}"',
      invokeType,
      stringify(value),
    );
  }

  let result = "";

  const trimmedSrcset = trim(value);

  const srcPattern =
    /(\s+\d+(?:\.\d+)?x\s*,|\s+\d+w\s*,|\s+[^\s,]+\s*,|\s+,|,\s+)/;

  const pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

  const rawUris = trimmedSrcset.split(pattern);

  const nbrUrisWith2parts = Math.floor(rawUris.length / 2);

  let i: number;

  for (i = 0; i < nbrUrisWith2parts; i++) {
    const innerIdx = i * 2;

    const uri = trim(rawUris[innerIdx]);

    result += uri.startsWith("unsafe:")
      ? uri
      : String($sce.getTrustedMediaUrl(uri));
    result += ` ${trim(rawUris[innerIdx + 1])}`;
  }

  const lastTuple = trim(rawUris[i * 2]).split(/\s/);

  const uri = trim(lastTuple[0]);

  result += uri.startsWith("unsafe:")
    ? uri
    : String($sce.getTrustedMediaUrl(uri));

  if (lastTuple.length === 2) {
    result += ` ${trim(lastTuple[1])}`;
  }

  return result;
}

export const ngAttributeAliasDirectives: Record<string, ng.DirectiveFactory> =
  {};

// boolean attrs are evaluated
BOOLEAN_ATTR.forEach((i) => {
  // binding to multiple is not supported
  if (i === "multiple") return;

  type BooleanAliasLinkFn = (
    scope: ng.Scope,
    element: Element,
    expression: string,
    modelExpression?: string,
  ) => void;

  /** Mirrors the watched scope expression into the underlying boolean attribute. */
  const defaultLinkFn: BooleanAliasLinkFn = (
    scope: ng.Scope,
    element: Element,
    expression: string,
  ): void => {
    scope.$watch(expression, (value) => {
      setNormalizedAttr(element, i, !!value);
    });
  };

  const normalized = directiveNormalize(`ng-${i}`);

  let linkFn = defaultLinkFn;

  if (i === "checked") {
    linkFn = function (
      scope: ng.Scope,
      element: Element,
      expression: string,
      modelExpression: string | undefined,
    ): void {
      // ensuring ngChecked doesn't interfere with ngModel when both are set on the same input
      if (modelExpression !== expression) {
        defaultLinkFn(scope, element, expression);
      }
    };
  }

  ngAttributeAliasDirectives[normalized] = function () {
    return {
      restrict: "A",
      priority: 100,
      compile(_element: Element) {
        const expression = getNormalizedAttr(_element, normalized) ?? "";
        const modelExpression = getNormalizedAttr(_element, "ngModel");

        return (scope: ng.Scope, element: Element): void => {
          linkFn(scope, element, expression, modelExpression);
        };
      },
    };
  };
});

// aliased input attrs are evaluated
entries(ALIASED_ATTR).forEach(([ngAttr]) => {
  ngAttributeAliasDirectives[ngAttr] = function (): ng.Directive {
    return {
      priority: 100,
      compile(_element: Element) {
        // special case ngPattern when a literal regular expression value
        // is used as the expression (this way we don't have to watch anything).
        const expression = getNormalizedAttr(_element, ngAttr) ?? "";

        if (ngAttr === "ngPattern" && expression.startsWith("/")) {
          const match = REGEX_STRING_REGEXP.exec(expression);

          if (match) {
            setNormalizedAttr(
              _element,
              "ngPattern",
              new RegExp(match[1], match[2]).toString(),
            );

            return;
          }
        }

        return (scope: ng.Scope, element: Element): void => {
          scope.$watch(expression, (value) => {
            setNormalizedAttr(
              element,
              ngAttr,
              value as string | boolean | null | undefined,
            );
          });
        };
      },
    };
  };
});

// ng-src, ng-srcset, ng-href are interpolated
["src", "srcset", "href"].forEach((attrName) => {
  const normalized = directiveNormalize(`ng-${attrName}`);

  ngAttributeAliasDirectives[normalized] = [
    _sce,
    /** Creates the alias directive for interpolated URL-like attributes. */
    function ($sce: ng.SceService): ng.Directive {
      return {
        priority: 99, // it needs to run after the attributes are interpolated
        compile(_element: Element) {
          const initialValue = getNormalizedAttr(_element, normalized);
          const originalAttrName = getNormalizedAttrName(_element, normalized);

          return (scope: ng.Scope, element: Element): void => {
            const nodeName = getNodeName(element);

            if (attrName === "srcset") {
              if (originalAttrName) {
                element.removeAttribute(originalAttrName);
              }
            }

            function sanitize(value: unknown): unknown {
              if (isNullOrUndefined(value)) {
                return value;
              }

              const stringValue = stringify(value);

              if (stringValue.startsWith("unsafe:")) {
                return stringValue;
              }

              if (
                attrName === "src" &&
                !["img", "video", "audio", "source", "track"].includes(nodeName)
              ) {
                return $sce.getTrustedResourceUrl(stringValue);
              }

              if (attrName === "href" && nodeName !== "image") {
                return $sce.getTrustedUrl(stringValue);
              }

              return $sce.getTrustedMediaUrl(stringValue);
            }

            function readAliasValue(): string | undefined {
              const value = getNormalizedAttr(element, normalized);

              return value?.includes("{{") ? undefined : value;
            }

            function syncAliasValue(value: string | undefined): void {
              if (!value) {
                if (attrName === "href") {
                  setNormalizedAttr(element, attrName, null);
                }

                return;
              }

              if (
                attrName === "srcset" &&
                /^\d+(?:\.\d+)?[xw](?:\s|$)/.test(trim(value))
              ) {
                return;
              }

              if (
                attrName === "href" ||
                (attrName === "src" &&
                  ["img", "video", "audio", "source", "track"].includes(
                    nodeName,
                  ))
              ) {
                setNormalizedAttr(element, attrName, sanitize(value) as string);
              } else if (attrName === "srcset") {
                setNormalizedAttr(
                  element,
                  attrName,
                  sanitizeSrcset($sce, value, "ng-srcset") as string,
                );
              } else {
                setNormalizedAttr(
                  element,
                  attrName,
                  value as string | boolean | null | undefined,
                );
              }
            }

            // We need to sanitize the url at least once, in case it is a constant
            // non-interpolated attribute.
            if (initialValue && !initialValue.includes("{{")) {
              setNormalizedAttr(
                element,
                attrName,
                attrName === "srcset"
                  ? (sanitizeSrcset($sce, initialValue, "ng-srcset") as string)
                  : (sanitize(initialValue) as string),
              );
            }

            let skipInitialInterpolation = Boolean(
              getNormalizedAttr(element, normalized)?.includes("{{"),
            );

            const syncObservedAliasValue = () => {
              const value = readAliasValue();

              if (skipInitialInterpolation) {
                skipInitialInterpolation = false;

                if (!value) return;
              }

              syncAliasValue(value);
            };

            syncObservedAliasValue();
            const observerName = directiveNormalize(normalized);
            const observer = new MutationObserver((mutations) => {
              for (let i = 0; i < mutations.length; i++) {
                const attributeName = mutations[i].attributeName;

                if (
                  attributeName &&
                  directiveNormalize(attributeName) === observerName
                ) {
                  syncObservedAliasValue();
                }
              }
            });
            observer.observe(element, { attributes: true });

            let deregisterDestroy: (() => void) | undefined = scope.$on(
              "$destroy",
              deregister,
            );

            function deregister(): void {
              observer.disconnect();
              deregisterDestroy?.();
              deregisterDestroy = undefined;
            }
          };
        },
      };
    },
  ];
});
