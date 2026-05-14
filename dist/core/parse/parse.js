import { _injector, _filter } from '../../injection-tokens.js';
import { isFunction, deProxy, nullObject } from '../../shared/utils.js';
import { validateRequired } from '../../shared/validate.js';
import { Lexer } from './lexer/lexer.js';
import { Parser } from './parser/parser.js';

const lexer = new Lexer();
class ParseProvider {
    constructor() {
        const cache = nullObject();
        this.$get = [
            _injector,
            ($injector) => createParseService($injector, cache),
        ];
    }
}
function createParseService($injector, cache) {
    const parser = new Parser(lexer, createLazyFilter($injector));
    return (exp, interceptorFn) => {
        const parsedExpression = getParsedExpression(parser, cache, normalizeExpression(exp));
        return addInterceptor(parsedExpression, interceptorFn);
    };
}
function createLazyFilter($injector) {
    let $filter;
    return (name) => {
        $filter ?? ($filter = $injector.get(_filter));
        return $filter(name);
    };
}
function normalizeExpression(exp) {
    validateRequired(exp, "exp");
    return exp.trim();
}
function getParsedExpression(parser, cache, cacheKey) {
    let parsedExpression = cache[cacheKey];
    if (!parsedExpression) {
        parsedExpression = parser._parse(cacheKey);
        cache[cacheKey] = parsedExpression;
    }
    return parsedExpression;
}
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

export { ParseProvider };
