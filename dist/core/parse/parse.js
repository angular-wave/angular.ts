import { _injector, _filter } from '../../injection-tokens.js';
import { nullObject, isFunction, deProxy } from '../../shared/utils.js';
import { validateRequired } from '../../shared/validate.js';
import { Lexer } from './lexer/lexer.js';
import { Parser } from './parser/parser.js';

const lexer = new Lexer();
class ParseProvider {
    constructor() {
        const cache = nullObject();
        this.$get = [
            _injector,
            ($injector) => {
                let $filter;
                const lazyFilter = (name) => {
                    $filter ?? ($filter = $injector.get(_filter));
                    return $filter(name);
                };
                const parser = new Parser(lexer, lazyFilter);
                const $parse = (exp, interceptorFn) => {
                    validateRequired(exp, "exp");
                    const cacheKey = exp.trim();
                    let parsedExpression = cache[cacheKey];
                    if (!parsedExpression) {
                        parsedExpression = parser._parse(cacheKey);
                        cache[cacheKey] = parsedExpression;
                    }
                    return addInterceptor(parsedExpression, interceptorFn);
                };
                return $parse;
            },
        ];
        function addInterceptor(parsedExpression, interceptorFn) {
            if (!interceptorFn) {
                return parsedExpression;
            }
            const fn = function interceptedExpression(scope, locals, assign) {
                if (scope?.getter) {
                    return undefined;
                }
                const value = parsedExpression(scope, locals, assign);
                const res = isFunction(value) ? value() : value;
                return interceptorFn(deProxy(res));
            };
            fn._interceptor = interceptorFn;
            fn._literal = parsedExpression._literal;
            fn._constant = parsedExpression._constant;
            fn._decoratedNode = parsedExpression._decoratedNode;
            return fn;
        }
    }
}

export { ParseProvider };
