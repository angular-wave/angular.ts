import { _injector, _parse } from '../../injection-tokens.js';
import { isDefined, stringify, callFunction, isFunction, deProxy, isUndefined, createErrorFactory } from '../../shared/utils.js';
import { SCE_CONTEXTS } from '../../services/sce/context.js';
import { getSecurityAdapter } from '../security/security-adapter.js';

function getWatchableContext(context) {
    return isFunction(context?.$watch)
        ? context
        : undefined;
}
const $interpolateError = createErrorFactory("$interpolate");
function throwNoconcat(text) {
    throw $interpolateError("noconcat", "Error while interpolating: {0}\nSecurity contexts disallow " +
        "interpolations that concatenate multiple expressions when a trusted value is " +
        "required.", text);
}
function interr(text, err) {
    throw $interpolateError("interr", "Can't interpolate: {0}\n{1}", text, err.toString());
}
class InterpolateProvider {
    constructor() {
        this.startSymbol = "{{";
        this.endSymbol = "}}";
        this.$get = [
            _injector,
            _parse,
            ($injector, $parse) => {
                const security = getSecurityAdapter($injector);
                const interpolationStartSymbol = this.startSymbol;
                const interpolationEndSymbol = this.endSymbol;
                const startSymbolLength = interpolationStartSymbol.length;
                const endSymbolLength = interpolationEndSymbol.length;
                const escapedStartRegexp = new RegExp(interpolationStartSymbol.replace(/./g, escape), "g");
                const escapedEndRegexp = new RegExp(interpolationEndSymbol.replace(/./g, escape), "g");
                function escape(ch) {
                    return `\\\\\\${ch}`;
                }
                function unescapeText(text) {
                    return text
                        .replace(escapedStartRegexp, interpolationStartSymbol)
                        .replace(escapedEndRegexp, interpolationEndSymbol);
                }
                const $interpolate = (text, mustHaveExpression, trustedContext, allOrNothing) => {
                    const contextAllowsConcatenation = trustedContext === SCE_CONTEXTS._URL ||
                        trustedContext === SCE_CONTEXTS._MEDIA_URL;
                    if (!text.length || !text.includes(interpolationStartSymbol)) {
                        if (mustHaveExpression) {
                            return undefined;
                        }
                        let unescapedText = unescapeText(text);
                        if (contextAllowsConcatenation) {
                            unescapedText = security.getTrusted(trustedContext, unescapedText);
                        }
                        const constantInterp = (() => unescapedText);
                        constantInterp.exp = text;
                        constantInterp.expressions = [];
                        return constantInterp;
                    }
                    allOrNothing = !!allOrNothing;
                    let startIndex;
                    let endIndex;
                    let index = 0;
                    const expressions = [];
                    const textLength = text.length;
                    const concat = [];
                    const expressionPositions = [];
                    while (index < textLength) {
                        startIndex = text.indexOf(interpolationStartSymbol, index);
                        endIndex =
                            startIndex === -1
                                ? -1
                                : text.indexOf(interpolationEndSymbol, startIndex + startSymbolLength);
                        if (startIndex !== -1 && endIndex !== -1) {
                            if (index !== startIndex) {
                                concat.push(unescapeText(text.substring(index, startIndex)));
                            }
                            const exp = text.substring(startIndex + startSymbolLength, endIndex);
                            expressions.push(exp);
                            index = endIndex + endSymbolLength;
                            expressionPositions.push(concat.length);
                            concat.push("");
                        }
                        else {
                            if (index !== textLength) {
                                concat.push(unescapeText(text.substring(index)));
                            }
                            break;
                        }
                    }
                    const singleExpression = concat.length === 1 && expressionPositions.length === 1;
                    const interceptor = contextAllowsConcatenation && singleExpression
                        ? undefined
                        : parseStringifyInterceptor;
                    if (!mustHaveExpression || expressions.length > 0) {
                        if (singleExpression) {
                            const expression = expressions[0];
                            const parseFn = $parse(expression);
                            const watchProp = expression.trim();
                            const compute = interceptor
                                ? (context) => {
                                    const value = parseFn(context);
                                    return parseStringifyInterceptor(deProxy(isFunction(value) ? value() : value));
                                }
                                : (context) => parseFn(context);
                            const fn = ((context, cb) => {
                                try {
                                    if (cb) {
                                        const watchable = getWatchableContext(context);
                                        if (watchable) {
                                            callFunction(watchable.$watch, watchable, watchProp, () => {
                                                cb(compute(context));
                                            });
                                        }
                                    }
                                    return compute(context);
                                }
                                catch (err) {
                                    return interr(text, err);
                                }
                            });
                            fn.exp = text;
                            fn.expressions = expressions;
                            return fn;
                        }
                        const parseFns = expressions.map((expression) => $parse(expression, interceptor));
                        const compute = (values) => {
                            for (let i = 0; i < expressions.length; i++) {
                                if (allOrNothing && isUndefined(values[i])) {
                                    return undefined;
                                }
                                concat[expressionPositions[i]] = values[i];
                            }
                            if (contextAllowsConcatenation) {
                                return security.getTrusted(trustedContext, singleExpression ? concat[0] : concat.join(""));
                            }
                            if (trustedContext && concat.length > 1) {
                                throwNoconcat(text);
                            }
                            return concat.join("");
                        };
                        const fn = ((context, cb) => {
                            const values = new Array(expressions.length);
                            try {
                                for (let i = 0; i < expressions.length; i++) {
                                    if (cb) {
                                        const watchProp = expressions[i].trim();
                                        const watchable = getWatchableContext(context);
                                        if (watchable) {
                                            callFunction(watchable.$watch, watchable, watchProp, () => {
                                                const watchedValues = new Array(expressions.length);
                                                for (let j = 0; j < expressions.length; j++) {
                                                    watchedValues[j] = parseFns[j](context);
                                                }
                                                cb(compute(watchedValues));
                                            });
                                        }
                                    }
                                    values[i] = parseFns[i](context);
                                }
                                return compute(values);
                            }
                            catch (err) {
                                return interr(text, err);
                            }
                        });
                        fn.exp = text;
                        fn.expressions = expressions;
                        return fn;
                    }
                    function parseStringifyInterceptor(value) {
                        try {
                            value =
                                trustedContext && !contextAllowsConcatenation
                                    ? security.getTrusted(trustedContext, value)
                                    : security.valueOf(value);
                            return allOrNothing && !isDefined(value)
                                ? value
                                : stringify(value);
                        }
                        catch (err) {
                            return interr(text, err);
                        }
                    }
                    return undefined;
                };
                $interpolate.startSymbol = () => interpolationStartSymbol;
                $interpolate.endSymbol = () => interpolationEndSymbol;
                return $interpolate;
            },
        ];
    }
}

export { InterpolateProvider };
