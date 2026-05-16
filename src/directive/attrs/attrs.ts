import { _attributes, _sce } from "../../injection-tokens.ts";
import { BOOLEAN_ATTR } from "../../shared/dom.ts";
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
import type { Attributes } from "../../interface.ts";
import type { InternalAttributesService } from "../../services/attributes/attributes.ts";

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
    $attributes: ng.AttributesService,
    scope: ng.Scope,
    element: Element,
    attr: Attributes & Record<string, string>,
  ): void {
    scope.$watch(attr[normalized], (value) => {
      $attributes.set(element, i, !!value);
    });
  }

  const normalized = directiveNormalize(`ng-${i}`);

  let linkFn = defaultLinkFn;

  if (i === "checked") {
    linkFn = function (
      $attributes: ng.AttributesService,
      scope: ng.Scope,
      element: Element,
      attr: Attributes & Record<string, string>,
    ): void {
      // ensuring ngChecked doesn't interfere with ngModel when both are set on the same input
      if (attr.ngModel !== attr[normalized]) {
        defaultLinkFn($attributes, scope, element, attr);
      }
    };
  }

  ngAttributeAliasDirectives[normalized] = [
    _attributes,
    function ($attributes: ng.AttributesService) {
      return {
        restrict: "A",
        priority: 100,
        link(
          scope: ng.Scope,
          element: Element,
          attr: Attributes & Record<string, string>,
        ): void {
          linkFn($attributes, scope, element, attr);
        },
      };
    },
  ];
});

// aliased input attrs are evaluated
entries(ALIASED_ATTR).forEach(([ngAttr]) => {
  ngAttributeAliasDirectives[ngAttr] = [
    _attributes,
    function ($attributes: ng.AttributesService): ng.Directive {
      return {
        priority: 100,
        link(
          scope: ng.Scope,
          element: Element,
          attr: Attributes & Record<string, string>,
        ): void {
          // special case ngPattern when a literal regular expression value
          // is used as the expression (this way we don't have to watch anything).
          const ngPattern = attr.ngPattern as string;

          if (ngAttr === "ngPattern" && ngPattern.startsWith("/")) {
            const match = REGEX_STRING_REGEXP.exec(ngPattern);

            if (match) {
              $attributes.set(
                element,
                "ngPattern",
                new RegExp(match[1], match[2]).toString(),
              );

              return;
            }
          }

          scope.$watch(attr[ngAttr], (value) => {
            $attributes.set(element, ngAttr, value);
          });
        },
      };
    },
  ];
});

// ng-src, ng-srcset, ng-href are interpolated
["src", "srcset", "href"].forEach((attrName) => {
  const normalized = directiveNormalize(`ng-${attrName}`);

  ngAttributeAliasDirectives[normalized] = [
    _sce,
    _attributes,
    /** Creates the alias directive for interpolated URL-like attributes. */
    function (
      $sce: ng.SceService,
      $attributes: ng.AttributesService,
    ): ng.Directive {
      return {
        priority: 99, // it needs to run after the attributes are interpolated
        link(
          scope: ng.Scope,
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
            const elementValue = $attributes.read(element, normalized);
            const attrValue = attr[normalized] as string | undefined;

            if (
              attrValue &&
              (isNullOrUndefined(elementValue) || elementValue.includes("{{"))
            ) {
              return attrValue;
            }

            const value = elementValue ?? attrValue;

            return value?.includes("{{") ? undefined : value;
          }

          function syncAliasValue(value: string | undefined): void {
            if (!value) {
              if (attrName === "href") {
                $attributes.set(element, attrName, null);
              }

              return;
            }

            if (
              attrName === "href" ||
              (attrName === "src" &&
                ["img", "video", "audio", "source", "track"].includes(nodeName))
            ) {
              $attributes.set(element, attrName, sanitize(value));
            } else if (attrName === "srcset") {
              $attributes.set(
                element,
                attrName,
                sanitizeSrcset($sce, value, "ng-srcset") as string,
              );
            } else {
              $attributes.set(element, attrName, value);
            }
          }

          // We need to sanitize the url at least once, in case it is a constant
          // non-interpolated attribute.
          const initialValue = attr[normalized];

          if (initialValue && !String(initialValue).includes("{{")) {
            $attributes.set(
              element,
              normalized,
              attrName === "srcset"
                ? (sanitizeSrcset($sce, initialValue, "ng-srcset") as string)
                : sanitize(initialValue),
            );
          }

          let skipInitialInterpolation = Boolean(
            ($attributes as InternalAttributesService)._isInterpolated(
              element,
              normalized,
            ) || $attributes.read(element, normalized)?.includes("{{"),
          );

          $attributes.observe(scope, element, normalized, () => {
            if (skipInitialInterpolation) {
              skipInitialInterpolation = false;

              return;
            }

            syncAliasValue(readAliasValue());
          });
        },
      };
    },
  ];
});
