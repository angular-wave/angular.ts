import { _sce } from "../../injection-tokens.ts";
import { BOOLEAN_ATTR } from "../../shared/dom.ts";
import {
  directiveNormalize,
  entries,
  getNodeName,
  isNullOrUndefined,
  isString,
  createErrorFactory,
  trim,
} from "../../shared/utils.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

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
      String(value),
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

    result += uri.startsWith("unsafe:") ? uri : $sce.getTrustedMediaUrl(uri);
    result += ` ${trim(rawUris[innerIdx + 1])}`;
  }

  const lastTuple = trim(rawUris[i * 2]).split(/\s/);

  const uri = trim(lastTuple[0]);

  result += uri.startsWith("unsafe:") ? uri : $sce.getTrustedMediaUrl(uri);

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

  /** Mirrors the watched scope expression into the underlying boolean attribute. */
  function defaultLinkFn(
    scope: ng.Scope,
    _element: Element,
    attr: Attributes & Record<string, string>,
  ): void {
    scope.$watch(attr[normalized], (value) => {
      attr.$set(i, !!value);
    });
  }

  const normalized = directiveNormalize(`ng-${i}`);

  let linkFn = defaultLinkFn;

  if (i === "checked") {
    linkFn = function (
      scope: ng.Scope,
      element: Element,
      attr: Attributes & Record<string, string>,
    ): void {
      // ensuring ngChecked doesn't interfere with ngModel when both are set on the same input
      if (attr.ngModel !== attr[normalized]) {
        defaultLinkFn(scope, element, attr);
      }
    };
  }

  ngAttributeAliasDirectives[normalized] = function () {
    return {
      restrict: "A",
      priority: 100,
      link: linkFn,
    };
  };
});

// aliased input attrs are evaluated
entries(ALIASED_ATTR).forEach(([ngAttr]) => {
  ngAttributeAliasDirectives[ngAttr] = function (): ng.Directive {
    return {
      priority: 100,
      link(
        scope: ng.Scope,
        _element: Element,
        attr: Attributes & Record<string, string>,
      ): void {
        // special case ngPattern when a literal regular expression value
        // is used as the expression (this way we don't have to watch anything).
        if (ngAttr === "ngPattern" && attr.ngPattern.charAt(0) === "/") {
          const match = attr.ngPattern.match(REGEX_STRING_REGEXP);

          if (match) {
            attr.$set("ngPattern", new RegExp(match[1], match[2]).toString());

            return;
          }
        }

        scope.$watch(attr[ngAttr], (value) => {
          attr.$set(ngAttr, value);
        });
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
        link(
          _scope: ng.Scope,
          element: Element,
          attr: Attributes & Record<string, string>,
        ): void {
          const nodeName = getNodeName(element);

          if (attrName === "srcset") {
            const originalAttrName = attr.$attr[normalized];

            if (originalAttrName) {
              element.removeAttribute(originalAttrName);
            }
          }

          function sanitize(value: unknown): any {
            if (isNullOrUndefined(value)) {
              return value;
            }

            const stringValue = String(value);

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

          // We need to sanitize the url at least once, in case it is a constant
          // non-interpolated attribute.
          const initialValue = attr[normalized];

          if (initialValue && !String(initialValue).includes("{{")) {
            attr.$set(
              normalized,
              attrName === "srcset"
                ? (sanitizeSrcset($sce, initialValue, "ng-srcset") as string)
                : sanitize(initialValue),
            );
          }

          attr.$observe(normalized, (value) => {
            if (!value) {
              if (attrName === "href") {
                attr.$set(attrName, null);
              }

              return;
            }

            if (
              attrName === "href" ||
              (attrName === "src" &&
                ["img", "video", "audio", "source", "track"].includes(nodeName))
            ) {
              attr.$set(attrName, sanitize(value));
            } else if (attrName === "srcset") {
              attr.$set(
                attrName,
                sanitizeSrcset($sce, value, "ng-srcset") as string,
              );
            } else {
              attr.$set(attrName, value);
            }
          });
        },
      };
    },
  ];
});
