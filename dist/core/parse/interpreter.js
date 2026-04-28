import { isNullOrUndefined, isProxy, isFunction, deProxy, isDefined, isObject } from '../../shared/utils.js';
import { ASTType } from './ast-type.js';

const PURITY_ABSOLUTE = 1;
const PURITY_RELATIVE = 2;
function appendWatchNodes(target, watchList) {
    if (!watchList)
        return;
    for (let i = 0, l = watchList.length; i < l; i++) {
        target.push(watchList[i]);
    }
}
class ASTInterpreter {
    /**
     * @param {ng.FilterService} $filter
     */
    constructor($filter) {
        this._$filter = $filter;
    }
    /**
     * Compiles the AST into a function.
     * @param {ASTNode} ast - The AST to compile.
     * @returns {CompiledExpression}
     */
    /** @internal */
    _compile(ast) {
        const decoratedNode = findConstantAndWatchExpressions(ast, this._$filter);
        const { _body: body } = decoratedNode;
        const assignable = assignableAST(decoratedNode);
        let assign;
        if (assignable) {
            assign = this._recurse(assignable);
        }
        const toWatch = getInputs(body);
        let inputs;
        if (toWatch) {
            inputs = [];
            for (let i = 0, l = toWatch.length; i < l; i++) {
                const watch = toWatch[i];
                const input = this._recurse(watch);
                watch._input = input;
                inputs.push(input);
                watch._watchId = `${i}`;
            }
        }
        const expressions = [];
        for (let i = 0, l = body.length; i < l; i++) {
            const expression = body[i];
            expressions.push(this._recurse(expression._expression));
        }
        const fnRaw = body.length === 0
            ? () => {
                /* empty */
            }
            : body.length === 1
                ? expressions[0]
                : function (scope, locals) {
                    let lastValue;
                    for (let i = 0; i < expressions.length; i++) {
                        lastValue = expressions[i](scope, locals);
                    }
                    return lastValue;
                };
        const fn = fnRaw;
        if (assign) {
            fn._assign = (scope, value, locals) => assign(scope, locals, value);
        }
        if (inputs) {
            fn._inputs = inputs;
        }
        fn._decoratedNode = decoratedNode;
        return fn;
    }
    /**
     * Recurses the AST nodes.
     * @param {ExpressionNode & LiteralNode} ast - The AST node.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - The create flag.
     * @returns {CompiledExpressionFunction} The recursive function.
     */
    /** @internal */
    _recurse(ast, context, create) {
        if (!context && !create) {
            const path = getNonComputedPath(ast);
            if (path) {
                return this._path(path);
            }
        }
        let left;
        let right;
        const self = this;
        let args;
        switch (ast._type) {
            case ASTType._Literal:
                return this._value(ast._value, context);
            case ASTType._UnaryExpression:
                right = this._recurse(ast._argument);
                return self[`unary${ast._operator}`](right, context);
            case ASTType._BinaryExpression:
                if (!context) {
                    const binaryPath = getPathBinary(ast);
                    if (binaryPath) {
                        return binaryPath;
                    }
                }
                left = this._recurse(ast._left);
                right = this._recurse(ast._right);
                return self[`binary${ast._operator}`](left, right, context);
            case ASTType._LogicalExpression:
                left = this._recurse(ast._left);
                right = this._recurse(ast._right);
                return self[`binary${ast._operator}`](left, right, context);
            case ASTType._ConditionalExpression:
                return this["ternary?:"](this._recurse(ast._test), this._recurse(ast._alternate), this._recurse(ast._consequent), context);
            case ASTType._Identifier:
                return self._identifier(ast._name, context, create);
            case ASTType._MemberExpression:
                left = this._recurse(ast._object, false, !!create);
                if (!ast._computed) {
                    right = ast._property._name;
                }
                if (ast._computed) {
                    right = this._recurse(ast._property);
                }
                return ast._computed
                    ? this._computedMember(left, right, context, create)
                    : this._nonComputedMember(left, right, context, create);
            case ASTType._CallExpression:
                args = [];
                const callArguments = ast._arguments;
                for (let i = 0, l = callArguments.length; i < l; i++) {
                    const expr = callArguments[i];
                    args.push(self._recurse(expr));
                }
                if (ast._filter)
                    right = this._$filter(ast._callee._name);
                if (!ast._filter) {
                    right = this._recurse(ast._callee, true);
                }
                if (!ast._filter && args.length <= 1) {
                    const arg = args[0];
                    return args.length
                        ? (scope, locals, assign) => {
                            const runtimeScope = scope;
                            const rhs = right(runtimeScope?.$target ? runtimeScope.$target : scope, locals, assign);
                            let value;
                            if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
                                const res = arg(scope, locals, assign);
                                value = rhs.value.call(rhs.context, isFunction(res) ? res() : res);
                            }
                            return context ? { value } : value;
                        }
                        : (scope, locals, assign) => {
                            const runtimeScope = scope;
                            const rhs = right(runtimeScope?.$target ? runtimeScope.$target : scope, locals, assign);
                            const value = !isNullOrUndefined(rhs.value) && isFunction(rhs.value)
                                ? rhs.value.call(rhs.context)
                                : undefined;
                            return context ? { value } : value;
                        };
                }
                return ast._filter
                    ? (scope, locals, assign) => {
                        const values = [];
                        for (let i = 0; i < args.length; ++i) {
                            const res = args[i](scope && deProxy(scope), locals, assign);
                            values.push(res);
                        }
                        const value = () => {
                            return right.apply(undefined, values);
                        };
                        return context
                            ? { context: undefined, name: undefined, value }
                            : value();
                    }
                    : (scope, locals, assign) => {
                        const runtimeScope = scope;
                        const rhs = right(runtimeScope?.$target ? runtimeScope.$target : scope, locals, assign);
                        let value;
                        if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
                            const values = [];
                            for (let i = 0; i < args.length; ++i) {
                                const res = args[i](scope, locals, assign);
                                values.push(isFunction(res) ? res() : res);
                            }
                            value = rhs.value.apply(rhs.context, values);
                        }
                        return context ? { value } : value;
                    };
            case ASTType._AssignmentExpression:
                left = this._recurse(ast._left, true, 1);
                right = this._recurse(ast._right);
                return (scope, locals, assign) => {
                    const lhs = left(scope, locals, assign);
                    const rhs = right(scope, locals, assign);
                    // lhs.context[lhs.name] = rhs;
                    const ctx = isProxy(lhs.context)
                        ? lhs.context
                        : (lhs.context.$proxy ?? lhs.context);
                    ctx[lhs.name] = rhs;
                    return context ? { value: rhs } : rhs;
                };
            case ASTType._ArrayExpression:
                args = [];
                const elements = ast._elements || [];
                for (let i = 0, l = elements.length; i < l; i++) {
                    const expr = elements[i];
                    args.push(self._recurse(expr));
                }
                return (scope, locals, assign) => {
                    const value = [];
                    for (let i = 0; i < args.length; ++i) {
                        value.push(args[i](scope, locals, assign));
                    }
                    return context ? { value } : value;
                };
            case ASTType._ObjectExpression:
                args = [];
                const properties = (ast._properties ||
                    []);
                if (!context && properties.length === 1 && !properties[0]._computed) {
                    const property = properties[0];
                    const key = property._key._type === ASTType._Identifier
                        ? property._key._name
                        : `${property._key._value}`;
                    const value = self._recurse(property._value);
                    return (scope, locals, assign) => {
                        const object = {};
                        object[key] = value(scope, locals, assign);
                        return object;
                    };
                }
                for (let i = 0, l = properties.length; i < l; i++) {
                    const property = properties[i];
                    if (property._computed) {
                        args.push({
                            key: self._recurse(property._key),
                            computed: true,
                            value: self._recurse(property._value),
                        });
                    }
                    else {
                        args.push({
                            key: property._key._type === ASTType._Identifier
                                ? property._key._name
                                : `${property._key._value}`,
                            computed: false,
                            value: self._recurse(property._value),
                        });
                    }
                }
                return (scope, locals, assign) => {
                    const value = {};
                    for (let i = 0; i < args.length; ++i) {
                        const property = args[i];
                        if (property.computed) {
                            value[property.key(scope, locals, assign)] = property.value(scope, locals, assign);
                        }
                        else {
                            value[property.key] = property.value(scope, locals, assign);
                        }
                    }
                    return context ? { value } : value;
                };
            case ASTType._ThisExpression:
                return (scope) => (context ? { value: scope } : scope?.$proxy);
            case ASTType._LocalsExpression:
                return (scope, locals) => (context ? { value: locals } : locals);
            case ASTType._NGValueParameter:
                return (scope, locals, assign) => context ? { value: assign } : assign;
            case ASTType._UpdateExpression: {
                // Must be assignable: Identifier or MemberExpression
                // Reuse the "context mode" lvalue resolver that returns { context, name, value }
                const ref = this._recurse(ast._argument, true, 1);
                const op = ast._operator;
                const prefix = !!ast._prefix;
                return (scope, locals, assign) => {
                    const lhs = ref(scope, locals, assign);
                    // No place to assign -> behave like JS (throw) rather than silently no-op
                    if (!lhs || isNullOrUndefined(lhs.context)) {
                        throw new Error(`${op} operand is not assignable (context is ${lhs?.context})`);
                    }
                    // JS-style numeric coercion
                    const oldNum = Number(lhs.value);
                    const newNum = op === "++" ? oldNum + 1 : oldNum - 1;
                    // Write back (same proxy handling as AssignmentExpression)
                    const ctx = isProxy(lhs.context)
                        ? lhs.context
                        : (lhs.context.$proxy ?? lhs.context);
                    ctx[lhs.name] = newNum;
                    const out = prefix ? newNum : oldNum;
                    return context ? { value: out } : out;
                };
            }
        }
        throw new Error(`Unknown AST type ${ast._type}`);
    }
    /**
     * Unary plus operation.
     * @param {function} argument - The argument function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The unary plus function.
     */
    "unary+"(argument, context) {
        return (scope, locals, assign) => {
            let arg = argument(scope, locals, assign);
            if (isDefined(arg)) {
                arg = +arg;
            }
            else {
                arg = 0;
            }
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Unary minus operation.
     * @param {function} argument - The argument function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The unary minus function.
     */
    "unary-"(argument, context) {
        return (scope, locals, assign) => {
            let arg = argument(scope, locals, assign);
            if (isDefined(arg)) {
                arg = -arg;
            }
            else {
                arg = -0;
            }
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Unary negation operation.
     * @param {function} argument - The argument function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The unary negation function.
     */
    "unary!"(argument, context) {
        return (scope, locals, assign) => {
            const arg = !argument(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary plus operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary plus function.
     */
    "binary+"(left, right, context) {
        return (scope, locals, assign) => {
            const lhs = left(scope, locals, assign);
            const rhs = right(scope, locals, assign);
            const arg = plusFn(lhs, rhs);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary minus operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary minus function.
     */
    "binary-"(left, right, context) {
        return (scope, locals, assign) => {
            const lhs = left(scope, locals, assign);
            const rhs = right(scope, locals, assign);
            const arg = (isDefined(lhs) ? lhs : 0) - (isDefined(rhs) ? rhs : 0);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary multiplication operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary multiplication function.
     */
    "binary*"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) * right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary division operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary division function.
     */
    "binary/"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) / right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary modulo operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary division function.
     */
    "binary%"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) % right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary strict equality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary strict equality function.
     */
    "binary==="(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) === right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary strict inequality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary strict inequality function.
     */
    "binary!=="(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) !== right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary equality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary equality function.
     */
    "binary=="(left, right, context) {
        return (scope, locals, assign) => {
            // Expression parser must preserve JavaScript loose equality semantics.
            // eslint-disable-next-line eqeqeq
            const arg = left(scope, locals, assign) == right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary inequality operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary inequality function.
     */
    "binary!="(left, right, context) {
        return (scope, locals, assign) => {
            // Expression parser must preserve JavaScript loose inequality semantics.
            // eslint-disable-next-line eqeqeq
            const arg = left(scope, locals, assign) != right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary less-than operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary less-than function.
     */
    "binary<"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) < right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary greater-than operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary greater-than function.
     */
    "binary>"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) > right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary less-than-or-equal-to operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary less-than-or-equal-to function.
     */
    "binary<="(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) <= right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary greater-than-or-equal-to operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary greater-than-or-equal-to function.
     */
    "binary>="(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) >= right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary logical AND operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary logical AND function.
     */
    "binary&&"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) && right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary logical OR operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary logical OR function.
     */
    "binary||"(left, right, context) {
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) || right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Ternary conditional operation.
     * @param {function} test - The test function.
     * @param {function} alternate - The alternate function.
     * @param {function} consequent - The consequent function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The ternary conditional function.
     */
    "ternary?:"(test, alternate, consequent, context) {
        return (scope, locals, assign) => {
            const arg = test(scope, locals, assign)
                ? alternate(scope, locals, assign)
                : consequent(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Returns the value of a literal.
     * @param {*} value - The literal value.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The function returning the literal value.
     */
    /** @internal */
    _value(value, context) {
        return () => context ? { context: undefined, name: undefined, value } : value;
    }
    /**
     * Returns the value of an identifier.
     * @param {string} name - The identifier name.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - Whether to create the identifier if it does not exist.
     *  @returns {CompiledExpressionFunction}  The function returning the identifier value.
     */
    /** @internal */
    _identifier(name, context, create) {
        return (scope, locals) => {
            const runtimeScope = scope;
            const base = locals && name in locals
                ? locals
                : ((runtimeScope && runtimeScope.$proxy) ?? scope);
            if (create && create !== 1 && base && isNullOrUndefined(base[name])) {
                base[name] = {};
            }
            let value = undefined;
            if (base) {
                value = deProxy(base)[name];
            }
            if (context) {
                return { context: base, name, value };
            }
            return value;
        };
    }
    /** @internal */
    _path(path) {
        return createPathGetter(path);
    }
    /**
     * Returns the value of a computed member expression.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - Whether to create the member if it does not exist.
     * @returns {CompiledExpressionFunction}  The function returning the computed member value.
     */
    /** @internal */
    _computedMember(left, right, context, create) {
        return (scope, locals, assign) => {
            const lhs = left(scope, locals, assign);
            let rhs;
            let value;
            if (!isNullOrUndefined(lhs)) {
                rhs = right(scope, locals, assign);
                rhs = getStringValue(rhs);
                if (create && create !== 1) {
                    if (lhs && !lhs[rhs]) {
                        lhs[rhs] = {};
                    }
                }
                value = lhs[rhs];
            }
            if (context) {
                return { context: lhs, name: rhs, value };
            }
            return value;
        };
    }
    /**
     * Returns the value of a non-computed member expression.
     * @param {function} left - The left operand function.
     * @param {string} right - The right operand function.
     * @param {Object} [context] - The context.
     * @param {boolean|1} [create] - Whether to create the member if it does not exist.
     * @returns {CompiledExpressionFunction}  The function returning the non-computed member value.
     */
    /** @internal */
    _nonComputedMember(left, right, context, create) {
        return (scope, locals, assign) => {
            const lhs = left(scope, locals, assign);
            if (create && create !== 1) {
                if (lhs && isNullOrUndefined(lhs[right])) {
                    lhs[right] = {};
                }
            }
            const value = !isNullOrUndefined(lhs) ? lhs[right] : undefined;
            if (context) {
                return { context: lhs, name: right, value };
            }
            return value;
        };
    }
}
function getNonComputedPath(ast) {
    if (ast._type === ASTType._Identifier) {
        return [ast._name];
    }
    if (ast._type !== ASTType._MemberExpression || ast._computed) {
        return undefined;
    }
    const parentPath = getNonComputedPath(ast._object);
    if (!parentPath) {
        return undefined;
    }
    parentPath.push(ast._property._name);
    return parentPath;
}
function getPathBase(head, scope, locals) {
    const runtimeScope = scope;
    const base = locals && head in locals
        ? locals
        : ((runtimeScope && runtimeScope.$proxy) ?? scope);
    return base ? deProxy(base) : undefined;
}
function createPathGetter(path) {
    const p0 = path[0];
    switch (path.length) {
        case 1:
            return (scope, locals) => getPathBase(p0, scope, locals)?.[p0];
        case 2: {
            const p1 = path[1];
            return (scope, locals) => {
                const value = getPathBase(p0, scope, locals)?.[p0];
                return isNullOrUndefined(value) ? undefined : value[p1];
            };
        }
        case 3: {
            const p1 = path[1];
            const p2 = path[2];
            return (scope, locals) => {
                const value = getPathBase(p0, scope, locals)?.[p0];
                if (isNullOrUndefined(value)) {
                    return undefined;
                }
                const next = value[p1];
                return isNullOrUndefined(next) ? undefined : next[p2];
            };
        }
    }
    return (scope, locals) => {
        let value = getPathBase(p0, scope, locals)?.[p0];
        for (let i = 1, l = path.length; i < l; i++) {
            if (isNullOrUndefined(value)) {
                return undefined;
            }
            value = value[path[i]];
        }
        return value;
    };
}
function getPathBinary(ast) {
    const operator = ast._operator;
    if (operator !== "===" && operator !== "!==") {
        return undefined;
    }
    const leftPath = getNonComputedPath(ast._left);
    if (!leftPath) {
        return undefined;
    }
    const rightPath = getNonComputedPath(ast._right);
    if (!rightPath) {
        return undefined;
    }
    const left = createPathGetter(leftPath);
    const right = createPathGetter(rightPath);
    return operator === "==="
        ? (scope, locals) => left(scope, locals) === right(scope, locals)
        : (scope, locals) => left(scope, locals) !== right(scope, locals);
}
/**
 * Decorates an AST node with constant, toWatch, and isPure metadata.
 *
 * This function recursively traverses the AST and sets:
 * - `constant` → whether the node is a constant expression
 * - `toWatch` → list of expressions to observe for changes
 * - `isPure` → whether the expression is pure (Angular-specific)
 *
 * @param {ASTNode} ast - The AST node to decorate
 * @param {ng.FilterService} $filter - Angular filter service
 * @param {boolean|1|2} [parentIsPure] - Optional flag indicating purity of the parent node
 * @returns {ASTNode} The same node, now decorated
 * @throws {Error} If the AST type is unknown
 */
function findConstantAndWatchExpressions(ast, $filter, parentIsPure) {
    let allConstants;
    let argsToWatch = [];
    let isFilter;
    const decoratedNode = ast;
    let decoratedLeft;
    let decoratedRight;
    let decoratedTest;
    let decoratedAlternate;
    let decoratedConsequent;
    let decoratedObject;
    let decoratedProperty;
    let decoratedKey;
    const astIsPure = (decoratedNode._isPure = !!isPure(ast, parentIsPure));
    switch (ast._type) {
        case ASTType._Program:
            allConstants = true;
            const body = decoratedNode._body;
            for (let i = 0, l = body.length; i < l; i++) {
                const expr = body[i];
                const decorated = findConstantAndWatchExpressions(expr._expression, $filter, astIsPure);
                allConstants = allConstants && decorated._constant;
            }
            decoratedNode._constant = allConstants;
            return decoratedNode;
        case ASTType._Literal:
            decoratedNode._constant = true;
            decoratedNode._toWatch = [];
            return decoratedNode;
        case ASTType._UnaryExpression: {
            const decorated = findConstantAndWatchExpressions(decoratedNode._argument, $filter, astIsPure);
            decoratedNode._constant = decorated._constant;
            decoratedNode._toWatch = decorated._toWatch || [];
            return decoratedNode;
        }
        case ASTType._BinaryExpression:
            decoratedLeft = findConstantAndWatchExpressions(decoratedNode._left, $filter, astIsPure);
            decoratedRight = findConstantAndWatchExpressions(decoratedNode._right, $filter, astIsPure);
            decoratedNode._constant =
                decoratedLeft._constant && decoratedRight._constant;
            argsToWatch = [];
            appendWatchNodes(argsToWatch, decoratedLeft._toWatch);
            appendWatchNodes(argsToWatch, decoratedRight._toWatch);
            decoratedNode._toWatch = argsToWatch;
            return decoratedNode;
        case ASTType._LogicalExpression:
            decoratedLeft = findConstantAndWatchExpressions(decoratedNode._left, $filter, astIsPure);
            decoratedRight = findConstantAndWatchExpressions(decoratedNode._right, $filter, astIsPure);
            decoratedNode._constant =
                decoratedLeft._constant && decoratedRight._constant;
            decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];
            return decoratedNode;
        case ASTType._ConditionalExpression:
            decoratedTest = findConstantAndWatchExpressions(ast._test, $filter, astIsPure);
            decoratedAlternate = findConstantAndWatchExpressions(ast._alternate, $filter, astIsPure);
            decoratedConsequent = findConstantAndWatchExpressions(ast._consequent, $filter, astIsPure);
            decoratedNode._constant =
                decoratedTest._constant &&
                    decoratedAlternate._constant &&
                    decoratedConsequent._constant;
            decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];
            return decoratedNode;
        case ASTType._Identifier:
            decoratedNode._constant = false;
            decoratedNode._toWatch = [ast];
            return decoratedNode;
        case ASTType._MemberExpression:
            decoratedObject = findConstantAndWatchExpressions(ast._object, $filter, astIsPure);
            if (ast._computed) {
                decoratedProperty = findConstantAndWatchExpressions(ast._property, $filter, astIsPure);
            }
            decoratedNode._constant =
                decoratedObject._constant &&
                    (!decoratedNode._computed || decoratedProperty?._constant);
            decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];
            return decoratedNode;
        case ASTType._CallExpression:
            isFilter = ast._filter;
            allConstants = isFilter;
            argsToWatch = [];
            const callArguments = ast._arguments || [];
            for (let i = 0, l = callArguments.length; i < l; i++) {
                const expr = callArguments[i];
                const decorated = findConstantAndWatchExpressions(expr, $filter, astIsPure);
                allConstants = allConstants && !!decorated._constant;
                appendWatchNodes(argsToWatch, decorated._toWatch);
            }
            decoratedNode._constant = allConstants;
            decoratedNode._toWatch = isFilter ? argsToWatch : [decoratedNode];
            return decoratedNode;
        case ASTType._AssignmentExpression:
            decoratedLeft = findConstantAndWatchExpressions(ast._left, $filter, astIsPure);
            decoratedRight = findConstantAndWatchExpressions(ast._right, $filter, astIsPure);
            decoratedNode._constant =
                decoratedLeft._constant && decoratedRight._constant;
            decoratedNode._toWatch = [decoratedNode];
            return decoratedNode;
        case ASTType._ArrayExpression:
            allConstants = true;
            argsToWatch = [];
            const elements = ast._elements || [];
            for (let i = 0, l = elements.length; i < l; i++) {
                const expr = elements[i];
                const decorated = findConstantAndWatchExpressions(expr, $filter, astIsPure);
                allConstants = allConstants && !!decorated._constant;
                appendWatchNodes(argsToWatch, decorated._toWatch);
            }
            decoratedNode._constant = allConstants;
            decoratedNode._toWatch = argsToWatch;
            return decoratedNode;
        case ASTType._ObjectExpression:
            allConstants = true;
            argsToWatch = [];
            const properties = ast._properties;
            for (let i = 0, l = properties.length; i < l; i++) {
                const property = properties[i];
                const decorated = findConstantAndWatchExpressions(property._value, $filter, astIsPure);
                allConstants = allConstants && !!decorated._constant;
                appendWatchNodes(argsToWatch, decorated._toWatch);
                if (property._computed) {
                    // `{[key]: value}` implicitly does `key.toString()` which may be non-pure
                    decoratedKey = findConstantAndWatchExpressions(property._key, $filter, false);
                    allConstants = allConstants && !!decoratedKey._constant;
                    appendWatchNodes(argsToWatch, decoratedKey._toWatch);
                }
            }
            decoratedNode._constant = allConstants;
            decoratedNode._toWatch = argsToWatch;
            return decoratedNode;
        case ASTType._ThisExpression:
            decoratedNode._constant = false;
            decoratedNode._toWatch = [];
            return decoratedNode;
        case ASTType._LocalsExpression:
            decoratedNode._constant = false;
            decoratedNode._toWatch = [];
            return decoratedNode;
        case ASTType._UpdateExpression: {
            // side-effectful, not constant
            findConstantAndWatchExpressions(ast._argument, $filter, false);
            decoratedNode._constant = false;
            decoratedNode._toWatch = [decoratedNode]; // treat like assignment: watch the expression
            return decoratedNode;
        }
        default:
            throw new Error(`Unknown AST node type: ${ast._type}`);
    }
}
/**
 * Converts a single expression AST node into an assignment expression if the expression is assignable.
 *
 * @param {BodyNode} ast
 * @returns {ExpressionNode | undefined}
 */
function assignableAST(ast) {
    const stmt = ast._body[0];
    if (ast._body.length === 1 &&
        stmt?._expression &&
        isAssignable(stmt._expression)) {
        return {
            _type: ASTType._AssignmentExpression,
            _left: stmt._expression, // left-hand side is an expression
            _right: { _type: ASTType._NGValueParameter }, // right-hand side leaf expression
            _operator: "=",
        };
    }
    return undefined;
}
/**
 * @param {string | number} left
 * @param {string | number} right
 */
function plusFn(left, right) {
    if (typeof left === "undefined" || isObject(left))
        return right;
    if (typeof right === "undefined" || isObject(right))
        return left;
    return left + right;
}
/**
 *
 * @param {ASTNode[]} body
 * @returns {any}
 */
function getInputs(body) {
    if (body.length !== 1)
        return undefined;
    const lastExpression = body[0]._expression;
    const candidate = lastExpression?._toWatch || [];
    if (candidate.length !== 1)
        return candidate;
    return candidate[0] !== lastExpression ? candidate : undefined;
}
/**
 * Detect nodes which could depend on non-shallow state of objects
 * @param {ASTNode} node
 * @param {boolean|PURITY_ABSOLUTE|PURITY_RELATIVE} [parentIsPure]
 * @returns {number|boolean}
 */
function isPure(node, parentIsPure) {
    switch (node._type) {
        // Computed members might invoke a stateful toString()
        case ASTType._MemberExpression:
            if (node._computed) {
                return false;
            }
            break;
        // Unary always convert to primitive
        case ASTType._UnaryExpression:
            return PURITY_ABSOLUTE;
        // The binary + operator can invoke a stateful toString().
        case ASTType._BinaryExpression:
            return node._operator !== "+"
                ? PURITY_ABSOLUTE
                : false;
        // Functions / filters probably read state from within objects
        case ASTType._CallExpression:
            return false;
        case ASTType._UpdateExpression:
            return false;
    }
    return undefined === parentIsPure ? PURITY_RELATIVE : parentIsPure;
}
/**
 * Converts parameter to  strings property name for use  as keys in an object.
 * Any non-string object, including a number, is typecasted into a string via the toString method.
 * {@link https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Property_accessors#Property_names}
 *
 * @param {!any} name
 * @returns {string}
 */
function getStringValue(name) {
    return `${name}`;
}
/**
 * @param {ASTNode} ast
 * @returns {boolean}
 */
function isAssignable(ast) {
    return (ast._type === ASTType._Identifier || ast._type === ASTType._MemberExpression);
}

export { ASTInterpreter, PURITY_ABSOLUTE, PURITY_RELATIVE, isAssignable };
