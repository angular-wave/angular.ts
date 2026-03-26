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
  _constant?: boolean;
  _toWatch?: ASTNode[];
  _isPure?: boolean;
  _input?: CompiledExpression;
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
  _compile(ast: ASTNode): CompiledExpression {
    const decoratedNode = findConstantAndWatchExpressions(ast, this._$filter);

    const { _body: body } = decoratedNode as BodyNode;

    const assignable = assignableAST(decoratedNode as BodyNode);

    let assign: CompiledExpressionFunction | undefined;

    if (assignable) {
      assign = /** @type {CompiledExpression} */ this._recurse(assignable);
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
        this._recurse((expression as ExpressionNode)._expression as ASTNode),
      );
    }

    const fnRaw =
      body.length === 0
        ? () => {
            /* empty */
          }
        : body.length === 1
          ? /** @type {CompiledExpression} */ expressions[0]
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
  _recurse(
    ast: ASTNode,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    let left!: CompiledExpressionFunction;

    let right:
      | string
      | CompiledExpressionFunction
      | ((...args: any[]) => any)
      | undefined;

    const self = this as unknown as ASTInterpreter &
      Record<string, (...args: any[]) => CompiledExpressionFunction>;

    let args: any[];

    switch (ast._type) {
      case ASTType._Literal:
        return this._value((ast as LiteralNode)._value, context);
      case ASTType._UnaryExpression:
        right = this._recurse((ast as ExpressionNode)._argument as ASTNode);

        return self[`unary${ast._operator}`](right, context);
      case ASTType._BinaryExpression:
        left = this._recurse((ast as ExpressionNode)._left as ASTNode);
        right = this._recurse((ast as ExpressionNode)._right as ASTNode);

        return self[`binary${ast._operator}`](left, right, context);
      case ASTType._LogicalExpression:
        left = this._recurse((ast as ExpressionNode)._left as ASTNode);
        right = this._recurse((ast as ExpressionNode)._right as ASTNode);

        return self[`binary${ast._operator}`](left, right, context);
      case ASTType._ConditionalExpression:
        return this["ternary?:"](
          this._recurse((ast as ExpressionNode)._test as ASTNode),
          this._recurse((ast as ExpressionNode)._alternate as ASTNode),
          this._recurse((ast as ExpressionNode)._consequent as ASTNode),
          context,
        );
      case ASTType._Identifier:
        return self._identifier(
          (ast as LiteralNode)._name as string,
          context,
          create,
        );
      case ASTType._MemberExpression:
        left = this._recurse(
          (ast as ExpressionNode)._object as ASTNode,
          false,
          !!create,
        );

        if (!ast._computed) {
          right = ((ast as ExpressionNode)._property as LiteralNode)._name;
        }

        if (ast._computed) {
          right = this._recurse((ast as ExpressionNode)._property as ASTNode);
        }

        return ast._computed
          ? this._computedMember(
              left,
              right as CompiledExpressionFunction,
              context,
              create,
            )
          : this._nonComputedMember(left, right as string, context, create);
      case ASTType._CallExpression:
        args = [];
        const callArguments = (ast as ExpressionNode)._arguments as ASTNode[];

        for (let i = 0, l = callArguments.length; i < l; i++) {
          const expr = callArguments[i];

          args.push(self._recurse(expr));
        }

        if ((ast as ExpressionNode)._filter)
          right = this._$filter(
            ((ast as ExpressionNode)._callee as LiteralNode)._name as string,
          );

        if (!(ast as ExpressionNode)._filter) {
          right = this._recurse(
            (ast as ExpressionNode)._callee as ASTNode,
            true,
          );
        }

        return (ast as ExpressionNode)._filter
          ? (scope, locals, assign) => {
              const values: any[] = [];

              for (let i = 0; i < args.length; ++i) {
                const res = args[i](scope && deProxy(scope), locals, assign);

                values.push(res);
              }
              const value = () => {
                return (right as Function).apply(undefined, values);
              };

              return context
                ? { context: undefined, name: undefined, value }
                : value();
            }
          : (scope, locals, assign) => {
              const runtimeScope = scope as any;

              const rhs = (right as Function)(
                runtimeScope?.$target ? runtimeScope.$target : scope,
                locals,
                assign,
              );

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
      case ASTType._AssignmentExpression:
        left = this._recurse((ast as ExpressionNode)._left as ASTNode, true, 1);
        right = this._recurse((ast as ExpressionNode)._right as ASTNode);

        return (scope, locals, assign) => {
          const lhs = left(scope, locals, assign);

          const rhs = (right as Function)(scope, locals, assign);

          // lhs.context[lhs.name] = rhs;
          const ctx = isProxy(lhs.context)
            ? lhs.context
            : (lhs.context.$proxy ?? lhs.context);

          ctx[lhs.name] = rhs;

          return context ? { value: rhs } : rhs;
        };
      case ASTType._ArrayExpression:
        args = [];
        const elements = (ast as ExpressionNode)._elements || [];

        for (let i = 0, l = elements.length; i < l; i++) {
          const expr = elements[i] as ASTNode;

          args.push(self._recurse(expr));
        }

        return (scope, locals, assign) => {
          const value: any[] = [];

          for (let i = 0; i < args.length; ++i) {
            value.push(args[i](scope, locals, assign));
          }

          return context ? { value } : value;
        };
      case ASTType._ObjectExpression:
        args = [];
        const properties = ((ast as ObjectNode)._properties ||
          []) as ObjectPropertyNode[];

        for (let i = 0, l = properties.length; i < l; i++) {
          const property = properties[i];

          if (property._computed) {
            args.push({
              key: self._recurse(property._key as ASTNode),
              computed: true,
              value: self._recurse(property._value as ASTNode),
            });
          } else {
            args.push({
              key:
                (property._key as ASTNode)._type === ASTType._Identifier
                  ? (property._key as LiteralNode)._name
                  : `${(property._key as LiteralNode)._value}`,
              computed: false,
              value: self._recurse(property._value as ASTNode),
            });
          }
        }

        return (scope, locals, assign) => {
          const value: Record<string, any> = {};

          for (let i = 0; i < args.length; ++i) {
            const property = args[i] as any;

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
      case ASTType._ThisExpression:
        return (scope) => (context ? { value: scope } : (scope as any)?.$proxy);
      case ASTType._LocalsExpression:
        return (scope, locals) => (context ? { value: locals } : locals);
      case ASTType._NGValueParameter:
        return (scope, locals, assign) =>
          context ? { value: assign } : assign;

      case ASTType._UpdateExpression: {
        // Must be assignable: Identifier or MemberExpression
        // Reuse the "context mode" lvalue resolver that returns { context, name, value }
        const ref = this._recurse(
          (ast as ExpressionNode)._argument as ASTNode,
          true,
          1,
        );

        const op = /** @type {"++"|"--"} */ ast._operator;

        const prefix = !!ast._prefix;

        return (scope, locals, assign) => {
          const lhs = ref(scope, locals, assign);

          // No place to assign -> behave like JS (throw) rather than silently no-op
          if (!lhs || isNullOrUndefined(lhs.context)) {
            throw new Error(
              `${op} operand is not assignable (context is ${lhs?.context})`,
            );
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
  _identifier(
    name: string,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
    return (scope, locals) => {
      const runtimeScope = scope as any;

      const base =
        locals && name in locals
          ? locals
          : ((runtimeScope && runtimeScope.$proxy) ?? scope);

      if (create && create !== 1 && base && isNullOrUndefined(base[name])) {
        base[name] = {};
      }
      let value = undefined;

      if (base) {
        value = /** @type {Record<string, any>} */ deProxy(base)[name];
      }

      if (context) {
        return { context: base, name, value };
      }

      return value;
    };
  }

  /**
   * Returns the value of a computed member expression.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the member if it does not exist.
   * @returns {CompiledExpressionFunction}  The function returning the computed member value.
   */
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
  _nonComputedMember(
    left: CompiledExpressionFunction,
    right: string,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction {
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
          (expr as ExpressionNode)._expression as ASTNode,
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
        (decoratedNode as ExpressionNode)._argument as ASTNode,
        $filter,
        astIsPure,
      );

      decoratedNode._constant = decorated._constant;
      decoratedNode._toWatch = decorated._toWatch || [];

      return decoratedNode;
    }
    case ASTType._BinaryExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode._left as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode)._right as ASTNode,
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
        decoratedNode._left as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode)._right as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedNode._constant =
        decoratedLeft._constant && decoratedRight._constant;
      decoratedNode._toWatch = decoratedNode._constant ? [] : [ast];

      return decoratedNode;
    case ASTType._ConditionalExpression:
      decoratedTest = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._test as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedAlternate = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._alternate as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedConsequent = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._consequent as ASTNode,
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
        (ast as ExpressionNode)._object as ASTNode,
        $filter,
        astIsPure,
      );

      if (/** @type {ExpressionNode} */ ast._computed) {
        decoratedProperty = findConstantAndWatchExpressions(
          (ast as ExpressionNode)._property as ASTNode,
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
        (ast as ExpressionNode)._left as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (ast as ExpressionNode)._right as ASTNode,
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
        const expr = elements[i] as ASTNode;

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
        (ast as ExpressionNode)._argument as ASTNode,
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
      if (/** @type {ExpressionNode} */ node._computed) {
        return false;
      }
      break;

    // Unary always convert to primitive
    case ASTType._UnaryExpression:
      return PURITY_ABSOLUTE;

    // The binary + operator can invoke a stateful toString().
    case ASTType._BinaryExpression:
      return /** @type {ExpressionNode} */ node._operator !== "+"
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
