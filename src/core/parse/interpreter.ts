import {
  deProxy,
  isDefined,
  isFunction,
  isNullOrUndefined,
  isObject,
  isProxy,
} from "../../shared/utils.ts";
import { ASTType } from "./ast-type.ts";
import type {
  ASTNode,
  BodyNode,
  ExpressionNode,
  LiteralNode,
  ObjectNode,
  ObjectPropertyNode,
} from "./ast/ast-node.ts";
import type {
  CompiledExpression,
  CompiledExpressionFunction,
} from "./parse.ts";

export const PURITY_ABSOLUTE = 1;
export const PURITY_RELATIVE = 2;

type LinkContext = object | boolean | undefined;

type CreateFlag = boolean | 1 | undefined;

type WatchNode = ASTNode & {
  /** @internal */
  _constant?: boolean;
  /** @internal */
  _toWatch?: ASTNode[];
  /** @internal */
  _isPure?: boolean;
  /** @internal */
  _input?: CompiledExpression;
  /** @internal */
  _watchId?: string;
};

function appendWatchNodes(
  target: ASTNode[],
  watchList: ASTNode[] | undefined,
): void {
  if (!watchList) return;

  for (let i = 0, l = watchList.length; i < l; i++) {
    target.push(watchList[i]);
  }
}

export class ASTInterpreter {
  /** @internal */
  _$filter: ng.FilterService;

  /**
   * @param {ng.FilterService} $filter
   */
  constructor($filter: ng.FilterService) {
    this._$filter = $filter;
  }

  /**
   * Compiles the AST into a function.
   * @param {ASTNode} ast - The AST to compile.
   * @returns {CompiledExpression}
   */
  /** @internal */
  _compile(ast: ASTNode): CompiledExpression {
    const decoratedNode = findConstantAndWatchExpressions(ast, this._$filter);

    const { _body: body } = decoratedNode as BodyNode;

    const assignable = assignableAST(decoratedNode as BodyNode);

    let assign: CompiledExpressionFunction | undefined;

    if (assignable) {
      assign = this._recurse(assignable) as CompiledExpression;
    }

    const toWatch = getInputs(body);

    let inputs: CompiledExpression[] | undefined;

    if (toWatch) {
      inputs = [];

      for (let i = 0, l = toWatch.length; i < l; i++) {
        const watch = toWatch[i] as WatchNode;

        const input = this._recurse(watch) as CompiledExpression;

        watch._input = input;
        inputs.push(input);
        watch._watchId = `${i}`;
      }
    }
    const expressions: CompiledExpressionFunction[] = [];

    for (let i = 0, l = body.length; i < l; i++) {
      const expression = body[i];

      expressions.push(
        this._recurse((expression as ExpressionNode)._expression!),
      );
    }

    const fnRaw =
      body.length === 0
        ? () => {
            /* empty */
          }
        : body.length === 1
          ? (expressions[0] as CompiledExpression)
          : (function (scope?: ng.Scope, locals?: object) {
              let lastValue;

              for (let i = 0; i < expressions.length; i++) {
                lastValue = expressions[i](scope, locals);
              }

              return lastValue;
            } as CompiledExpressionFunction);

    const fn = fnRaw as CompiledExpression;

    if (assign) {
      fn._assign = (scope, value, locals) => assign(scope, locals, value);
    }

    if (inputs) {
      fn._inputs = inputs;
    }

    fn._decoratedNode = decoratedNode as BodyNode;

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
  _recurse(
    ast: ASTNode,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    if (!context && !create) {
      const path = getNonComputedPath(ast);

      if (path) {
        return this._path(path);
      }
    }

    let left!: CompiledExpressionFunction;

    let right:
      | string
      | CompiledExpressionFunction
      | ((...args: any[]) => any)
      | undefined;

    const self = this as unknown as ASTInterpreter &
      Record<string, (...args: any[]) => CompiledExpressionFunction>;

    switch (ast._type) {
      case ASTType._Literal:
        return this._value((ast as LiteralNode)._value, context);
      case ASTType._UnaryExpression:
        right = this._recurse((ast as ExpressionNode)._argument!);

        return self[`unary${ast._operator}`](right, context);
      case ASTType._BinaryExpression:
        if (!context) {
          const binaryPath = getPathBinary(ast);

          if (binaryPath) {
            return binaryPath;
          }
        }

        left = this._recurse((ast as ExpressionNode)._left!);
        right = this._recurse((ast as ExpressionNode)._right!);

        return self[`binary${ast._operator}`](left, right, context);
      case ASTType._LogicalExpression:
        if (!context) {
          const logicalPath = getPathLogical(ast);

          if (logicalPath) {
            return logicalPath;
          }
        }

        left = this._recurse((ast as ExpressionNode)._left!);
        right = this._recurse((ast as ExpressionNode)._right!);

        return self[`binary${ast._operator}`](left, right, context);
      case ASTType._ConditionalExpression:
        return this["ternary?:"](
          this._recurse((ast as ExpressionNode)._test!),
          this._recurse((ast as ExpressionNode)._alternate!),
          this._recurse((ast as ExpressionNode)._consequent!),
          context,
        );
      case ASTType._Identifier:
        return this._identifier((ast as LiteralNode)._name!, context, create);
      case ASTType._MemberExpression:
        return this._compileMemberExpression(
          ast as ExpressionNode,
          context,
          create,
        );
      case ASTType._CallExpression:
        return this._compileCallExpression(ast as ExpressionNode, context);
      case ASTType._AssignmentExpression:
        return this._compileAssignmentExpression(
          ast as ExpressionNode,
          context,
        );
      case ASTType._ArrayExpression:
        return this._compileArrayExpression(ast as ExpressionNode, context);
      case ASTType._ObjectExpression:
        return this._compileObjectExpression(ast as ObjectNode, context);
      case ASTType._ThisExpression:
        return (scope) => (context ? { value: scope } : (scope as any)?.$proxy);
      case ASTType._LocalsExpression:
        return (scope, locals) => (context ? { value: locals } : locals);
      case ASTType._NGValueParameter:
        return (scope, locals, assign) =>
          context ? { value: assign } : assign;

      case ASTType._UpdateExpression: {
        return this._compileUpdateExpression(ast as ExpressionNode, context);
      }
    }

    throw new Error(`Unknown AST type ${ast._type}`);
  }

  /** @internal */
  _compileCallExpression(
    ast: ExpressionNode,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    const callArguments = ast._arguments || [];

    const args: CompiledExpressionFunction[] = [];

    for (let i = 0, l = callArguments.length; i < l; i++) {
      args.push(this._recurse(callArguments[i]));
    }

    if (ast._filter) {
      return this._compileFilterCall(ast, callArguments, args, context);
    }

    const callee = ast._callee!;

    const right = this._recurse(callee, true);

    if (!context && args.length === 2 && callee._type === ASTType._Identifier) {
      return this._compileIdentifierTwoArgCall(
        (callee as LiteralNode)._name!,
        callArguments,
        args,
      );
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
  _compileIdentifierTwoArgCall(
    calleeName: string,
    callArguments: ASTNode[],
    args: CompiledExpressionFunction[],
  ): CompiledExpressionFunction {
    const argPath0 = getNonComputedPath(callArguments[0]);

    const argPath1 = getNonComputedPath(callArguments[1]);

    if (argPath0?.length === 1 && argPath1?.length === 1) {
      const argName0 = argPath0[0];

      const argName1 = argPath1[0];

      return (scope, locals) => {
        const runtimeScope = scope as any;

        const base = runtimeScope?.$proxy ?? scope;

        if (!locals) {
          if (isNullOrUndefined(base)) {
            return undefined;
          }

          const calleeValue = (base as Record<string, any>)[calleeName];

          if (typeof calleeValue !== "function") {
            return undefined;
          }

          const value0 = (base as Record<string, any>)[argName0];

          const value1 = (base as Record<string, any>)[argName1];

          return calleeValue.call(
            base,
            typeof value0 === "function" ? value0() : value0,
            typeof value1 === "function" ? value1() : value1,
          );
        }

        const calleeBase =
          calleeName in locals ? (locals as Record<string, any>) : base;

        if (isNullOrUndefined(calleeBase)) {
          return undefined;
        }

        const calleeValue = (calleeBase as Record<string, any>)[calleeName];

        if (typeof calleeValue !== "function") {
          return undefined;
        }

        const argBase0 =
          argName0 in locals ? (locals as Record<string, any>) : base;

        const argBase1 =
          argName1 in locals ? (locals as Record<string, any>) : base;

        const value0 = argBase0?.[argName0];

        const value1 = argBase1?.[argName1];

        return calleeValue.call(
          calleeBase,
          typeof value0 === "function" ? value0() : value0,
          typeof value1 === "function" ? value1() : value1,
        );
      };
    }

    const arg0 = args[0];

    const arg1 = args[1];

    return (scope, locals, assign) => {
      const runtimeScope = scope as any;

      const base =
        locals && calleeName in locals
          ? (locals as Record<string, any>)
          : (runtimeScope?.$proxy ?? scope);

      if (isNullOrUndefined(base)) {
        return undefined;
      }

      const calleeValue = (base as Record<string, any>)[calleeName];

      if (typeof calleeValue !== "function") {
        return undefined;
      }

      const res0 = arg0(scope, locals, assign);

      const res1 = arg1(scope, locals, assign);

      return calleeValue.call(
        base,
        typeof res0 === "function" ? res0() : res0,
        typeof res1 === "function" ? res1() : res1,
      );
    };
  }

  /** @internal */
  _compileSmallCall(
    callee: CompiledExpressionFunction,
    arg: CompiledExpressionFunction | undefined,
    argCount: number,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    return argCount
      ? (scope, locals, assign) => {
          const rhs = callee(scope, locals, assign);

          let value: any;

          if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
            const res = arg!(scope, locals, assign);

            value = rhs.value.call(rhs.context, isFunction(res) ? res() : res);
          }

          return context ? { value } : value;
        }
      : (scope, locals, assign) => {
          const rhs = callee(scope, locals, assign);

          const value =
            !isNullOrUndefined(rhs.value) && isFunction(rhs.value)
              ? rhs.value.call(rhs.context)
              : undefined;

          return context ? { value } : value;
        };
  }

  /** @internal */
  _compileTwoArgCall(
    callee: CompiledExpressionFunction,
    arg0: CompiledExpressionFunction,
    arg1: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    if (!context) {
      return (scope, locals, assign) => {
        const rhs = callee(scope, locals, assign);

        if (isNullOrUndefined(rhs.value) || !isFunction(rhs.value)) {
          return undefined;
        }

        const res0 = arg0(scope, locals, assign);

        const res1 = arg1(scope, locals, assign);

        return rhs.value.call(
          rhs.context,
          isFunction(res0) ? res0() : res0,
          isFunction(res1) ? res1() : res1,
        );
      };
    }

    return (scope, locals, assign) => {
      const rhs = callee(scope, locals, assign);

      let value: any;

      if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
        const res0 = arg0(scope, locals, assign);

        const res1 = arg1(scope, locals, assign);

        value = rhs.value.call(
          rhs.context,
          isFunction(res0) ? res0() : res0,
          isFunction(res1) ? res1() : res1,
        );
      }

      return { value };
    };
  }

  /** @internal */
  _compileVariadicCall(
    callee: CompiledExpressionFunction,
    args: CompiledExpressionFunction[],
    context?: LinkContext,
  ): CompiledExpressionFunction {
    return (scope, locals, assign) => {
      const rhs = callee(scope, locals, assign);

      let value: any;

      if (!isNullOrUndefined(rhs.value) && isFunction(rhs.value)) {
        const values: any[] = [];

        for (let i = 0; i < args.length; ++i) {
          const res = args[i](scope, locals, assign);

          values.push(isFunction(res) ? res() : res);
        }
        value = rhs.value.apply(rhs.context, values);
      }

      return context ? { value } : value;
    };
  }

  /** @internal */
  _compileFilterCall(
    ast: ExpressionNode,
    callArguments: ASTNode[],
    args: CompiledExpressionFunction[],
    context?: LinkContext,
  ): CompiledExpressionFunction {
    const filter = this._$filter((ast._callee as LiteralNode)._name!);

    if (args.length === 1) {
      const arg0 = args[0];

      if (!context) {
        const argPath = getNonComputedPath(callArguments[0]);

        if (argPath?.length === 1) {
          const argName = argPath[0];

          return (scope, locals) => {
            const evalScope = scope && deProxy(scope);

            const runtimeScope = evalScope;

            const base =
              locals && argName in locals
                ? (locals as Record<string, any>)
                : (runtimeScope?.$proxy ?? evalScope);

            return filter(base?.[argName]);
          };
        }
      }

      return context
        ? (scope, locals, assign) => {
            const evalScope = scope && deProxy(scope);

            const value = () => filter(arg0(evalScope, locals, assign));

            return { context: undefined, name: undefined, value };
          }
        : (scope, locals, assign) =>
            filter(arg0(scope && deProxy(scope), locals, assign));
    }

    if (args.length === 2) {
      const arg0 = args[0];

      const arg1 = args[1];

      return context
        ? (scope, locals, assign) => {
            const evalScope = scope && deProxy(scope);

            const value = () =>
              filter(
                arg0(evalScope, locals, assign),
                arg1(evalScope, locals, assign),
              );

            return { context: undefined, name: undefined, value };
          }
        : (scope, locals, assign) => {
            const evalScope = scope && deProxy(scope);

            return filter(
              arg0(evalScope, locals, assign),
              arg1(evalScope, locals, assign),
            );
          };
    }

    return (scope, locals, assign) => {
      const values: any[] = [];

      const evalScope = scope && deProxy(scope);

      for (let i = 0; i < args.length; ++i) {
        const res = args[i](evalScope, locals, assign);

        values.push(res);
      }
      const value = () => {
        return (filter as (...args: any[]) => any)(...values);
      };

      return context ? { context: undefined, name: undefined, value } : value();
    };
  }

  /** @internal */
  _compileMemberExpression(
    ast: ExpressionNode,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    const left = this._recurse(ast._object!, false, !!create);

    if (ast._computed) {
      return this._computedMember(
        left,
        this._recurse(ast._property!),
        context,
        create,
      );
    }

    return this._nonComputedMember(
      left,
      (ast._property as LiteralNode)._name!,
      context,
      create,
    );
  }

  /** @internal */
  _compileAssignmentExpression(
    ast: ExpressionNode,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    const left = this._recurse(ast._left!, true, 1);

    const right = this._recurse(ast._right!);

    return (scope, locals, assign) => {
      const lhs = left(scope, locals, assign);

      const rhs = right(scope, locals, assign);

      const ctx = isProxy(lhs.context)
        ? lhs.context
        : (lhs.context.$proxy ?? lhs.context);

      ctx[lhs.name] = rhs;

      return context ? { value: rhs } : rhs;
    };
  }

  /** @internal */
  _compileArrayExpression(
    ast: ExpressionNode,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    const args: CompiledExpressionFunction[] = [];

    const elements = ast._elements || [];

    for (let i = 0, l = elements.length; i < l; i++) {
      args.push(this._recurse(elements[i]));
    }

    return (scope, locals, assign) => {
      const value: any[] = [];

      for (let i = 0; i < args.length; ++i) {
        value.push(args[i](scope, locals, assign));
      }

      return context ? { value } : value;
    };
  }

  /** @internal */
  _compileUpdateExpression(
    ast: ExpressionNode,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    const ref = this._recurse(ast._argument!, true, 1);

    const op = ast._operator as "++" | "--";

    const prefix = !!ast._prefix;

    return (scope, locals, assign) => {
      const lhs = ref(scope, locals, assign);

      if (!lhs || isNullOrUndefined(lhs.context)) {
        throw new Error(
          `${op} operand is not assignable (context is ${lhs?.context})`,
        );
      }

      const oldNum = Number(lhs.value);

      const newNum = op === "++" ? oldNum + 1 : oldNum - 1;

      const ctx = isProxy(lhs.context)
        ? lhs.context
        : (lhs.context.$proxy ?? lhs.context);

      ctx[lhs.name] = newNum;

      const out = prefix ? newNum : oldNum;

      return context ? { value: out } : out;
    };
  }

  /** @internal */
  _compileObjectExpression(
    ast: ObjectNode,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    const properties = (ast._properties || []) as ObjectPropertyNode[];

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
      const value: Record<string, any> = {};

      for (let i = 0; i < args.length; ++i) {
        const property = args[i];

        if (property.computed) {
          value[property.key(scope, locals, assign)] = property.value(
            scope,
            locals,
            assign,
          );
        } else {
          value[property.key] = property.value(scope, locals, assign);
        }
      }

      return context ? { value } : value;
    };
  }

  /** @internal */
  _compileSinglePropertyObject(
    property: ObjectPropertyNode,
  ): CompiledExpressionFunction {
    const key = getObjectPropertyKey(property);

    const value = this._recurse(property._value);

    return (scope, locals, assign) => {
      const object: Record<string, any> = {};

      object[key] = value(scope, locals, assign);

      return object;
    };
  }

  /** @internal */
  _compileSmallStaticObject(
    properties: ObjectPropertyNode[],
  ): CompiledExpressionFunction | undefined {
    const property0 = properties[0];

    const property1 = properties[1];

    const key0 = getObjectPropertyKey(property0);

    const key1 = getObjectPropertyKey(property1);

    if (properties.length === 2) {
      const value0 = this._recurse(property0._value);

      const value1 = this._recurse(property1._value);

      return (scope, locals, assign) => {
        const object: Record<string, any> = {};

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

    if (
      valuePath0?.length === 2 &&
      valuePath1?.length === 2 &&
      valuePath2?.length === 2 &&
      valuePath0[0] === valuePath1[0] &&
      valuePath0[0] === valuePath2[0]
    ) {
      return compileObjectPathProjection(
        key0,
        key1,
        key2,
        valuePath0,
        valuePath1,
        valuePath2,
      );
    }

    const value0 = this._recurse(property0._value);

    const value1 = this._recurse(property1._value);

    const value2 = this._recurse(property2._value);

    return (scope, locals, assign) => {
      const object: Record<string, any> = {};

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
  "unary+"(
    argument: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    return (scope, locals, assign) => {
      let arg = argument(scope, locals, assign);

      if (isDefined(arg)) {
        arg = +arg;
      } else {
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
  "unary-"(
    argument: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    return (scope, locals, assign) => {
      let arg = argument(scope, locals, assign);

      if (isDefined(arg)) {
        arg = -arg;
      } else {
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
  "unary!"(
    argument: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary+"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary-"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary*"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary/"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary%"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary==="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary!=="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary=="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary!="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary<"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary>"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary<="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary>="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "binary&&"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    if (!context) {
      return (scope, locals, assign) =>
        left(scope, locals, assign) && right(scope, locals, assign);
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
  "binary||"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
    if (!context) {
      return (scope, locals, assign) =>
        left(scope, locals, assign) || right(scope, locals, assign);
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
  "binary??"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  "ternary?:"(
    test: CompiledExpressionFunction,
    alternate: CompiledExpressionFunction,
    consequent: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction {
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
  _value(value: any, context?: LinkContext): CompiledExpressionFunction {
    return () =>
      context ? { context: undefined, name: undefined, value } : value;
  }

  /**
   * Returns the value of an identifier.
   * @param {string} name - The identifier name.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the identifier if it does not exist.
   *  @returns {CompiledExpressionFunction}  The function returning the identifier value.
   */
  /** @internal */
  _identifier(
    name: string,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    return (scope, locals) => {
      const runtimeScope = scope as any;

      const base =
        locals && name in locals ? locals : (runtimeScope?.$proxy ?? scope);

      if (create && create !== 1 && base && isNullOrUndefined(base[name])) {
        base[name] = {};
      }
      let value = undefined;

      if (base) {
        value = (base as Record<string, any>)[name];
      }

      if (context) {
        return { context: base, name, value };
      }

      return value;
    };
  }

  /** @internal */
  _path(path: string[]): CompiledExpressionFunction {
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
  _computedMember(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    return (scope, locals, assign) => {
      const lhs = left(scope, locals, assign);

      let rhs: string | undefined;

      let value: any;

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
  _nonComputedMember(
    left: CompiledExpressionFunction,
    right: string,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    if (!context && !create) {
      return (scope, locals, assign) => {
        const lhs = left(scope, locals, assign);

        return isNullOrUndefined(lhs) ? undefined : lhs[right];
      };
    }

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

function getNonComputedPath(ast: ASTNode): string[] | undefined {
  if (ast._type === ASTType._Identifier) {
    return [(ast as LiteralNode)._name!];
  }

  if (ast._type !== ASTType._MemberExpression || ast._computed) {
    return undefined;
  }

  const member = ast as ExpressionNode;

  const memberObject = member._object!;

  const memberProperty = (member._property as LiteralNode)._name!;

  if (memberObject._type === ASTType._Identifier) {
    return [(memberObject as LiteralNode)._name!, memberProperty];
  }

  const path: string[] = [];

  let node: ASTNode | undefined = ast;

  while (node?._type === ASTType._MemberExpression && !node._computed) {
    path.push(((node as ExpressionNode)._property as LiteralNode)._name!);
    node = (node as ExpressionNode)._object!;
  }

  if (node?._type !== ASTType._Identifier) {
    return undefined;
  }

  path.push((node as LiteralNode)._name!);

  path.reverse();

  return path;
}

function getObjectPropertyKey(property: ObjectPropertyNode): string {
  return property._key._type === ASTType._Identifier
    ? (property._key as LiteralNode)._name!
    : `${(property._key as LiteralNode)._value}`;
}

function isSmallStaticObject(properties: ObjectPropertyNode[]): boolean {
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

function compileObjectPathProjection(
  key0: string,
  key1: string,
  key2: string,
  valuePath0: string[],
  valuePath1: string[],
  valuePath2: string[],
): CompiledExpressionFunction {
  const sourceKey = valuePath0[0];

  const valueKey0 = valuePath0[1];

  const valueKey1 = valuePath1[1];

  const valueKey2 = valuePath2[1];

  return (scope, locals) => {
    const runtimeScope = scope as any;

    const base =
      locals && sourceKey in locals
        ? (locals as Record<string, any>)
        : (runtimeScope?.$proxy ?? scope);

    const source = base?.[sourceKey];

    const object: Record<string, any> = {};

    if (isNullOrUndefined(source)) {
      object[key0] = undefined;
      object[key1] = undefined;
      object[key2] = undefined;

      return object;
    }

    object[key0] = source[valueKey0];
    object[key1] = source[valueKey1];
    object[key2] = source[valueKey2];

    return object;
  };
}

function compileObjectProperties(
  interpreter: ASTInterpreter,
  properties: ObjectPropertyNode[],
): CompiledObjectProperty[] {
  const compiled: CompiledObjectProperty[] = [];

  for (let i = 0, l = properties.length; i < l; i++) {
    const property = properties[i];

    if (property._computed) {
      compiled.push({
        key: interpreter._recurse(property._key),
        computed: true,
        value: interpreter._recurse(property._value),
      });
    } else {
      compiled.push({
        key: getObjectPropertyKey(property),
        computed: false,
        value: interpreter._recurse(property._value),
      });
    }
  }

  return compiled;
}

type CompiledObjectProperty =
  | {
      computed: true;
      key: CompiledExpressionFunction;
      value: CompiledExpressionFunction;
    }
  | {
      computed: false;
      key: string;
      value: CompiledExpressionFunction;
    };

function createPathGetter(path: string[]): CompiledExpressionFunction {
  const p0 = path[0];

  switch (path.length) {
    case 1:
      return (scope, locals) => {
        const runtimeScope = scope as any;

        if (!locals) {
          const base = runtimeScope?.$proxy ?? scope;

          return base?.[p0];
        }

        const base =
          locals && p0 in locals
            ? (locals as Record<string, any>)
            : (runtimeScope?.$proxy ?? scope);

        return base?.[p0];
      };
    case 2: {
      const p1 = path[1];

      return (scope, locals) => {
        const runtimeScope = scope as any;

        if (!locals) {
          const base = runtimeScope?.$proxy ?? scope;

          const value = base?.[p0];

          return isNullOrUndefined(value) ? undefined : value[p1];
        }

        const base =
          locals && p0 in locals
            ? (locals as Record<string, any>)
            : (runtimeScope?.$proxy ?? scope);

        const value = base?.[p0];

        return isNullOrUndefined(value) ? undefined : value[p1];
      };
    }
    case 3: {
      const p1 = path[1];

      const p2 = path[2];

      return (scope, locals) => {
        const runtimeScope = scope as any;

        if (!locals) {
          const base = runtimeScope?.$proxy ?? scope;

          const value = base?.[p0];

          if (isNullOrUndefined(value)) {
            return undefined;
          }

          const next = value[p1];

          return isNullOrUndefined(next) ? undefined : next[p2];
        }

        const base =
          locals && p0 in locals
            ? (locals as Record<string, any>)
            : (runtimeScope?.$proxy ?? scope);

        const value = base?.[p0];

        if (isNullOrUndefined(value)) {
          return undefined;
        }

        const next = value[p1];

        return isNullOrUndefined(next) ? undefined : next[p2];
      };
    }
  }

  return (scope, locals) => {
    const runtimeScope = scope as any;

    const base =
      locals && p0 in locals
        ? (locals as Record<string, any>)
        : (runtimeScope?.$proxy ?? scope);

    let value = base?.[p0];

    for (let i = 1, l = path.length; i < l; i++) {
      if (isNullOrUndefined(value)) {
        return undefined;
      }

      value = value[path[i]];
    }

    return value;
  };
}

function getPathBinary(ast: ASTNode): CompiledExpressionFunction | undefined {
  const operator = ast._operator;

  if (operator !== "===" && operator !== "!==") {
    return undefined;
  }

  const leftPath = getNonComputedPath((ast as ExpressionNode)._left!);

  if (!leftPath) {
    return undefined;
  }

  const rightPath = getNonComputedPath((ast as ExpressionNode)._right!);

  if (!rightPath) {
    return undefined;
  }

  const left = createPathGetter(leftPath);

  const right = createPathGetter(rightPath);

  return operator === "==="
    ? (scope, locals) => left(scope, locals) === right(scope, locals)
    : (scope, locals) => left(scope, locals) !== right(scope, locals);
}

function getPathLogical(ast: ASTNode): CompiledExpressionFunction | undefined {
  const operator = ast._operator;

  if (operator !== "&&" && operator !== "||" && operator !== "??") {
    return undefined;
  }

  const leftPath = getNonComputedPath((ast as ExpressionNode)._left!);

  if (!leftPath) {
    return undefined;
  }

  const rightPath = getNonComputedPath((ast as ExpressionNode)._right!);

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
function findConstantAndWatchExpressions(
  ast: ASTNode,
  $filter: ng.FilterService,
  parentIsPure?: boolean | 1 | 2,
): WatchNode {
  let allConstants: boolean | undefined;

  let argsToWatch: ASTNode[] = [];

  let isFilter: boolean | undefined;

  const decoratedNode = ast as WatchNode;

  let decoratedLeft: WatchNode;

  let decoratedRight: WatchNode;

  let decoratedTest: WatchNode;

  let decoratedAlternate: WatchNode;

  let decoratedConsequent: WatchNode;

  let decoratedObject: WatchNode;

  let decoratedProperty: WatchNode | undefined;

  let decoratedKey: WatchNode;

  const astIsPure = (decoratedNode._isPure = !!isPure(ast, parentIsPure));

  switch (ast._type) {
    case ASTType._Program:
      allConstants = true;
      const body = (decoratedNode as BodyNode)._body;

      for (let i = 0, l = body.length; i < l; i++) {
        const expr = body[i];

        const decorated = findConstantAndWatchExpressions(
          (expr as ExpressionNode)._expression!,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && decorated._constant;
      }
      decoratedNode._constant = allConstants;

      return decoratedNode;
    case ASTType._Literal:
      decoratedNode._constant = true;
      decoratedNode._toWatch = [];

      return decoratedNode;
    case ASTType._UnaryExpression: {
      const decorated = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode)._argument!,
        $filter,
        astIsPure,
      );

      decoratedNode._constant = decorated._constant;
      decoratedNode._toWatch = decorated._toWatch || [];

      return decoratedNode;
    }
    case ASTType._BinaryExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode._left!,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode)._right!,
        $filter,
        astIsPure,
      );
      decoratedNode._constant =
        decoratedLeft._constant && decoratedRight._constant;
      argsToWatch = [];
      appendWatchNodes(argsToWatch, decoratedLeft._toWatch);
      appendWatchNodes(argsToWatch, decoratedRight._toWatch);
      decoratedNode._toWatch = argsToWatch;

      return decoratedNode;
    case ASTType._LogicalExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode._left!,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode)._right!,
        $filter,
        astIsPure,
      );
      decoratedNode._constant =
        decoratedLeft._constant && decoratedRight._constant;
      decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];

      return decoratedNode;
    case ASTType._ConditionalExpression:
      decoratedTest = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._test!,
        $filter,
        astIsPure,
      );
      decoratedAlternate = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._alternate!,
        $filter,
        astIsPure,
      );
      decoratedConsequent = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._consequent!,
        $filter,
        astIsPure,
      );
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
      decoratedObject = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._object!,
        $filter,
        astIsPure,
      );

      if ((ast as ExpressionNode)._computed) {
        decoratedProperty = findConstantAndWatchExpressions(
          (ast as ExpressionNode)._property!,
          $filter,
          astIsPure,
        );
      }
      decoratedNode._constant =
        decoratedObject._constant &&
        (!decoratedNode._computed || decoratedProperty?._constant);
      decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];

      return decoratedNode;
    case ASTType._CallExpression:
      isFilter = (ast as ExpressionNode)._filter;
      allConstants = isFilter;
      argsToWatch = [];
      const callArguments = (ast as ExpressionNode)._arguments || [];

      for (let i = 0, l = callArguments.length; i < l; i++) {
        const expr = callArguments[i];

        const decorated = findConstantAndWatchExpressions(
          expr,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && !!decorated._constant;
        appendWatchNodes(argsToWatch, decorated._toWatch);
      }
      decoratedNode._constant = allConstants;
      decoratedNode._toWatch = isFilter ? argsToWatch : [decoratedNode];

      return decoratedNode;
    case ASTType._AssignmentExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._left!,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._right!,
        $filter,
        astIsPure,
      );
      decoratedNode._constant =
        decoratedLeft._constant && decoratedRight._constant;
      decoratedNode._toWatch = [decoratedNode];

      return decoratedNode;
    case ASTType._ArrayExpression:
      allConstants = true;
      argsToWatch = [];
      const elements = (ast as ExpressionNode)._elements || [];

      for (let i = 0, l = elements.length; i < l; i++) {
        const expr = elements[i];

        const decorated = findConstantAndWatchExpressions(
          expr,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && !!decorated._constant;
        appendWatchNodes(argsToWatch, decorated._toWatch);
      }
      decoratedNode._constant = allConstants;
      decoratedNode._toWatch = argsToWatch;

      return decoratedNode;
    case ASTType._ObjectExpression:
      allConstants = true;
      argsToWatch = [];
      const properties = (ast as ObjectNode)._properties;

      for (let i = 0, l = properties.length; i < l; i++) {
        const property = properties[i] as ObjectPropertyNode;

        const decorated = findConstantAndWatchExpressions(
          property._value,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && !!decorated._constant;
        appendWatchNodes(argsToWatch, decorated._toWatch);

        if (property._computed) {
          // `{[key]: value}` implicitly does `key.toString()` which may be non-pure
          decoratedKey = findConstantAndWatchExpressions(
            property._key,
            $filter,
            false,
          );
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
      findConstantAndWatchExpressions(
        (ast as ExpressionNode)._argument!,
        $filter,
        false, // force impurity downwards
      );

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
function assignableAST(ast: BodyNode): ExpressionNode | undefined {
  const stmt = ast._body[0] as ExpressionNode;

  if (
    ast._body.length === 1 &&
    stmt?._expression &&
    isAssignable(stmt._expression)
  ) {
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
function plusFn(
  left: string | number,
  right: string | number,
): string | number {
  if (typeof left === "undefined" || isObject(left)) return right;

  if (typeof right === "undefined" || isObject(right)) return left;

  return (left as any) + (right as any);
}

/**
 *
 * @param {ASTNode[]} body
 * @returns {any}
 */
function getInputs(body: ASTNode[]): ASTNode[] | undefined {
  if (body.length !== 1) return undefined;
  const lastExpression = (body[0] as ExpressionNode)._expression;

  const candidate = (lastExpression as WatchNode)?._toWatch || [];

  if (candidate.length !== 1) return candidate;

  return candidate[0] !== lastExpression ? candidate : undefined;
}

/**
 * Detect nodes which could depend on non-shallow state of objects
 * @param {ASTNode} node
 * @param {boolean|PURITY_ABSOLUTE|PURITY_RELATIVE} [parentIsPure]
 * @returns {number|boolean}
 */
function isPure(
  node: ASTNode,
  parentIsPure?: boolean | typeof PURITY_ABSOLUTE | typeof PURITY_RELATIVE,
): number | boolean {
  switch (node._type) {
    // Computed members might invoke a stateful toString()
    case ASTType._MemberExpression:
      if ((node as ExpressionNode)._computed) {
        return false;
      }
      break;

    // Unary always convert to primitive
    case ASTType._UnaryExpression:
      return PURITY_ABSOLUTE;

    // The binary + operator can invoke a stateful toString().
    case ASTType._BinaryExpression:
      return (node as ExpressionNode)._operator !== "+"
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
function getStringValue(name: any): string {
  return `${name}`;
}

/**
 * @param {ASTNode} ast
 * @returns {boolean}
 */
export function isAssignable(ast: ASTNode): boolean {
  return (
    ast._type === ASTType._Identifier || ast._type === ASTType._MemberExpression
  );
}
