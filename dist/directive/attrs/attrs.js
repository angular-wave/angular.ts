import { _sce } from '../../injection-tokens.js';
import { BOOLEAN_ATTR, getNormalizedAttr, setNormalizedAttr, getNormalizedAttrName } from '../../shared/dom.js';
import { directiveNormalize, entries, getNodeName, isString, stringify, trim, isNullOrUndefined, createErrorFactory } from '../../shared/utils.js';
import { ALIASED_ATTR } from '../../shared/constants.js';
import { isInternalAttributeInterpolated, observeInternalAttribute } from '../../services/attributes/attributes.js';

const REGEX_STRING_REGEXP = /^\/(.+)\/([a-z]*)$/;
const $compileError = createErrorFactory("$compile");
function sanitizeSrcset($sce, value, invokeType) {
    if (!value) {
        return value;
    }
    if (!isString(value)) {
        throw $compileError("srcset", 'Can\'t pass trusted values to `{0}`: "{1}"', invokeType, stringify(value));
    }
    let result = "";
    const trimmedSrcset = trim(value);
    const srcPattern = /(\s+\d+(?:\.\d+)?x\s*,|\s+\d+w\s*,|\s+[^\s,]+\s*,|\s+,|,\s+)/;
    const pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;
    const rawUris = trimmedSrcset.split(pattern);
    const nbrUrisWith2parts = Math.floor(rawUris.length / 2);
    let i;
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
const ngAttributeAliasDirectives = {};
// boolean attrs are evaluated
BOOLEAN_ATTR.forEach((i) => {
    // binding to multiple is not supported
    if (i === "multiple")
        return;
    /** Mirrors the watched scope expression into the underlying boolean attribute. */
    const defaultLinkFn = (scope, element, expression) => {
        scope.$watch(expression, (value) => {
            setNormalizedAttr(element, i, !!value);
        });
    };
    const normalized = directiveNormalize(`ng-${i}`);
    let linkFn = defaultLinkFn;
    if (i === "checked") {
        linkFn = function (scope, element, expression, modelExpression) {
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
            compile(_element) {
                const expression = getNormalizedAttr(_element, normalized) ?? "";
                const modelExpression = getNormalizedAttr(_element, "ngModel");
                return (scope, element) => {
                    linkFn(scope, element, expression, modelExpression);
                };
            },
        };
    };
});
// aliased input attrs are evaluated
entries(ALIASED_ATTR).forEach(([ngAttr]) => {
    ngAttributeAliasDirectives[ngAttr] = function () {
        return {
            priority: 100,
            compile(_element) {
                // special case ngPattern when a literal regular expression value
                // is used as the expression (this way we don't have to watch anything).
                const expression = getNormalizedAttr(_element, ngAttr) ?? "";
                if (ngAttr === "ngPattern" && expression.startsWith("/")) {
                    const match = REGEX_STRING_REGEXP.exec(expression);
                    if (match) {
                        setNormalizedAttr(_element, "ngPattern", new RegExp(match[1], match[2]).toString());
                        return;
                    }
                }
                return (scope, element) => {
                    scope.$watch(expression, (value) => {
                        setNormalizedAttr(element, ngAttr, value);
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
        function ($sce) {
            return {
                priority: 99, // it needs to run after the attributes are interpolated
                compile(_element) {
                    const initialValue = getNormalizedAttr(_element, normalized);
                    const originalAttrName = getNormalizedAttrName(_element, normalized);
                    return (scope, element) => {
                        const nodeName = getNodeName(element);
                        if (attrName === "srcset") {
                            if (originalAttrName) {
                                element.removeAttribute(originalAttrName);
                            }
                        }
                        function sanitize(value) {
                            if (isNullOrUndefined(value)) {
                                return value;
                            }
                            const stringValue = stringify(value);
                            if (stringValue.startsWith("unsafe:")) {
                                return stringValue;
                            }
                            if (attrName === "src" &&
                                !["img", "video", "audio", "source", "track"].includes(nodeName)) {
                                return $sce.getTrustedResourceUrl(stringValue);
                            }
                            if (attrName === "href" && nodeName !== "image") {
                                return $sce.getTrustedUrl(stringValue);
                            }
                            return $sce.getTrustedMediaUrl(stringValue);
                        }
                        function readAliasValue() {
                            const value = getNormalizedAttr(element, normalized);
                            return value?.includes("{{") ? undefined : value;
                        }
                        function syncAliasValue(value) {
                            if (!value) {
                                if (attrName === "href") {
                                    setNormalizedAttr(element, attrName, null);
                                }
                                return;
                            }
                            if (attrName === "srcset" &&
                                /^\d+(?:\.\d+)?[xw](?:\s|$)/.test(trim(value))) {
                                return;
                            }
                            if (attrName === "href" ||
                                (attrName === "src" &&
                                    ["img", "video", "audio", "source", "track"].includes(nodeName))) {
                                setNormalizedAttr(element, attrName, sanitize(value));
                            }
                            else if (attrName === "srcset") {
                                setNormalizedAttr(element, attrName, sanitizeSrcset($sce, value, "ng-srcset"));
                            }
                            else {
                                setNormalizedAttr(element, attrName, value);
                            }
                        }
                        // We need to sanitize the url at least once, in case it is a constant
                        // non-interpolated attribute.
                        if (initialValue && !initialValue.includes("{{")) {
                            setNormalizedAttr(element, attrName, attrName === "srcset"
                                ? sanitizeSrcset($sce, initialValue, "ng-srcset")
                                : sanitize(initialValue));
                        }
                        let skipInitialInterpolation = Boolean(isInternalAttributeInterpolated(element, normalized) ||
                            getNormalizedAttr(element, normalized)?.includes("{{"));
                        observeInternalAttribute(scope, element, normalized, () => {
                            const value = readAliasValue();
                            if (skipInitialInterpolation) {
                                skipInitialInterpolation = false;
                                if (!value)
                                    return;
                            }
                            syncAliasValue(value);
                        });
                    };
                },
            };
        },
    ];
});

export { REGEX_STRING_REGEXP, ngAttributeAliasDirectives };
