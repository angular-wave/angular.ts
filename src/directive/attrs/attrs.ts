import { BOOLEAN_ATTR } from "../../shared/dom.ts";
import { directiveNormalize, entries } from "../../shared/utils.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";
import { $injectTokens } from "../../injection-tokens.ts";

export const REGEX_STRING_REGEXP = /^\/(.+)\/([a-z]*)$/;

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
    attr: import("../../core/compile/attributes.ts").Attributes &
      Record<string, string>,
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
      attr: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
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
        element: Element,
        attr: import("../../core/compile/attributes.ts").Attributes &
          Record<string, string>,
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
    $injectTokens._sce,
    /** Creates the alias directive for interpolated URL-like attributes. */
    function ($sce: ng.SceService): ng.Directive {
      return {
        priority: 99, // it needs to run after the attributes are interpolated
        link(
          _scope: ng.Scope,
          element: Element,
          attr: import("../../core/compile/attributes.ts").Attributes &
            Record<string, string>,
        ): void {
          let name = attrName;

          if (
            attrName === "href" &&
            toString.call((element as Element & { href?: unknown }).href) ===
              "[object SVGAnimatedString]"
          ) {
            name = "xlinkHref";
            attr.$attr[name] = "href";
          }

          // We need to sanitize the url at least once, in case it is a constant
          // non-interpolated attribute.
          attr.$set(normalized, $sce.getTrustedMediaUrl(attr[normalized]));

          attr.$observe<string>(normalized, (value) => {
            if (!value) {
              if (attrName === "href") {
                attr.$set(name, null);
              }

              return;
            }

            attr.$set(name, value);
          });
        },
      };
    },
  ];
});
