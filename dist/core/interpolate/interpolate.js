import { _parse } from '../../injection-tokens.js';
import { isDefined, deProxy, stringify, callFunction, isFunction, isUndefined, createErrorFactory } from '../../shared/utils.js';

function getWatchableContext(context) {
    return isFunction(context?.watch)
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
    throw $interpolateError("interr", "Can't interpolate: {0}\n{1}", text, String(err));
}
/** @internal */
function createInterpolateRuntimeState() {
    return {
        startSymbol: "{{",
        endSymbol: "}}",
        destroyed: false,
    };
}
/** @internal */
function applyInterpolateConfiguration(state, config) {
    ensureInterpolateRuntimeActive(state);
    if (config.startSymbol !== undefined) {
        state.startSymbol = config.startSymbol;
    }
    if (config.endSymbol !== undefined) {
        state.endSymbol = config.endSymbol;
    }
}
/** @internal */
function destroyInterpolateRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    state.startSymbol = "{{";
    state.endSymbol = "}}";
}
function ensureInterpolateRuntimeActive(state) {
    if (state.destroyed) {
        throw new Error("Interpolation runtime has already been disposed.");
    }
}
/** @internal */
function createInterpolateService(state, $parse, policies) {
    ensureInterpolateRuntimeActive(state);
    const interpolationStartSymbol = state.startSymbol;
    const interpolationEndSymbol = state.endSymbol;
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
        const contextAllowsConcatenation = trustedContext === "url" || trustedContext === "mediaUrl";
        if (!text.length || !text.includes(interpolationStartSymbol)) {
            if (mustHaveExpression) {
                return undefined;
            }
            let unescapedText = unescapeText(text);
            if (contextAllowsConcatenation) {
                unescapedText = policies._apply(trustedContext, unescapedText);
            }
            const constantInterp = (() => unescapedText);
            constantInterp.exp = text;
            constantInterp.expressions = [];
            if (trustedContext && !contextAllowsConcatenation)
                unescapedText = policies._apply(trustedContext, unescapedText);
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
                const [expression] = expressions;
                const parseFn = $parse(expression);
                const watchProp = expression.trim();
                const compute = interceptor
                    ? (context) => {
                        const value = parseFn(context);
                        return parseStringifyInterceptor(deProxy(isFunction(value) ? value() : value));
                    }
                    : (context) => {
                        const value = parseFn(context);
                        return allOrNothing && !isDefined(value)
                            ? value
                            : policies._apply(trustedContext, deProxy(isFunction(value) ? value() : value) ?? "");
                    };
                const fn = ((context, cb) => {
                    try {
                        if (cb) {
                            const watchable = getWatchableContext(context);
                            if (watchable) {
                                callFunction(watchable.watch, watchable, watchProp, () => {
                                    cb(compute(context));
                                }, false, true);
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
                    return policies._apply(trustedContext, concat.join(""));
                }
                if (trustedContext && concat.length > 1) {
                    throwNoconcat(text);
                }
                return trustedContext ? values[0] : concat.join("");
            };
            const fn = ((context, cb) => {
                const values = new Array(expressions.length);
                try {
                    for (let i = 0; i < expressions.length; i++) {
                        if (cb) {
                            const watchProp = expressions[i].trim();
                            const watchable = getWatchableContext(context);
                            if (watchable) {
                                callFunction(watchable.watch, watchable, watchProp, () => {
                                    const watchedValues = new Array(expressions.length);
                                    for (let j = 0; j < expressions.length; j++) {
                                        watchedValues[j] = parseFns[j](context);
                                    }
                                    cb(compute(watchedValues));
                                }, false, true);
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
                if (allOrNothing && !isDefined(value))
                    return value;
                value =
                    trustedContext && !contextAllowsConcatenation
                        ? policies._apply(trustedContext, value)
                        : deProxy(value);
                return allOrNothing && !isDefined(value)
                    ? value
                    : trustedContext && !contextAllowsConcatenation
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
}
/** @internal */
function createInterpolateRegistration(state, policies) {
    return [
        _parse,
        ($parse) => createInterpolateService(state, $parse, policies),
    ];
}

export { applyInterpolateConfiguration, createInterpolateRegistration, createInterpolateRuntimeState, createInterpolateService, destroyInterpolateRuntimeState };
