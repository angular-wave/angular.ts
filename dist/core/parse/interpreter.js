import { assertDefined, isNullOrUndefined, isFunction, callFunction, deProxy, isProxy, isDefined, isObject } from '../../shared/utils.js';
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
function asPropertyBag(value) {
    if (isNullOrUndefined(value)) {
        return undefined;
    }
    if (isObject(value) || isFunction(value)) {
        return value;
    }
    return Object(value);
}
function readProperty(value, key) {
    return asPropertyBag(value)?.[key];
}
function writeProperty(value, key, propertyValue) {
    const bag = asPropertyBag(value);
    if (bag) {
        bag[key] = propertyValue;
    }
}
function getProxyTarget(value) {
    const bag = asPropertyBag(value);
    return bag && "$proxy" in bag ? (bag.$proxy ?? value) : value;
}
function getExpressionReference(value) {
    return isObject(value) ? value : {};
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
            expressions.push(this._recurse(assertDefined(expression._expression)));
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
        const self = this;
        switch (ast._type) {
            case ASTType._Literal:
                return this._value(ast._value, context);
            case ASTType._UnaryExpression: {
                const unaryRight = this._recurse(assertDefined(ast._argument));
                return self[`unary${ast._operator}`](unaryRight, context);
            }
            case ASTType._BinaryExpression: {
                if (!context) {
                    const binaryPath = getPathBinary(ast);
                    if (binaryPath) {
                        return binaryPath;
                    }
                }
                const binaryLeft = this._recurse(assertDefined(ast._left));
                const binaryRight = this._recurse(assertDefined(ast._right));
                return self[`binary${ast._operator}`](binaryLeft, binaryRight, context);
            }
            case ASTType._LogicalExpression: {
                if (!context) {
                    const logicalPath = getPathLogical(ast);
                    if (logicalPath) {
                        return logicalPath;
                    }
                }
                const logicalLeft = this._recurse(assertDefined(ast._left));
                const logicalRight = this._recurse(assertDefined(ast._right));
                return self[`binary${ast._operator}`](logicalLeft, logicalRight, context);
            }
            case ASTType._ConditionalExpression:
                return this["ternary?:"](this._recurse(assertDefined(ast._test)), this._recurse(assertDefined(ast._alternate)), this._recurse(assertDefined(ast._consequent)), context);
            case ASTType._Identifier:
                return this._identifier(assertDefined(ast._name), context, create);
            case ASTType._MemberExpression:
                return this._compileMemberExpression(ast, context, create);
            case ASTType._CallExpression:
                return this._compileCallExpression(ast, context);
            case ASTType._AssignmentExpression:
                return this._compileAssignmentExpression(ast, context);
            case ASTType._ArrayExpression:
                return this._compileArrayExpression(ast, context);
            case ASTType._ObjectExpression:
                return this._compileObjectExpression(ast, context);
            case ASTType._ThisExpression:
                return (scope) => (context ? { value: scope } : getProxyTarget(scope));
            case ASTType._LocalsExpression:
                return (scope, locals) => (context ? { value: locals } : locals);
            case ASTType._NGValueParameter:
                return (scope, locals, assign) => context ? { value: assign } : assign;
            case ASTType._UpdateExpression: {
                return this._compileUpdateExpression(ast, context);
            }
        }
        throw new Error(`Unknown AST type ${ast._type}`);
    }
    /** @internal */
    _compileCallExpression(ast, context) {
        const callArguments = ast._arguments || [];
        const args = [];
        for (let i = 0, l = callArguments.length; i < l; i++) {
            args.push(this._recurse(callArguments[i]));
        }
        if (ast._filter) {
            return this._compileFilterCall(ast, callArguments, args, context);
        }
        const callee = assertDefined(ast._callee);
        const right = this._recurse(callee, true);
        if (!context && args.length === 2 && callee._type === ASTType._Identifier) {
            return this._compileIdentifierTwoArgCall(assertDefined(callee._name), callArguments, args);
        }
        if (args.length <= 1) {
            return this._compileSmallCall(right, args[0], args.length, context);
        }
        if (args.length === 2) {
            return this._compileTwoArgCall(right, args[0], args[1], context);
        }
        return this._compileVariadicCall(right, args, context);
    }
    /** @internal */
    _compileIdentifierTwoArgCall(calleeName, callArguments, args) {
        const argPath0 = getNonComputedPath(callArguments[0]);
        const argPath1 = getNonComputedPath(callArguments[1]);
        if (argPath0?.length === 1 && argPath1?.length === 1) {
            const argName0 = argPath0[0];
            const argName1 = argPath1[0];
            return (scope, locals) => {
                const base = getProxyTarget(scope);
                if (!locals) {
                    if (isNullOrUndefined(base)) {
                        return undefined;
                    }
                    const calleeValue = readProperty(base, calleeName);
                    if (!isFunction(calleeValue)) {
                        return undefined;
                    }
                    const value0 = readProperty(base, argName0);
                    const value1 = readProperty(base, argName1);
                    return callFunction(calleeValue, base, isFunction(value0) ? value0() : value0, isFunction(value1) ? value1() : value1);
                }
                const calleeBase = calleeName in locals ? locals : base;
                if (isNullOrUndefined(calleeBase)) {
                    return undefined;
                }
                const calleeValue = readProperty(calleeBase, calleeName);
                if (!isFunction(calleeValue)) {
                    return undefined;
                }
                const argBase0 = argName0 in locals ? locals : base;
                const argBase1 = argName1 in locals ? locals : base;
                const value0 = readProperty(argBase0, argName0);
                const value1 = readProperty(argBase1, argName1);
                return callFunction(calleeValue, calleeBase, isFunction(value0) ? value0() : value0, isFunction(value1) ? value1() : value1);
            };
        }
        const arg0 = args[0];
        const arg1 = args[1];
        return (scope, locals, assign) => {
            const base = locals && calleeName in locals
                ? locals
                : getProxyTarget(scope);
            if (isNullOrUndefined(base)) {
                return undefined;
            }
            const calleeValue = readProperty(base, calleeName);
            if (!isFunction(calleeValue)) {
                return undefined;
            }
            const res0 = arg0(scope, locals, assign);
            const res1 = arg1(scope, locals, assign);
            return callFunction(calleeValue, base, isFunction(res0) ? res0() : res0, isFunction(res1) ? res1() : res1);
        };
    }
    /** @internal */
    _compileSmallCall(callee, arg, argCount, context) {
        return argCount
            ? (scope, locals, assign) => {
                const rhs = getExpressionReference(callee(scope, locals, assign));
                let value;
                if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
                    const res = assertDefined(arg)(scope, locals, assign);
                    value = callFunction(rhs.value, rhs.context, isFunction(res) ? res() : res);
                }
                return context ? { value } : value;
            }
            : (scope, locals, assign) => {
                const rhs = getExpressionReference(callee(scope, locals, assign));
                const value = !isNullOrUndefined(rhs.value) && isFunction(rhs.value)
                    ? callFunction(rhs.value, rhs.context)
                    : undefined;
                return context ? { value } : value;
            };
    }
    /** @internal */
    _compileTwoArgCall(callee, arg0, arg1, context) {
        if (!context) {
            return (scope, locals, assign) => {
                const rhs = getExpressionReference(callee(scope, locals, assign));
                if (isNullOrUndefined(rhs.value) || !isFunction(rhs.value)) {
                    return undefined;
                }
                const res0 = arg0(scope, locals, assign);
                const res1 = arg1(scope, locals, assign);
                return callFunction(rhs.value, rhs.context, isFunction(res0) ? res0() : res0, isFunction(res1) ? res1() : res1);
            };
        }
        return (scope, locals, assign) => {
            const rhs = getExpressionReference(callee(scope, locals, assign));
            let value;
            if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
                const res0 = arg0(scope, locals, assign);
                const res1 = arg1(scope, locals, assign);
                value = callFunction(rhs.value, rhs.context, isFunction(res0) ? res0() : res0, isFunction(res1) ? res1() : res1);
            }
            return { value };
        };
    }
    /** @internal */
    _compileVariadicCall(callee, args, context) {
        return (scope, locals, assign) => {
            const rhs = getExpressionReference(callee(scope, locals, assign));
            let value;
            if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
                const values = [];
                for (let i = 0; i < args.length; ++i) {
                    const res = args[i](scope, locals, assign);
                    values.push(isFunction(res) ? res() : res);
                }
                value = callFunction(rhs.value, rhs.context, ...values);
            }
            return context ? { value } : value;
        };
    }
    /** @internal */
    _compileFilterCall(ast, callArguments, args, context) {
        const filter = this._$filter(assertDefined(ast._callee._name));
        if (args.length === 1) {
            const arg0 = args[0];
            if (!context) {
                const argPath = getNonComputedPath(callArguments[0]);
                if (argPath?.length === 1) {
                    const argName = argPath[0];
                    return (scope, locals) => {
                        const evalScope = scope && deProxy(scope);
                        const base = locals && argName in locals
                            ? locals
                            : getProxyTarget(evalScope);
                        return callFunction(filter, undefined, readProperty(base, argName));
                    };
                }
            }
            return context
                ? (scope, locals, assign) => {
                    const evalScope = scope && deProxy(scope);
                    const value = () => callFunction(filter, undefined, arg0(evalScope, locals, assign));
                    return { context: undefined, name: undefined, value };
                }
                : (scope, locals, assign) => callFunction(filter, undefined, arg0(scope && deProxy(scope), locals, assign));
        }
        if (args.length === 2) {
            const arg0 = args[0];
            const arg1 = args[1];
            return context
                ? (scope, locals, assign) => {
                    const evalScope = scope && deProxy(scope);
                    const value = () => callFunction(filter, undefined, arg0(evalScope, locals, assign), arg1(evalScope, locals, assign));
                    return { context: undefined, name: undefined, value };
                }
                : (scope, locals, assign) => {
                    const evalScope = scope && deProxy(scope);
                    return callFunction(filter, undefined, arg0(evalScope, locals, assign), arg1(evalScope, locals, assign));
                };
        }
        return (scope, locals, assign) => {
            const values = [];
            const evalScope = scope && deProxy(scope);
            for (let i = 0; i < args.length; ++i) {
                const res = args[i](evalScope, locals, assign);
                values.push(res);
            }
            const value = () => callFunction(filter, undefined, ...values);
            return context ? { context: undefined, name: undefined, value } : value();
        };
    }
    /** @internal */
    _compileMemberExpression(ast, context, create) {
        const left = this._recurse(assertDefined(ast._object), false, !!create);
        if (ast._computed) {
            return this._computedMember(left, this._recurse(assertDefined(ast._property)), context, create);
        }
        return this._nonComputedMember(left, assertDefined(ast._property._name), context, create);
    }
    /** @internal */
    _compileAssignmentExpression(ast, context) {
        const left = this._recurse(assertDefined(ast._left), true, 1);
        const right = this._recurse(assertDefined(ast._right));
        return (scope, locals, assign) => {
            const lhs = getExpressionReference(left(scope, locals, assign));
            const rhs = right(scope, locals, assign);
            const ctx = isProxy(lhs.context)
                ? lhs.context
                : getProxyTarget(lhs.context);
            if (!isNullOrUndefined(lhs.name)) {
                if (isNullOrUndefined(ctx)) {
                    throw new TypeError("Cannot assign property on null or undefined");
                }
                writeProperty(ctx, lhs.name, rhs);
            }
            return context ? { value: rhs } : rhs;
        };
    }
    /** @internal */
    _compileArrayExpression(ast, context) {
        const args = [];
        const elements = ast._elements || [];
        for (let i = 0, l = elements.length; i < l; i++) {
            args.push(this._recurse(elements[i]));
        }
        return (scope, locals, assign) => {
            const value = [];
            for (let i = 0; i < args.length; ++i) {
                value.push(args[i](scope, locals, assign));
            }
            return context ? { value } : value;
        };
    }
    /** @internal */
    _compileUpdateExpression(ast, context) {
        const ref = this._recurse(assertDefined(ast._argument), true, 1);
        const op = ast._operator;
        const prefix = !!ast._prefix;
        return (scope, locals, assign) => {
            const lhs = getExpressionReference(ref(scope, locals, assign));
            if (!lhs || isNullOrUndefined(lhs.context)) {
                throw new Error(`${op} operand is not assignable (context is ${lhs?.context})`);
            }
            const oldNum = Number(lhs.value);
            const newNum = op === "++" ? oldNum + 1 : oldNum - 1;
            const ctx = isProxy(lhs.context)
                ? lhs.context
                : getProxyTarget(lhs.context);
            if (lhs.name) {
                writeProperty(ctx, lhs.name, newNum);
            }
            const out = prefix ? newNum : oldNum;
            return context ? { value: out } : out;
        };
    }
    /** @internal */
    _compileObjectExpression(ast, context) {
        const properties = (ast._properties || []);
        if (!context && properties.length === 1 && !properties[0]._computed) {
            return this._compileSinglePropertyObject(properties[0]);
        }
        if (!context && isSmallStaticObject(properties)) {
            const optimized = this._compileSmallStaticObject(properties);
            if (optimized) {
                return optimized;
            }
        }
        const args = compileObjectProperties(this, properties);
        return (scope, locals, assign) => {
            const value = {};
            for (let i = 0; i < args.length; ++i) {
                const property = args[i];
                if (property.computed) {
                    value[getStringValue(property.key(scope, locals, assign))] =
                        property.value(scope, locals, assign);
                }
                else {
                    value[property.key] = property.value(scope, locals, assign);
                }
            }
            return context ? { value } : value;
        };
    }
    /** @internal */
    _compileSinglePropertyObject(property) {
        const key = getObjectPropertyKey(property);
        const value = this._recurse(property._value);
        return (scope, locals, assign) => {
            const object = {};
            object[key] = value(scope, locals, assign);
            return object;
        };
    }
    /** @internal */
    _compileSmallStaticObject(properties) {
        const property0 = properties[0];
        const property1 = properties[1];
        const key0 = getObjectPropertyKey(property0);
        const key1 = getObjectPropertyKey(property1);
        if (properties.length === 2) {
            const value0 = this._recurse(property0._value);
            const value1 = this._recurse(property1._value);
            return (scope, locals, assign) => {
                const object = {};
                object[key0] = value0(scope, locals, assign);
                object[key1] = value1(scope, locals, assign);
                return object;
            };
        }
        const property2 = properties[2];
        const key2 = getObjectPropertyKey(property2);
        const valuePath0 = getNonComputedPath(property0._value);
        const valuePath1 = getNonComputedPath(property1._value);
        const valuePath2 = getNonComputedPath(property2._value);
        if (valuePath0?.length === 2 &&
            valuePath1?.length === 2 &&
            valuePath2?.length === 2 &&
            valuePath0[0] === valuePath1[0] &&
            valuePath0[0] === valuePath2[0]) {
            return compileObjectPathProjection(key0, key1, key2, valuePath0, valuePath1, valuePath2);
        }
        const value0 = this._recurse(property0._value);
        const value1 = this._recurse(property1._value);
        const value2 = this._recurse(property2._value);
        return (scope, locals, assign) => {
            const object = {};
            object[key0] = value0(scope, locals, assign);
            object[key1] = value1(scope, locals, assign);
            object[key2] = value2(scope, locals, assign);
            return object;
        };
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
                arg = Number(arg);
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
                arg = -Number(arg);
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
            const arg = Number(isDefined(lhs) ? lhs : 0) - Number(isDefined(rhs) ? rhs : 0);
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
            const arg = Number(left(scope, locals, assign)) *
                Number(right(scope, locals, assign));
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
            const arg = Number(left(scope, locals, assign)) /
                Number(right(scope, locals, assign));
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
            const arg = Number(left(scope, locals, assign)) %
                Number(right(scope, locals, assign));
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
            const arg = left(scope, locals, assign) <
                right(scope, locals, assign);
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
            const arg = left(scope, locals, assign) >
                right(scope, locals, assign);
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
            const arg = left(scope, locals, assign) <=
                right(scope, locals, assign);
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
            const arg = left(scope, locals, assign) >=
                right(scope, locals, assign);
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
        if (!context) {
            return (scope, locals, assign) => left(scope, locals, assign) && right(scope, locals, assign);
        }
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
        if (!context) {
            return (scope, locals, assign) => left(scope, locals, assign) || right(scope, locals, assign);
        }
        return (scope, locals, assign) => {
            const arg = left(scope, locals, assign) || right(scope, locals, assign);
            return context ? { value: arg } : arg;
        };
    }
    /**
     * Binary nullish coalescing operation.
     * @param {function} left - The left operand function.
     * @param {function} right - The right operand function.
     * @param {Object} [context] - The context.
     * @returns {CompiledExpressionFunction} The binary nullish coalescing function.
     */
    "binary??"(left, right, context) {
        if (!context) {
            return (scope, locals, assign) => {
                const lhs = left(scope, locals, assign);
                return isNullOrUndefined(lhs) ? right(scope, locals, assign) : lhs;
            };
        }
        return (scope, locals, assign) => {
            const lhs = left(scope, locals, assign);
            const arg = isNullOrUndefined(lhs) ? right(scope, locals, assign) : lhs;
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
            const base = locals && name in locals ? locals : getProxyTarget(scope);
            if (create &&
                create !== 1 &&
                isNullOrUndefined(readProperty(base, name))) {
                writeProperty(base, name, {});
            }
            const value = readProperty(base, name);
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
                rhs = getStringValue(right(scope, locals, assign));
                if (create && create !== 1) {
                    if (lhs && !readProperty(lhs, rhs)) {
                        writeProperty(lhs, rhs, {});
                    }
                }
                value = readProperty(lhs, rhs);
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
        if (!context && !create) {
            return (scope, locals, assign) => {
                const lhs = left(scope, locals, assign);
                return readProperty(lhs, right);
            };
        }
        return (scope, locals, assign) => {
            const lhs = left(scope, locals, assign);
            if (create && create !== 1) {
                if (lhs && isNullOrUndefined(readProperty(lhs, right))) {
                    writeProperty(lhs, right, {});
                }
            }
            const value = readProperty(lhs, right);
            if (context) {
                return { context: lhs, name: right, value };
            }
            return value;
        };
    }
}
function getNonComputedPath(ast) {
    if (ast._type === ASTType._Identifier) {
        return [assertDefined(ast._name)];
    }
    if (ast._type !== ASTType._MemberExpression || ast._computed) {
        return undefined;
    }
    const member = ast;
    const memberObject = assertDefined(member._object);
    const memberProperty = assertDefined(member._property._name);
    if (memberObject._type === ASTType._Identifier) {
        return [assertDefined(memberObject._name), memberProperty];
    }
    const path = [];
    let node = ast;
    while (node?._type === ASTType._MemberExpression && !node._computed) {
        path.push(assertDefined(node._property._name));
        node = assertDefined(node._object);
    }
    if (node?._type !== ASTType._Identifier) {
        return undefined;
    }
    path.push(assertDefined(node._name));
    path.reverse();
    return path;
}
function getObjectPropertyKey(property) {
    return property._key._type === ASTType._Identifier
        ? assertDefined(property._key._name)
        : `${property._key._value}`;
}
function isSmallStaticObject(properties) {
    if (properties.length !== 2 && properties.length !== 3) {
        return false;
    }
    for (let i = 0; i < properties.length; i++) {
        if (properties[i]._computed) {
            return false;
        }
    }
    return true;
}
function compileObjectPathProjection(key0, key1, key2, valuePath0, valuePath1, valuePath2) {
    const sourceKey = valuePath0[0];
    const valueKey0 = valuePath0[1];
    const valueKey1 = valuePath1[1];
    const valueKey2 = valuePath2[1];
    return (scope, locals) => {
        const base = locals && sourceKey in locals
            ? locals
            : getProxyTarget(scope);
        const source = readProperty(base, sourceKey);
        const object = {};
        if (isNullOrUndefined(source)) {
            object[key0] = undefined;
            object[key1] = undefined;
            object[key2] = undefined;
            return object;
        }
        object[key0] = readProperty(source, valueKey0);
        object[key1] = readProperty(source, valueKey1);
        object[key2] = readProperty(source, valueKey2);
        return object;
    };
}
function compileObjectProperties(interpreter, properties) {
    const compiled = [];
    for (let i = 0, l = properties.length; i < l; i++) {
        const property = properties[i];
        if (property._computed) {
            compiled.push({
                key: interpreter._recurse(property._key),
                computed: true,
                value: interpreter._recurse(property._value),
            });
        }
        else {
            compiled.push({
                key: getObjectPropertyKey(property),
                computed: false,
                value: interpreter._recurse(property._value),
            });
        }
    }
    return compiled;
}
function createPathGetter(path) {
    const p0 = path[0];
    switch (path.length) {
        case 1:
            return (scope, locals) => {
                if (!locals) {
                    const base = getProxyTarget(scope);
                    return readProperty(base, p0);
                }
                const base = locals && p0 in locals
                    ? locals
                    : getProxyTarget(scope);
                return readProperty(base, p0);
            };
        case 2: {
            const p1 = path[1];
            return (scope, locals) => {
                if (!locals) {
                    const base = getProxyTarget(scope);
                    const value = readProperty(base, p0);
                    return readProperty(value, p1);
                }
                const base = locals && p0 in locals
                    ? locals
                    : getProxyTarget(scope);
                const value = readProperty(base, p0);
                return readProperty(value, p1);
            };
        }
        case 3: {
            const p1 = path[1];
            const p2 = path[2];
            return (scope, locals) => {
                if (!locals) {
                    const base = getProxyTarget(scope);
                    const value = readProperty(base, p0);
                    if (isNullOrUndefined(value)) {
                        return undefined;
                    }
                    const next = readProperty(value, p1);
                    return readProperty(next, p2);
                }
                const base = locals && p0 in locals
                    ? locals
                    : getProxyTarget(scope);
                const value = readProperty(base, p0);
                if (isNullOrUndefined(value)) {
                    return undefined;
                }
                const next = readProperty(value, p1);
                return readProperty(next, p2);
            };
        }
    }
    return (scope, locals) => {
        const base = locals && p0 in locals
            ? locals
            : getProxyTarget(scope);
        let value = readProperty(base, p0);
        for (let i = 1, l = path.length; i < l; i++) {
            if (isNullOrUndefined(value)) {
                return undefined;
            }
            value = readProperty(value, path[i]);
        }
        return value;
    };
}
function getPathBinary(ast) {
    const operator = ast._operator;
    if (operator !== "===" && operator !== "!==") {
        return undefined;
    }
    const leftPath = getNonComputedPath(assertDefined(ast._left));
    if (!leftPath) {
        return undefined;
    }
    const rightPath = getNonComputedPath(assertDefined(ast._right));
    if (!rightPath) {
        return undefined;
    }
    const left = createPathGetter(leftPath);
    const right = createPathGetter(rightPath);
    return operator === "==="
        ? (scope, locals) => left(scope, locals) === right(scope, locals)
        : (scope, locals) => left(scope, locals) !== right(scope, locals);
}
function getPathLogical(ast) {
    const operator = ast._operator;
    if (operator !== "&&" && operator !== "||" && operator !== "??") {
        return undefined;
    }
    const leftPath = getNonComputedPath(assertDefined(ast._left));
    if (!leftPath) {
        return undefined;
    }
    const rightPath = getNonComputedPath(assertDefined(ast._right));
    if (!rightPath) {
        return undefined;
    }
    const left = createPathGetter(leftPath);
    const right = createPathGetter(rightPath);
    if (operator === "&&") {
        return (scope, locals) => left(scope, locals) && right(scope, locals);
    }
    if (operator === "||") {
        return (scope, locals) => left(scope, locals) || right(scope, locals);
    }
    return (scope, locals) => {
        const lhs = left(scope, locals);
        return isNullOrUndefined(lhs) ? right(scope, locals) : lhs;
    };
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
        case ASTType._Program: {
            allConstants = true;
            const body = decoratedNode._body;
            for (let i = 0, l = body.length; i < l; i++) {
                const expr = body[i];
                const decorated = findConstantAndWatchExpressions(assertDefined(expr._expression), $filter, astIsPure);
                allConstants = allConstants && decorated._constant;
            }
            decoratedNode._constant = allConstants;
            return decoratedNode;
        }
        case ASTType._Literal:
            decoratedNode._constant = true;
            decoratedNode._toWatch = [];
            return decoratedNode;
        case ASTType._UnaryExpression: {
            const decorated = findConstantAndWatchExpressions(assertDefined(decoratedNode._argument), $filter, astIsPure);
            decoratedNode._constant = decorated._constant;
            decoratedNode._toWatch = decorated._toWatch || [];
            return decoratedNode;
        }
        case ASTType._BinaryExpression:
            decoratedLeft = findConstantAndWatchExpressions(assertDefined(decoratedNode._left), $filter, astIsPure);
            decoratedRight = findConstantAndWatchExpressions(assertDefined(decoratedNode._right), $filter, astIsPure);
            decoratedNode._constant =
                decoratedLeft._constant && decoratedRight._constant;
            argsToWatch = [];
            appendWatchNodes(argsToWatch, decoratedLeft._toWatch);
            appendWatchNodes(argsToWatch, decoratedRight._toWatch);
            decoratedNode._toWatch = argsToWatch;
            return decoratedNode;
        case ASTType._LogicalExpression:
            decoratedLeft = findConstantAndWatchExpressions(assertDefined(decoratedNode._left), $filter, astIsPure);
            decoratedRight = findConstantAndWatchExpressions(assertDefined(decoratedNode._right), $filter, astIsPure);
            decoratedNode._constant =
                decoratedLeft._constant && decoratedRight._constant;
            decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];
            return decoratedNode;
        case ASTType._ConditionalExpression:
            decoratedTest = findConstantAndWatchExpressions(assertDefined(ast._test), $filter, astIsPure);
            decoratedAlternate = findConstantAndWatchExpressions(assertDefined(ast._alternate), $filter, astIsPure);
            decoratedConsequent = findConstantAndWatchExpressions(assertDefined(ast._consequent), $filter, astIsPure);
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
            decoratedObject = findConstantAndWatchExpressions(assertDefined(ast._object), $filter, astIsPure);
            if (ast._computed) {
                decoratedProperty = findConstantAndWatchExpressions(assertDefined(ast._property), $filter, astIsPure);
            }
            decoratedNode._constant =
                decoratedObject._constant &&
                    (!decoratedNode._computed || decoratedProperty?._constant);
            decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];
            return decoratedNode;
        case ASTType._CallExpression: {
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
        }
        case ASTType._AssignmentExpression:
            decoratedLeft = findConstantAndWatchExpressions(assertDefined(ast._left), $filter, astIsPure);
            decoratedRight = findConstantAndWatchExpressions(assertDefined(ast._right), $filter, astIsPure);
            decoratedNode._constant =
                decoratedLeft._constant && decoratedRight._constant;
            decoratedNode._toWatch = [decoratedNode];
            return decoratedNode;
        case ASTType._ArrayExpression: {
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
        }
        case ASTType._ObjectExpression: {
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
        }
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
            findConstantAndWatchExpressions(assertDefined(ast._argument), $filter, false);
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
    if (typeof left === "number" && typeof right === "number") {
        return left + right;
    }
    const leftText = String(left);
    const rightText = String(right);
    return `${leftText}${rightText}`;
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
