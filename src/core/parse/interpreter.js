import {
  deProxy,
  entries,
  isDefined,
  isFunction,
  isNullOrUndefined,
  isObject,
  isProxy,
} from "../../shared/utils.js";
import { ASTType } from "./ast-type.js";

/** @typedef {import("./ast/ast-node.ts").ASTNode} ASTNode */
/** @typedef {import("./ast/ast-node.ts").BodyNode} BodyNode */
/** @typedef {import("./ast/ast-node.ts").ExpressionNode} ExpressionNode */
/** @typedef {import("./ast/ast-node.ts").ArrayNode} ArrayNode */
/** @typedef {import("./ast/ast-node.ts").LiteralNode} LiteralNode */
/** @typedef {import("./ast/ast-node.ts").ObjectNode} ObjectNode */
/** @typedef {import("./ast/ast-node.ts").ObjectPropertyNode} ObjectPropertyNode */
/** @typedef {import("./interface.ts").CompiledExpression} CompiledExpression */
/** @typedef {import("./interface.ts").CompiledExpressionFunction} CompiledExpressionFunction */

export const PURITY_ABSOLUTE = 1;
export const PURITY_RELATIVE = 2;

export class ASTInterpreter {
  /**
   * @param {ng.FilterService} $filter
   */
  constructor($filter) {
    /** @type {ng.FilterService} */
    this._$filter = $filter;
  }

  /**
   * Compiles the AST into a function.
   * @param {ASTNode} ast - The AST to compile.
   * @returns {CompiledExpression}
   */
  compile(ast) {
    const decoratedNode = findConstantAndWatchExpressions(ast, this._$filter);

    const { body } = /** @type {BodyNode} */ (decoratedNode);

    /** @type {ASTNode} */
    const assignable = assignableAST(/** @type {BodyNode} */ (decoratedNode));

    /** @type {import("./interface.ts").CompiledExpression} */
    let assign;

    if (assignable) {
      assign = /** @type {import("./interface.ts").CompiledExpression} */ (
        this.#recurse(assignable)
      );
    }

    const toWatch = getInputs(body);

    let inputs;

    if (toWatch) {
      inputs = [];

      for (const [key, watch] of entries(toWatch)) {
        const input =
          /** @type {import("./interface.ts").CompiledExpression} */ (
            this.#recurse(watch)
          );

        watch.input = input;
        inputs.push(input);
        watch.watchId = key;
      }
    }
    /**
     * @type {import("./interface.ts").CompiledExpressionFunction[]}
     */
    const expressions = [];

    body.forEach(
      /** @param {ExpressionNode} expression */ (expression) => {
        expressions.push(this.#recurse(expression.expression));
      },
    );

    /** @type {import("./interface.ts").CompiledExpression} */
    // @ts-ignore
    const fn =
      body.length === 0
        ? () => {
            /* empty */
          }
        : body.length === 1
          ? /** @type {import("./interface.ts").CompiledExpression} */ (
              expressions[0]
            )
          : function (scope, locals) {
              let lastValue;

              for (let i = 0, j = expressions.length; i < j; i++) {
                lastValue = expressions[i](scope, locals);
              }

              return lastValue;
            };

    if (assign) {
      fn._assign = (scope, value, locals) => assign(scope, locals, value);
    }

    if (inputs) {
      fn._inputs = inputs;
    }
    fn._decoratedNode = /** @type {BodyNode} */ (decoratedNode);

    return fn;
  }

  /**
   * Recurses the AST nodes.
   * @param {ExpressionNode & LiteralNode} ast - The AST node.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - The create flag.
   * @returns {import("./interface.ts").CompiledExpressionFunction} The recursive function.
   */
  #recurse(ast, context, create) {
    let left;

    let right;

    const self = this;

    let args;

    switch (ast.type) {
      case ASTType._Literal:
        return this.value(ast.value, context);
      case ASTType._UnaryExpression:
        right = this.#recurse(ast.argument);

        return this[`unary${ast.operator}`](right, context);
      case ASTType._BinaryExpression:
        left = this.#recurse(ast.left);
        right = this.#recurse(ast.right);

        return this[`binary${ast.operator}`](left, right, context);
      case ASTType._LogicalExpression:
        left = this.#recurse(ast.left);
        right = this.#recurse(ast.right);

        return this[`binary${ast.operator}`](left, right, context);
      case ASTType._ConditionalExpression:
        return /** @type {import("./interface.ts").CompiledExpressionFunction} */ (
          this["ternary?:"](
            this.#recurse(ast.test),
            this.#recurse(ast.alternate),
            this.#recurse(ast.consequent),
            context,
          )
        );
      case ASTType._Identifier:
        return self.identifier(ast.name, context, create);
      case ASTType._MemberExpression:
        left = this.#recurse(ast.object, false, !!create);

        if (!ast.computed) {
          right = /** @type {LiteralNode} */ (ast.property).name;
        }

        if (ast.computed) right = this.#recurse(ast.property);

        return /** @type {import("./interface.ts").CompiledExpressionFunction} */ (
          ast.computed
            ? this.#computedMember(
                left,
                /** @type {function } */ (right),
                context,
                create,
              )
            : this.nonComputedMember(
                left,
                /** @type {string } */ (right),
                context,
                create,
              )
        );
      case ASTType._CallExpression:
        args = [];
        /** @type {ExpressionNode} */ (ast).arguments.forEach((expr) => {
          args.push(self.#recurse(expr));
        });

        if (/** @type {ExpressionNode} */ (ast).filter)
          right = this._$filter(
            /** @type {LiteralNode} */ (
              /** @type {ExpressionNode} */ (ast).callee
            ).name,
          );

        if (!(/** @type {ExpressionNode} */ (ast).filter))
          right = this.#recurse(
            /** @type {ExpressionNode} */ (ast).callee,
            true,
          );

        return ast.filter
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
              const rhs = right(
                /** @type {ng.Scope} */ (scope).$target
                  ? /** @type {ng.Scope} */ (scope).$target
                  : scope,
                locals,
                assign,
              );

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
        left = this.#recurse(ast.left, true, 1);
        right = this.#recurse(ast.right);

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
        /** @type {ArrayNode} */ (ast).elements.forEach((expr) => {
          args.push(self.#recurse(expr));
        });

        return (scope, locals, assign) => {
          const value = [];

          for (let i = 0; i < args.length; ++i) {
            value.push(args[i](scope, locals, assign));
          }

          return context ? { value } : value;
        };
      case ASTType._ObjectExpression:
        args = [];
        /** @type {ObjectNode} */ (ast).properties.forEach(
          /** @param {ObjectPropertyNode} property */ (property) => {
            if (property.computed) {
              args.push({
                key: self.#recurse(property.key),
                computed: true,
                value: self.#recurse(property.value),
              });
            } else {
              args.push({
                key:
                  property.key.type === ASTType._Identifier
                    ? /** @type {LiteralNode} */ (property.key).name
                    : `${/** @type {LiteralNode} */ (property.key).value}`,
                computed: false,
                value: self.#recurse(property.value),
              });
            }
          },
        );

        return (scope, locals, assign) => {
          const value = {};

          for (let i = 0; i < args.length; ++i) {
            if (args[i].computed) {
              value[args[i].key(scope, locals, assign)] = args[i].value(
                scope,
                locals,
                assign,
              );
            } else {
              value[args[i].key] = args[i].value(scope, locals, assign);
            }
          }

          return context ? { value } : value;
        };
      case ASTType._ThisExpression:
        return (scope) =>
          context ? { value: scope } : /** @type {ng.Scope} */ (scope).$proxy;
      case ASTType._LocalsExpression:
        return (scope, locals) => (context ? { value: locals } : locals);
      case ASTType._NGValueParameter:
        return (scope, locals, assign) =>
          context ? { value: assign } : assign;
    }

    return undefined;
  }

  /**
   * Unary plus operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {function} The unary plus function.
   */
  "unary+"(argument, context) {
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
   * @returns {function} The unary minus function.
   */
  "unary-"(argument, context) {
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
   * @returns {function} The unary negation function.
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
   * @returns {function} The binary plus function.
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
   * @returns {function} The binary minus function.
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
   * @returns {function} The binary multiplication function.
   */
  "binary*"(left, right, context) {
    return (scope, locals, assign) => {
      const arg = left(scope, locals, assign) * right(scope, locals, assign);

      return context ? { value: arg } : arg;
    };
  }

  "binary/"(left, right, context) {
    return (scope, locals, assign) => {
      const arg = left(scope, locals, assign) / right(scope, locals, assign);

      return context ? { value: arg } : arg;
    };
  }

  /**
   * Binary division operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {function} The binary division function.
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
   * @returns {function} The binary strict equality function.
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
   * @returns {function} The binary strict inequality function.
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
   * @returns {function} The binary equality function.
   */
  "binary=="(left, right, context) {
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
   * @returns {function} The binary inequality function.
   */
  "binary!="(left, right, context) {
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
   * @returns {function} The binary less-than function.
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
   * @returns {function} The binary greater-than function.
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
   * @returns {function} The binary less-than-or-equal-to function.
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
   * @returns {function} The binary greater-than-or-equal-to function.
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
   * @returns {function} The binary logical AND function.
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
   * @returns {function} The binary logical OR function.
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
   * @returns {function} The ternary conditional function.
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
   * @returns {import("./interface.ts").CompiledExpressionFunction} The function returning the literal value.
   */
  value(value, context) {
    return () =>
      context ? { context: undefined, name: undefined, value } : value;
  }

  /**
   * Returns the value of an identifier.
   * @param {string} name - The identifier name.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the identifier if it does not exist.
   * @returns {import("./interface.ts").CompiledExpressionFunction} The function returning the identifier value.
   */
  identifier(name, context, create) {
    return (scope, locals) => {
      /** @type {ng.Scope | unknown} */
      const base =
        locals && name in locals
          ? locals
          : ((scope && /** @type {ng.Scope} */ (scope).$proxy) ?? scope);

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

  /**
   * Returns the value of a computed member expression.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the member if it does not exist.
   * @returns {function} The function returning the computed member value.
   */
  #computedMember(left, right, context, create) {
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
   * @returns {function} The function returning the non-computed member value.
   */
  nonComputedMember(left, right, context, create) {
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
function findConstantAndWatchExpressions(ast, $filter, parentIsPure) {
  let allConstants;

  let argsToWatch;

  let isFilter;

  const decoratedNode = /** @type  {BodyNode & ExpressionNode} */ (ast);

  let decoratedLeft,
    decoratedRight,
    decoratedTest,
    decoratedAlternate,
    decoratedConsequent,
    decoratedObject,
    decoratedProperty,
    decoratedKey;

  const astIsPure = (decoratedNode.isPure = !!isPure(ast, parentIsPure));

  switch (ast.type) {
    case ASTType._Program:
      allConstants = true;
      /** @type {import("./ast/ast-node.ts").BodyNode} */ (
        decoratedNode
      ).body.forEach((expr) => {
        const decorated = findConstantAndWatchExpressions(
          /** @type {import("./ast/ast-node.ts").ExpressionStatementNode} */ (
            expr
          ).expression,
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
      /** @type {BodyNode} */
      const decorated = /** @type {BodyNode} */ (
        findConstantAndWatchExpressions(
          decoratedNode.argument,
          $filter,
          astIsPure,
        )
      );

      decoratedNode.constant = decorated.constant;
      decoratedNode.toWatch = decorated.toWatch || [];

      return decoratedNode;
    }
    case ASTType._BinaryExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        /** @type {ASTNode} */ (decoratedNode.left),
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        decoratedNode.right,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = /** @type {ASTNode[]} */ (
        /** @type {BodyNode} */ (decoratedLeft).toWatch.concat(
          /** @type {BodyNode} */ (decoratedRight).toWatch,
        )
      );

      return decoratedNode;
    case ASTType._LogicalExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        /** @type {ASTNode} */ (decoratedNode.left),
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        decoratedNode.right,
        $filter,
        astIsPure,
      );
      decoratedNode.constant =
        decoratedLeft.constant && decoratedRight.constant;
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];

      return decoratedNode;
    case ASTType._ConditionalExpression:
      decoratedTest = findConstantAndWatchExpressions(
        /** @type {ExpressionNode} */ (ast).test,
        $filter,
        astIsPure,
      );
      decoratedAlternate = findConstantAndWatchExpressions(
        /** @type {ExpressionNode} */ (ast).alternate,
        $filter,
        astIsPure,
      );
      decoratedConsequent = findConstantAndWatchExpressions(
        /** @type {ExpressionNode} */ (ast).consequent,
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
        /** @type {ExpressionNode} */ (ast).object,
        $filter,
        astIsPure,
      );

      if (/** @type {ExpressionNode} */ (ast).computed) {
        decoratedProperty = findConstantAndWatchExpressions(
          /** @type {ExpressionNode} */ (ast).property,
          $filter,
          astIsPure,
        );
      }
      decoratedNode.constant =
        decoratedObject.constant &&
        (!decoratedNode.computed || decoratedProperty.constant);
      decoratedNode.toWatch = decoratedNode.constant ? [] : [ast];

      return decoratedNode;
    case ASTType._CallExpression:
      isFilter = /** @type {ExpressionNode} */ (ast).filter;
      allConstants = isFilter;
      argsToWatch = [];
      /** @type {ExpressionNode} */ (ast).arguments.forEach((expr) => {
        const decorated = findConstantAndWatchExpressions(
          expr,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && decorated.constant;
        argsToWatch.push.apply(
          argsToWatch,
          /** @type {BodyNode} */ (decorated).toWatch,
        );
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = isFilter ? argsToWatch : [decoratedNode];

      return decoratedNode;
    case ASTType._AssignmentExpression:
      decoratedLeft = findConstantAndWatchExpressions(
        /** @type {ASTNode} */ (/** @type {ExpressionNode} */ (ast).left),
        $filter,
        astIsPure,
      );
      decoratedRight = findConstantAndWatchExpressions(
        /** @type {ASTNode} */ (/** @type {ExpressionNode} */ (ast).right),
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
      /** @type {ArrayNode} */ (ast).elements.forEach((expr) => {
        const decorated = findConstantAndWatchExpressions(
          expr,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && decorated.constant;
        argsToWatch.push.apply(
          argsToWatch,
          /** @type {BodyNode} */ (decorated).toWatch,
        );
      });
      decoratedNode.constant = allConstants;
      decoratedNode.toWatch = argsToWatch;

      return decoratedNode;
    case ASTType._ObjectExpression:
      allConstants = true;
      argsToWatch = [];
      /** @type {ObjectNode} */ (ast).properties.forEach((property) => {
        const decorated = findConstantAndWatchExpressions(
          /** @type {LiteralNode} */ (property).value,
          $filter,
          astIsPure,
        );

        allConstants = allConstants && decorated.constant;
        argsToWatch.push.apply(
          argsToWatch,
          /** @type {BodyNode} */ (decorated).toWatch,
        );

        if (/** @type {ExpressionNode} */ (property).computed) {
          // `{[key]: value}` implicitly does `key.toString()` which may be non-pure
          decoratedKey = findConstantAndWatchExpressions(
            /** @type {ObjectPropertyNode} */ (property).key,
            $filter,
            false,
          );
          allConstants = allConstants && decoratedKey.constant;
          argsToWatch.push.apply(
            argsToWatch,
            /** @type {BodyNode} */ (decorated).toWatch,
          );
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
function assignableAST(ast) {
  const stmt = /** @type {import("./ast/ast-node.ts").ExpressionNode} */ (
    ast.body[0]
  );

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

function plusFn(left, right) {
  if (typeof left === "undefined" || isObject(left)) return right;

  if (typeof right === "undefined" || isObject(right)) return left;

  return left + right;
}

/**
 *
 * @param {ASTNode[]} body
 * @returns {any}
 */
function getInputs(body) {
  if (body.length !== 1) return undefined;
  const lastExpression = /** @type {ExpressionNode} */ (body[0]).expression;

  const candidate = /** @type {BodyNode} */ (lastExpression).toWatch;

  if (candidate.length !== 1) return candidate;

  return candidate[0] !== lastExpression ? candidate : undefined;
}

/**
 * Detect nodes which could depend on non-shallow state of objects
 * @param {ASTNode} node
 * @param {boolean|PURITY_ABSOLUTE|PURITY_RELATIVE} parentIsPure
 * @returns {number|boolean}
 */
function isPure(node, parentIsPure) {
  switch (node.type) {
    // Computed members might invoke a stateful toString()
    case ASTType._MemberExpression:
      if (/** @type {ExpressionNode} */ (node).computed) {
        return false;
      }
      break;

    // Unary always convert to primitive
    case ASTType._UnaryExpression:
      return PURITY_ABSOLUTE;

    // The binary + operator can invoke a stateful toString().
    case ASTType._BinaryExpression:
      return /** @type {ExpressionNode} */ (node).operator !== "+"
        ? PURITY_ABSOLUTE
        : false;

    // Functions / filters probably read state from within objects
    case ASTType._CallExpression:
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
 * @param {import("./ast/ast").ASTNode} ast
 * @returns {boolean}
 */
export function isAssignable(ast) {
  return (
    ast.type === ASTType._Identifier || ast.type === ASTType._MemberExpression
  );
}
