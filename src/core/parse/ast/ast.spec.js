import { AST } from "./ast.js";
import { Lexer } from "../lexer/lexer.js";
import { createInjector } from "../../di/injector.js";
import { ASTType } from "../ast-type.js";
import { Angular } from "../../../angular.js";

describe("ast", () => {
  let $rootScope;
  let $parse;
  let logs = [];

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception);
          console.error(exception, cause);
        };
      });
    let injector = createInjector(["myModule"]);
    $parse = injector.get("$parse");
    $rootScope = injector.get("$rootScope");
  });

  let createAst;

  beforeEach(() => {
    createAst = function () {
      const lexer = new Lexer({});
      const ast = new AST(lexer);
      return ast._ast.apply(ast, arguments);
    };
  });

  it("should handle an empty list of tokens", () => {
    expect(createAst("")).toEqual({ type: ASTType._Program, body: [] });
  });

  it("should understand identifiers", () => {
    expect(createAst("foo")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._Identifier, name: "foo" },
        },
      ],
    });
  });

  it("should understand non-computed member expressions", () => {
    expect(createAst("foo.bar")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: { type: ASTType._Identifier, name: "foo" },
            property: { type: ASTType._Identifier, name: "bar" },
            computed: false,
          },
        },
      ],
    });
  });

  it("should associate non-computed member expressions left-to-right", () => {
    expect(createAst("foo.bar.baz")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: {
              type: ASTType._MemberExpression,
              object: { type: ASTType._Identifier, name: "foo" },
              property: { type: ASTType._Identifier, name: "bar" },
              computed: false,
            },
            property: { type: ASTType._Identifier, name: "baz" },
            computed: false,
          },
        },
      ],
    });
  });

  it("should understand computed member expressions", () => {
    expect(createAst("foo[bar]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: { type: ASTType._Identifier, name: "foo" },
            property: { type: ASTType._Identifier, name: "bar" },
            computed: true,
          },
        },
      ],
    });
  });

  it("should associate computed member expressions left-to-right", () => {
    expect(createAst("foo[bar][baz]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: {
              type: ASTType._MemberExpression,
              object: { type: ASTType._Identifier, name: "foo" },
              property: { type: ASTType._Identifier, name: "bar" },
              computed: true,
            },
            property: { type: ASTType._Identifier, name: "baz" },
            computed: true,
          },
        },
      ],
    });
  });

  it("should understand call expressions", () => {
    expect(createAst("foo()")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "foo" },
            arguments: [],
          },
        },
      ],
    });
  });

  it("should parse call expression arguments", () => {
    expect(createAst("foo(bar, baz)")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "foo" },
            arguments: [
              { type: ASTType._Identifier, name: "bar" },
              { type: ASTType._Identifier, name: "baz" },
            ],
          },
        },
      ],
    });
  });

  it("should parse call expression left-to-right", () => {
    expect(createAst("foo(bar, baz)(man, shell)")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: {
              type: ASTType._CallExpression,
              callee: { type: ASTType._Identifier, name: "foo" },
              arguments: [
                { type: ASTType._Identifier, name: "bar" },
                { type: ASTType._Identifier, name: "baz" },
              ],
            },
            arguments: [
              { type: ASTType._Identifier, name: "man" },
              { type: ASTType._Identifier, name: "shell" },
            ],
          },
        },
      ],
    });
  });

  it("should keep the context when having superfluous parenthesis", () => {
    expect(createAst("(foo)(bar, baz)")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "foo" },
            arguments: [
              { type: ASTType._Identifier, name: "bar" },
              { type: ASTType._Identifier, name: "baz" },
            ],
          },
        },
      ],
    });
  });

  it("should treat member expressions and call expression with the same precedence", () => {
    expect(createAst("foo.bar[baz]()")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: {
              type: ASTType._MemberExpression,
              object: {
                type: ASTType._MemberExpression,
                object: { type: ASTType._Identifier, name: "foo" },
                property: { type: ASTType._Identifier, name: "bar" },
                computed: false,
              },
              property: { type: ASTType._Identifier, name: "baz" },
              computed: true,
            },
            arguments: [],
          },
        },
      ],
    });
    expect(createAst("foo[bar]().baz")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: {
              type: ASTType._CallExpression,
              callee: {
                type: ASTType._MemberExpression,
                object: { type: ASTType._Identifier, name: "foo" },
                property: { type: ASTType._Identifier, name: "bar" },
                computed: true,
              },
              arguments: [],
            },
            property: { type: ASTType._Identifier, name: "baz" },
            computed: false,
          },
        },
      ],
    });
    expect(createAst("foo().bar[baz]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: {
              type: ASTType._MemberExpression,
              object: {
                type: ASTType._CallExpression,
                callee: { type: ASTType._Identifier, name: "foo" },
                arguments: [],
              },
              property: { type: ASTType._Identifier, name: "bar" },
              computed: false,
            },
            property: { type: ASTType._Identifier, name: "baz" },
            computed: true,
          },
        },
      ],
    });
  });

  it("should understand literals", () => {
    // In a strict sense, `undefined` is not a literal but an identifier
    Object.entries({
      123: 123,
      '"123"': "123",
      true: true,
      false: false,
      null: null,
      undefined: undefined,
    }).forEach(([expression, value]) => {
      expect(createAst(expression)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: { type: ASTType._Literal, value },
          },
        ],
      });
    });
  });

  it("should understand the `this` expression", () => {
    expect(createAst("this")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._ThisExpression },
        },
      ],
    });
  });

  it("should understand the `$locals` expression", () => {
    expect(createAst("$locals")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._LocalsExpression },
        },
      ],
    });
  });

  it("should not confuse `this`, `$locals`, `undefined`, `true`, `false`, `null` when used as identifiers", () => {
    ["this", "$locals", "undefined", "true", "false", "null"].forEach(
      (identifier) => {
        expect(createAst(`foo.${identifier}`)).toEqual({
          type: ASTType._Program,
          body: [
            {
              type: ASTType._ExpressionStatement,
              expression: {
                type: ASTType._MemberExpression,
                object: { type: ASTType._Identifier, name: "foo" },
                property: { type: ASTType._Identifier, name: identifier },
                computed: false,
              },
            },
          ],
        });
      },
    );
  });

  it("should throw when trying to use non-identifiers as identifiers", () => {
    expect(() => {
      createAst("foo.)");
    }).toThrowError(/syntax/);
  });

  it("should throw when all tokens are not consumed", () => {
    expect(() => {
      createAst("foo bar");
    }).toThrowError(/syntax/);
  });

  it("should understand the unary operators `-`, `+` and `!`", () => {
    ["-", "+", "!"].forEach((operator) => {
      expect(createAst(`${operator}foo`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._UnaryExpression,
              operator,
              prefix: true,
              argument: { type: ASTType._Identifier, name: "foo" },
            },
          },
        ],
      });
    });
  });

  it("should handle all unary operators with the same precedence", () => {
    [
      ["+", "-", "!"],
      ["-", "!", "+"],
      ["!", "+", "-"],
    ].forEach((operators) => {
      expect(createAst(`${operators.join("")}foo`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._UnaryExpression,
              operator: operators[0],
              prefix: true,
              argument: {
                type: ASTType._UnaryExpression,
                operator: operators[1],
                prefix: true,
                argument: {
                  type: ASTType._UnaryExpression,
                  operator: operators[2],
                  prefix: true,
                  argument: { type: ASTType._Identifier, name: "foo" },
                },
              },
            },
          },
        ],
      });
    });
  });

  it("should be able to understand binary operators", () => {
    [
      "*",
      "/",
      "%",
      "+",
      "-",
      "<",
      ">",
      "<=",
      ">=",
      "==",
      "!=",
      "===",
      "!==",
    ].forEach((operator) => {
      expect(createAst(`foo${operator}bar`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._BinaryExpression,
              operator,
              left: { type: ASTType._Identifier, name: "foo" },
              right: { type: ASTType._Identifier, name: "bar" },
            },
          },
        ],
      });
    });
  });

  it("should associate binary operators with the same precedence left-to-right", () => {
    const operatorsByPrecedence = [
      ["*", "/", "%"],
      ["+", "-"],
      ["<", ">", "<=", ">="],
      ["==", "!=", "===", "!=="],
    ];
    operatorsByPrecedence.forEach((operators) => {
      operators.forEach((op1) => {
        operators.forEach((op2) => {
          expect(createAst(`foo${op1}bar${op2}baz`)).toEqual({
            type: ASTType._Program,
            body: [
              {
                type: ASTType._ExpressionStatement,
                expression: {
                  type: ASTType._BinaryExpression,
                  operator: op2,
                  left: {
                    type: ASTType._BinaryExpression,
                    operator: op1,
                    left: { type: ASTType._Identifier, name: "foo" },
                    right: { type: ASTType._Identifier, name: "bar" },
                  },
                  right: { type: ASTType._Identifier, name: "baz" },
                },
              },
            ],
          });
        });
      });
    });
  });

  it("should give higher precedence to member calls than to unary expressions", () => {
    ["!", "+", "-"].forEach((operator) => {
      expect(createAst(`${operator}foo()`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._UnaryExpression,
              operator,
              prefix: true,
              argument: {
                type: ASTType._CallExpression,
                callee: { type: ASTType._Identifier, name: "foo" },
                arguments: [],
              },
            },
          },
        ],
      });
      expect(createAst(`${operator}foo.bar`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._UnaryExpression,
              operator,
              prefix: true,
              argument: {
                type: ASTType._MemberExpression,
                object: { type: ASTType._Identifier, name: "foo" },
                property: { type: ASTType._Identifier, name: "bar" },
                computed: false,
              },
            },
          },
        ],
      });
      expect(createAst(`${operator}foo[bar]`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._UnaryExpression,
              operator,
              prefix: true,
              argument: {
                type: ASTType._MemberExpression,
                object: { type: ASTType._Identifier, name: "foo" },
                property: { type: ASTType._Identifier, name: "bar" },
                computed: true,
              },
            },
          },
        ],
      });
    });
  });

  it("should give higher precedence to unary operators over multiplicative operators", () => {
    ["!", "+", "-"].forEach((op1) => {
      ["*", "/", "%"].forEach((op2) => {
        expect(createAst(`${op1}foo${op2}${op1}bar`)).toEqual({
          type: ASTType._Program,
          body: [
            {
              type: ASTType._ExpressionStatement,
              expression: {
                type: ASTType._BinaryExpression,
                operator: op2,
                left: {
                  type: ASTType._UnaryExpression,
                  operator: op1,
                  prefix: true,
                  argument: { type: ASTType._Identifier, name: "foo" },
                },
                right: {
                  type: ASTType._UnaryExpression,
                  operator: op1,
                  prefix: true,
                  argument: { type: ASTType._Identifier, name: "bar" },
                },
              },
            },
          ],
        });
      });
    });
  });

  it("should give binary operators their right precedence", () => {
    const operatorsByPrecedence = [
      ["*", "/", "%"],
      ["+", "-"],
      ["<", ">", "<=", ">="],
      ["==", "!=", "===", "!=="],
    ];
    for (let i = 0; i < operatorsByPrecedence.length - 1; ++i) {
      operatorsByPrecedence[i].forEach((op1) => {
        operatorsByPrecedence[i + 1].forEach((op2) => {
          expect(createAst(`foo${op1}bar${op2}baz${op1}man`)).toEqual({
            type: ASTType._Program,
            body: [
              {
                type: ASTType._ExpressionStatement,
                expression: {
                  type: ASTType._BinaryExpression,
                  operator: op2,
                  left: {
                    type: ASTType._BinaryExpression,
                    operator: op1,
                    left: { type: ASTType._Identifier, name: "foo" },
                    right: { type: ASTType._Identifier, name: "bar" },
                  },
                  right: {
                    type: ASTType._BinaryExpression,
                    operator: op1,
                    left: { type: ASTType._Identifier, name: "baz" },
                    right: { type: ASTType._Identifier, name: "man" },
                  },
                },
              },
            ],
          });
        });
      });
    }
  });

  it("should understand logical operators", () => {
    ["||", "&&"].forEach((operator) => {
      expect(createAst(`foo${operator}bar`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._LogicalExpression,
              operator,
              left: { type: ASTType._Identifier, name: "foo" },
              right: { type: ASTType._Identifier, name: "bar" },
            },
          },
        ],
      });
    });
  });

  it("should associate logical operators left-to-right", () => {
    ["||", "&&"].forEach((op) => {
      expect(createAst(`foo${op}bar${op}baz`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._LogicalExpression,
              operator: op,
              left: {
                type: ASTType._LogicalExpression,
                operator: op,
                left: { type: ASTType._Identifier, name: "foo" },
                right: { type: ASTType._Identifier, name: "bar" },
              },
              right: { type: ASTType._Identifier, name: "baz" },
            },
          },
        ],
      });
    });
  });

  it("should understand ternary operators", () => {
    expect(createAst("foo?bar:baz")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ConditionalExpression,
            test: { type: ASTType._Identifier, name: "foo" },
            alternate: { type: ASTType._Identifier, name: "bar" },
            consequent: { type: ASTType._Identifier, name: "baz" },
          },
        },
      ],
    });
  });

  it("should associate the conditional operator right-to-left", () => {
    expect(createAst("foo0?foo1:foo2?bar0?bar1:bar2:man0?man1:man2")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ConditionalExpression,
            test: { type: ASTType._Identifier, name: "foo0" },
            alternate: { type: ASTType._Identifier, name: "foo1" },
            consequent: {
              type: ASTType._ConditionalExpression,
              test: { type: ASTType._Identifier, name: "foo2" },
              alternate: {
                type: ASTType._ConditionalExpression,
                test: { type: ASTType._Identifier, name: "bar0" },
                alternate: { type: ASTType._Identifier, name: "bar1" },
                consequent: { type: ASTType._Identifier, name: "bar2" },
              },
              consequent: {
                type: ASTType._ConditionalExpression,
                test: { type: ASTType._Identifier, name: "man0" },
                alternate: { type: ASTType._Identifier, name: "man1" },
                consequent: { type: ASTType._Identifier, name: "man2" },
              },
            },
          },
        },
      ],
    });
  });

  it("should understand assignment operator", () => {
    // Currently, only `=` is supported
    expect(createAst("foo=bar")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._AssignmentExpression,
            left: { type: ASTType._Identifier, name: "foo" },
            right: { type: ASTType._Identifier, name: "bar" },
            operator: "=",
          },
        },
      ],
    });
  });

  it("should associate assignments right-to-left", () => {
    // Currently, only `=` is supported
    expect(createAst("foo=bar=man")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._AssignmentExpression,
            left: { type: ASTType._Identifier, name: "foo" },
            right: {
              type: ASTType._AssignmentExpression,
              left: { type: ASTType._Identifier, name: "bar" },
              right: { type: ASTType._Identifier, name: "man" },
              operator: "=",
            },
            operator: "=",
          },
        },
      ],
    });
  });

  it("should give higher precedence to equality than to the logical `and` operator", () => {
    ["==", "!=", "===", "!=="].forEach((operator) => {
      expect(createAst(`foo${operator}bar && man${operator}shell`)).toEqual({
        type: ASTType._Program,
        body: [
          {
            type: ASTType._ExpressionStatement,
            expression: {
              type: ASTType._LogicalExpression,
              operator: "&&",
              left: {
                type: ASTType._BinaryExpression,
                operator,
                left: { type: ASTType._Identifier, name: "foo" },
                right: { type: ASTType._Identifier, name: "bar" },
              },
              right: {
                type: ASTType._BinaryExpression,
                operator,
                left: { type: ASTType._Identifier, name: "man" },
                right: { type: ASTType._Identifier, name: "shell" },
              },
            },
          },
        ],
      });
    });
  });

  it("should give higher precedence to logical `and` than to logical `or`", () => {
    expect(createAst("foo&&bar||man&&shell")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._LogicalExpression,
            operator: "||",
            left: {
              type: ASTType._LogicalExpression,
              operator: "&&",
              left: { type: ASTType._Identifier, name: "foo" },
              right: { type: ASTType._Identifier, name: "bar" },
            },
            right: {
              type: ASTType._LogicalExpression,
              operator: "&&",
              left: { type: ASTType._Identifier, name: "man" },
              right: { type: ASTType._Identifier, name: "shell" },
            },
          },
        },
      ],
    });
  });

  it("should give higher precedence to the logical `or` than to the conditional operator", () => {
    expect(createAst("foo||bar?man:shell")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ConditionalExpression,
            test: {
              type: ASTType._LogicalExpression,
              operator: "||",
              left: { type: ASTType._Identifier, name: "foo" },
              right: { type: ASTType._Identifier, name: "bar" },
            },
            alternate: { type: ASTType._Identifier, name: "man" },
            consequent: { type: ASTType._Identifier, name: "shell" },
          },
        },
      ],
    });
  });

  it("should give higher precedence to the conditional operator than to assignment operators", () => {
    expect(createAst("foo=bar?man:shell")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._AssignmentExpression,
            left: { type: ASTType._Identifier, name: "foo" },
            right: {
              type: ASTType._ConditionalExpression,
              test: { type: ASTType._Identifier, name: "bar" },
              alternate: { type: ASTType._Identifier, name: "man" },
              consequent: { type: ASTType._Identifier, name: "shell" },
            },
            operator: "=",
          },
        },
      ],
    });
  });

  it("should understand array literals", () => {
    expect(createAst("[]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ArrayExpression,
            elements: [],
          },
        },
      ],
    });
    expect(createAst("[foo]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ArrayExpression,
            elements: [{ type: ASTType._Identifier, name: "foo" }],
          },
        },
      ],
    });
    expect(createAst("[foo,]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ArrayExpression,
            elements: [{ type: ASTType._Identifier, name: "foo" }],
          },
        },
      ],
    });
    expect(createAst("[foo,bar,man,shell]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ArrayExpression,
            elements: [
              { type: ASTType._Identifier, name: "foo" },
              { type: ASTType._Identifier, name: "bar" },
              { type: ASTType._Identifier, name: "man" },
              { type: ASTType._Identifier, name: "shell" },
            ],
          },
        },
      ],
    });
    expect(createAst("[foo,bar,man,shell,]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ArrayExpression,
            elements: [
              { type: ASTType._Identifier, name: "foo" },
              { type: ASTType._Identifier, name: "bar" },
              { type: ASTType._Identifier, name: "man" },
              { type: ASTType._Identifier, name: "shell" },
            ],
          },
        },
      ],
    });
  });

  it("should understand objects", () => {
    expect(createAst("{}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [],
          },
        },
      ],
    });
    expect(createAst("{foo: bar}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "foo" },
                computed: false,
                value: { type: ASTType._Identifier, name: "bar" },
              },
            ],
          },
        },
      ],
    });
    expect(createAst("{foo: bar,}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "foo" },
                computed: false,
                value: { type: ASTType._Identifier, name: "bar" },
              },
            ],
          },
        },
      ],
    });
    expect(createAst('{foo: bar, "man": "shell", 42: 23}')).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "foo" },
                computed: false,
                value: { type: ASTType._Identifier, name: "bar" },
              },
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Literal, value: "man" },
                computed: false,
                value: { type: ASTType._Literal, value: "shell" },
              },
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Literal, value: 42 },
                computed: false,
                value: { type: ASTType._Literal, value: 23 },
              },
            ],
          },
        },
      ],
    });
    expect(createAst('{foo: bar, "man": "shell", 42: 23,}')).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "foo" },
                computed: false,
                value: { type: ASTType._Identifier, name: "bar" },
              },
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Literal, value: "man" },
                computed: false,
                value: { type: ASTType._Literal, value: "shell" },
              },
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Literal, value: 42 },
                computed: false,
                value: { type: ASTType._Literal, value: 23 },
              },
            ],
          },
        },
      ],
    });
  });

  it("should understand ES6 object initializer", () => {
    // Shorthand properties definitions.
    expect(createAst("{x, y, z}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "x" },
                computed: false,
                value: { type: ASTType._Identifier, name: "x" },
              },
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "y" },
                computed: false,
                value: { type: ASTType._Identifier, name: "y" },
              },
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "z" },
                computed: false,
                value: { type: ASTType._Identifier, name: "z" },
              },
            ],
          },
        },
      ],
    });
    expect(() => {
      createAst('{"foo"}');
    }).toThrow();

    // Computed properties
    expect(createAst("{[x]: x}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "x" },
                computed: true,
                value: { type: ASTType._Identifier, name: "x" },
              },
            ],
          },
        },
      ],
    });
    expect(createAst("{[x + 1]: x}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: {
                  type: ASTType._BinaryExpression,
                  operator: "+",
                  left: { type: ASTType._Identifier, name: "x" },
                  right: { type: ASTType._Literal, value: 1 },
                },
                computed: true,
                value: { type: ASTType._Identifier, name: "x" },
              },
            ],
          },
        },
      ],
    });
  });

  it("should understand multiple expressions", () => {
    expect(createAst("foo = bar; man = shell")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._AssignmentExpression,
            left: { type: ASTType._Identifier, name: "foo" },
            right: { type: ASTType._Identifier, name: "bar" },
            operator: "=",
          },
        },
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._AssignmentExpression,
            left: { type: ASTType._Identifier, name: "man" },
            right: { type: ASTType._Identifier, name: "shell" },
            operator: "=",
          },
        },
      ],
    });
  });

  // This is non-standard syntax
  it("should understand filters", () => {
    expect(createAst("foo | bar")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "bar" },
            arguments: [{ type: ASTType._Identifier, name: "foo" }],
            filter: true,
          },
        },
      ],
    });
  });

  it("should understand filters with extra parameters", () => {
    expect(createAst("foo | bar:baz")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "bar" },
            arguments: [
              { type: ASTType._Identifier, name: "foo" },
              { type: ASTType._Identifier, name: "baz" },
            ],
            filter: true,
          },
        },
      ],
    });
  });

  it("should associate filters right-to-left", () => {
    expect(createAst("foo | bar:man | shell")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "shell" },
            arguments: [
              {
                type: ASTType._CallExpression,
                callee: { type: ASTType._Identifier, name: "bar" },
                arguments: [
                  { type: ASTType._Identifier, name: "foo" },
                  { type: ASTType._Identifier, name: "man" },
                ],
                filter: true,
              },
            ],
            filter: true,
          },
        },
      ],
    });
  });

  it("should give higher precedence to assignments over filters", () => {
    expect(createAst("foo=bar | man")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "man" },
            arguments: [
              {
                type: ASTType._AssignmentExpression,
                left: { type: ASTType._Identifier, name: "foo" },
                right: { type: ASTType._Identifier, name: "bar" },
                operator: "=",
              },
            ],
            filter: true,
          },
        },
      ],
    });
  });

  it("should accept expression as filters parameters", () => {
    expect(createAst("foo | bar:baz=man")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "bar" },
            arguments: [
              { type: ASTType._Identifier, name: "foo" },
              {
                type: ASTType._AssignmentExpression,
                left: { type: ASTType._Identifier, name: "baz" },
                right: { type: ASTType._Identifier, name: "man" },
                operator: "=",
              },
            ],
            filter: true,
          },
        },
      ],
    });
  });

  it("should accept expression as computer members", () => {
    expect(createAst("foo[a = 1]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: { type: ASTType._Identifier, name: "foo" },
            property: {
              type: ASTType._AssignmentExpression,
              left: { type: ASTType._Identifier, name: "a" },
              right: { type: ASTType._Literal, value: 1 },
              operator: "=",
            },
            computed: true,
          },
        },
      ],
    });
  });

  it("should accept expression in function arguments", () => {
    expect(createAst("foo(a = 1)")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._CallExpression,
            callee: { type: ASTType._Identifier, name: "foo" },
            arguments: [
              {
                type: ASTType._AssignmentExpression,
                left: { type: ASTType._Identifier, name: "a" },
                right: { type: ASTType._Literal, value: 1 },
                operator: "=",
              },
            ],
          },
        },
      ],
    });
  });

  it("should accept expression as part of ternary operators", () => {
    expect(createAst("foo || bar ? man = 1 : shell = 1")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ConditionalExpression,
            test: {
              type: ASTType._LogicalExpression,
              operator: "||",
              left: { type: ASTType._Identifier, name: "foo" },
              right: { type: ASTType._Identifier, name: "bar" },
            },
            alternate: {
              type: ASTType._AssignmentExpression,
              left: { type: ASTType._Identifier, name: "man" },
              right: { type: ASTType._Literal, value: 1 },
              operator: "=",
            },
            consequent: {
              type: ASTType._AssignmentExpression,
              left: { type: ASTType._Identifier, name: "shell" },
              right: { type: ASTType._Literal, value: 1 },
              operator: "=",
            },
          },
        },
      ],
    });
  });

  it("should accept expression as part of array literals", () => {
    expect(createAst("[foo = 1]")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ArrayExpression,
            elements: [
              {
                type: ASTType._AssignmentExpression,
                left: { type: ASTType._Identifier, name: "foo" },
                right: { type: ASTType._Literal, value: 1 },
                operator: "=",
              },
            ],
          },
        },
      ],
    });
  });

  it("should accept expression as part of object literals", () => {
    expect(createAst("{foo: bar = 1}")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._ObjectExpression,
            properties: [
              {
                type: ASTType._Property,
                kind: "init",
                key: { type: ASTType._Identifier, name: "foo" },
                computed: false,
                value: {
                  type: ASTType._AssignmentExpression,
                  left: { type: ASTType._Identifier, name: "bar" },
                  right: { type: ASTType._Literal, value: 1 },
                  operator: "=",
                },
              },
            ],
          },
        },
      ],
    });
  });

  it("should be possible to use parenthesis to indicate precedence", () => {
    expect(createAst("(foo + bar).man")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: {
            type: ASTType._MemberExpression,
            object: {
              type: ASTType._BinaryExpression,
              operator: "+",
              left: { type: ASTType._Identifier, name: "foo" },
              right: { type: ASTType._Identifier, name: "bar" },
            },
            property: { type: ASTType._Identifier, name: "man" },
            computed: false,
          },
        },
      ],
    });
  });

  it("should skip empty expressions", () => {
    expect(createAst("foo;;;;bar")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._Identifier, name: "foo" },
        },
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._Identifier, name: "bar" },
        },
      ],
    });
    expect(createAst(";foo")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._Identifier, name: "foo" },
        },
      ],
    });
    expect(createAst("foo;")).toEqual({
      type: ASTType._Program,
      body: [
        {
          type: ASTType._ExpressionStatement,
          expression: { type: ASTType._Identifier, name: "foo" },
        },
      ],
    });
    expect(createAst(";;;;")).toEqual({ type: ASTType._Program, body: [] });
    expect(createAst("")).toEqual({ type: ASTType._Program, body: [] });
  });
});
