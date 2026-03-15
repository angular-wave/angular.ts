import {
  deProxy,
  entries,
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
} from "./interface.ts";

export const PURITY_ABSOLUTE = 1;
export const PURITY_RELATIVE = 2;

type LinkContext = object | boolean | undefined;
type CreateFlag = boolean | 1 | undefined;
type WatchNode = ASTNode & {
  constant?: boolean;
  toWatch?: ASTNode[];
  isPure?: boolean;
  input?: CompiledExpression;
  watchId?: string;
};

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
  compile(ast: ASTNode): CompiledExpression {
    const decoratedNode = findConstantAndWatchExpressions(ast, this._$filter);

    const { body } = decoratedNode as BodyNode;

    const assignable = assignableAST(decoratedNode as BodyNode);

    let assign: CompiledExpressionFunction | undefined;

    if (assignable) {
      assign = /** @type {CompiledExpression} */ this._recurse(assignable);
    }

    const toWatch = getInputs(body);

    let inputs: CompiledExpression[] | undefined;

    if (toWatch) {
      inputs = [];

      for (const [key, watch] of entries(toWatch) as [string, WatchNode][]) {
        const input = this._recurse(watch) as CompiledExpression;

        watch.input = input;
        inputs.push(input);
        watch.watchId = key;
      }
    }
    const expressions: CompiledExpressionFunction[] = [];

    body.forEach((expression) => {
      expressions.push(
        this._recurse((expression as ExpressionNode).expression as ASTNode),
      );
    });

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

    switch (ast.type) {
      case ASTType._Literal:
        return this.value((ast as LiteralNode).value, context);
      case ASTType._UnaryExpression:
        right = this._recurse((ast as ExpressionNode).argument as ASTNode);

        return self[`unary${ast.operator}`](right, context);
      case ASTType._BinaryExpression:
        left = this._recurse((ast as ExpressionNode).left as ASTNode);
        right = this._recurse((ast as ExpressionNode).right as ASTNode);

        return self[`binary${ast.operator}`](left, right, context);
      case ASTType._LogicalExpression:
        left = this._recurse((ast as ExpressionNode).left as ASTNode);
        right = this._recurse((ast as ExpressionNode).right as ASTNode);

        return self[`binary${ast.operator}`](left, right, context);
      case ASTType._ConditionalExpression:
        return this["ternary?:"](
          this._recurse((ast as ExpressionNode).test as ASTNode),
          this._recurse((ast as ExpressionNode).alternate as ASTNode),
          this._recurse((ast as ExpressionNode).consequent as ASTNode),
          context,
        );
      case ASTType._Identifier:
        return self.identifier(
          (ast as LiteralNode).name as string,
          context,
          create,
        );
      case ASTType._MemberExpression:
        left = this._recurse(
          (ast as ExpressionNode).object as ASTNode,
          false,
          !!create,
        );

        if (!ast.computed) {
          right = ((ast as ExpressionNode).property as LiteralNode).name;
        }

        if (ast.computed) {
          right = this._recurse((ast as ExpressionNode).property as ASTNode);
        }

        return ast.computed
          ? this._computedMember(
              left,
              right as CompiledExpressionFunction,
              context,
              create,
            )
          : this.nonComputedMember(left, right as string, context, create);
      case ASTType._CallExpression:
        args = [];
        ((ast as ExpressionNode).arguments as ASTNode[]).forEach((expr) => {
          args.push(self._recurse(expr));
        });

        if ((ast as ExpressionNode).filter)
          right = this._$filter(
            ((ast as ExpressionNode).callee as LiteralNode).name as string,
          );

        if (!(ast as ExpressionNode).filter) {
          right = this._recurse(
            (ast as ExpressionNode).callee as ASTNode,
            true,
          );
        }

        return (ast as ExpressionNode).filter
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
        left = this._recurse((ast as ExpressionNode).left as ASTNode, true, 1);
        right = this._recurse((ast as ExpressionNode).right as ASTNode);

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
        ((ast as ExpressionNode).elements || []).forEach((expr: ASTNode) => {
          args.push(self._recurse(expr));
        });

        return (scope, locals, assign) => {
          const value: any[] = [];

          for (let i = 0; i < args.length; ++i) {
            value.push(args[i](scope, locals, assign));
          }

          return context ? { value } : value;
        };
      case ASTType._ObjectExpression:
        args = [];
        (
          ((ast as ObjectNode).properties || []) as ObjectPropertyNode[]
        ).forEach((property: ObjectPropertyNode) => {
          if (property.computed) {
            args.push({
              key: self._recurse(property.key as ASTNode),
              computed: true,
              value: self._recurse(property.value as ASTNode),
            });
          } else {
            args.push({
              key:
                (property.key as ASTNode).type === ASTType._Identifier
                  ? (property.key as LiteralNode).name
                  : `${(property.key as LiteralNode).value}`,
              computed: false,
              value: self._recurse(property.value as ASTNode),
            });
          }
        });

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
          (ast as ExpressionNode).argument as ASTNode,
          true,
          1,
        );

        const op = /** @type {"++"|"--"} */ ast.operator;

        const prefix = !!ast.prefix;

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

    throw new Error(`Unknown AST type ${ast.type}`);
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
  value(value: any, context?: LinkContext): CompiledExpressionFunction {
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
  identifier(
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
  nonComputedMember(
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

  const astIsPure = (decoratedNode.isPure = !!isPure(ast, parentIsPure));

  switch (ast.type) {
    case ASTType._Program:
      allConstants = true;
      (decoratedNode as BodyNode).body.forEach((expr) => {
        const decorated = findConstantAndWatchExpressions(
          (expr as ExpressionNode).expression as ASTNode,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && decorated.constant;
      });
      decoratedNode.constant = allConstants;

      return decoratedNode;
    case ASTType._Literal:
      decoratedNode.constant = true;
      decoratedNode.toWatch = [];

      return decoratedNode;
    case ASTType._UnaryExpression: {
      const decorated = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode).argument as ASTNode,
        $filter,
        astIsPure,
      );

      decoratedNode.constant = decorated.constant;
      decoratedNode.toWatch = decorated.toWatch || [];

      return decoratedNode;
    }
    case ASTType._BinaryExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode.left as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode).right as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = (decoratedLeft.toWatch || []).concat(
        decoratedRight.toWatch || [],
      );

      return decoratedNode;
    case ASTType._LogicalExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        decoratedNode.left as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (decoratedNode as ExpressionNode).right as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];

      return decoratedNode;
    case ASTType._ConditionalExpression:
      decoratedTest = findConstantAndWatchExpressions(
        (ast as ExpressionNode).test as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedAlternate = findConstantAndWatchExpressions(
        (ast as ExpressionNode).alternate as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedConsequent = findConstantAndWatchExpressions(
        (ast as ExpressionNode).consequent as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedTest.constant &&
        decoratedAlternate.constant &&
        decoratedConsequent.constant;
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];

      return decoratedNode;
    case ASTType._Identifier:
      decoratedNode.constant = false;
      decoratedNode.toWatch = [ast];

      return decoratedNode;
    case ASTType._MemberExpression:
      decoratedObject = findConstantAndWatchExpressions(
        (ast as ExpressionNode).object as ASTNode,
        $filter,
        astIsPure,
      );

      if (/** @type {ExpressionNode} */ ast.computed) {
        decoratedProperty = findConstantAndWatchExpressions(
          (ast as ExpressionNode).property as ASTNode,
          $filter,
          astIsPure,
        );
      }
      decoratedNode.constant =
        decoratedObject.constant &&
        (!decoratedNode.computed || decoratedProperty?.constant);
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];

      return decoratedNode;
    case ASTType._CallExpression:
      isFilter = (ast as ExpressionNode).filter;
      allConstants = isFilter;
      argsToWatch = [];
      ((ast as ExpressionNode).arguments || []).forEach((expr) => {
        const decorated = findConstantAndWatchExpressions(
          expr,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && !!decorated.constant;
        argsToWatch.push(...(decorated.toWatch || []));
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = isFilter ? argsToWatch : [decoratedNode];

      return decoratedNode;
    case ASTType._AssignmentExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        (ast as ExpressionNode).left as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        (ast as ExpressionNode).right as ASTNode,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = [decoratedNode];

      return decoratedNode;
    case ASTType._ArrayExpression:
      allConstants = true;
      argsToWatch = [];
      ((ast as ExpressionNode).elements || []).forEach((expr: ASTNode) => {
        const decorated = findConstantAndWatchExpressions(
          expr,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && !!decorated.constant;
        argsToWatch.push(...(decorated.toWatch || []));
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = argsToWatch;

      return decoratedNode;
    case ASTType._ObjectExpression:
      allConstants = true;
      argsToWatch = [];
      (ast as ObjectNode).properties.forEach((property) => {
        const decorated = findConstantAndWatchExpressions(
          (property as ObjectPropertyNode).value,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && !!decorated.constant;
        argsToWatch.push(...(decorated.toWatch || []));

        if ((property as ObjectPropertyNode).computed) {
          // `{[key]: value}` implicitly does `key.toString()` which may be non-pure
          decoratedKey = findConstantAndWatchExpressions(
            (property as ObjectPropertyNode).key,
            $filter,
            false,
          );
          allConstants = allConstants && !!decoratedKey.constant;
          argsToWatch.push(...(decoratedKey.toWatch || []));
        }
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = argsToWatch;

      return decoratedNode;
    case ASTType._ThisExpression:
      decoratedNode.constant = false;
      decoratedNode.toWatch = [];

      return decoratedNode;
    case ASTType._LocalsExpression:
      decoratedNode.constant = false;
      decoratedNode.toWatch = [];

      return decoratedNode;
    case ASTType._UpdateExpression: {
      // side-effectful, not constant
      findConstantAndWatchExpressions(
        (ast as ExpressionNode).argument as ASTNode,
        $filter,
        false, // force impurity downwards
      );

      decoratedNode.constant = false;
      decoratedNode.toWatch = [decoratedNode]; // treat like assignment: watch the expression

      return decoratedNode;
    }
    default:
      throw new Error(`Unknown AST node type: ${ast.type}`);
  }
}

/**
 * Converts a single expression AST node into an assignment expression if the expression is assignable.
 *
 * @param {import("./ast/ast-node.ts").BodyNode} ast
 * @returns {import("./ast/ast-node.ts").ExpressionNode | undefined}
 */
function assignableAST(ast: BodyNode): ExpressionNode | undefined {
  const stmt = ast.body[0] as ExpressionNode;

  if (
    ast.body.length === 1 &&
    stmt?.expression &&
    isAssignable(stmt.expression)
  ) {
    return {
      type: ASTType._AssignmentExpression,
      left: stmt.expression, // left-hand side is an expression
      right: { type: ASTType._NGValueParameter }, // right-hand side leaf expression
      operator: "=",
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
  const lastExpression = (body[0] as ExpressionNode).expression;
  const candidate = (lastExpression as WatchNode)?.toWatch || [];

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
  switch (node.type) {
    // Computed members might invoke a stateful toString()
    case ASTType._MemberExpression:
      if (/** @type {ExpressionNode} */ node.computed) {
        return false;
      }
      break;

    // Unary always convert to primitive
    case ASTType._UnaryExpression:
      return PURITY_ABSOLUTE;

    // The binary + operator can invoke a stateful toString().
    case ASTType._BinaryExpression:
      return /** @type {ExpressionNode} */ node.operator !== "+"
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
 * @param {import("./ast/ast").ASTNode} ast
 * @returns {boolean}
 */
export function isAssignable(ast: ASTNode): boolean {
  return (
    ast.type === ASTType._Identifier || ast.type === ASTType._MemberExpression
  );
}
