import { AST } from "./ast.ts";
import { Lexer } from "../lexer/lexer.ts";
import { createInjector } from "../../di/injector.ts";
import { ASTType } from "../ast-type.ts";
import { Angular } from "../../../angular.ts";

describe("ast", () => {
  let $rootScope;
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
    expect(createAst("")).toEqual({ _type: ASTType._Program, _body: [] });
  });

  it("should understand identifiers", () => {
    expect(createAst("foo")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._Identifier, _name: "foo" },
        },
      ],
    });
  });

  it("should understand non-computed member expressions", () => {
    expect(createAst("foo.bar")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: { _type: ASTType._Identifier, _name: "foo" },
            _property: { _type: ASTType._Identifier, _name: "bar" },
            _computed: false,
          },
        },
      ],
    });
  });

  it("should associate non-computed member expressions left-to-right", () => {
    expect(createAst("foo.bar.baz")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: {
              _type: ASTType._MemberExpression,
              _object: { _type: ASTType._Identifier, _name: "foo" },
              _property: { _type: ASTType._Identifier, _name: "bar" },
              _computed: false,
            },
            _property: { _type: ASTType._Identifier, _name: "baz" },
            _computed: false,
          },
        },
      ],
    });
  });

  it("should understand computed member expressions", () => {
    expect(createAst("foo[bar]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: { _type: ASTType._Identifier, _name: "foo" },
            _property: { _type: ASTType._Identifier, _name: "bar" },
            _computed: true,
          },
        },
      ],
    });
  });

  it("should associate computed member expressions left-to-right", () => {
    expect(createAst("foo[bar][baz]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: {
              _type: ASTType._MemberExpression,
              _object: { _type: ASTType._Identifier, _name: "foo" },
              _property: { _type: ASTType._Identifier, _name: "bar" },
              _computed: true,
            },
            _property: { _type: ASTType._Identifier, _name: "baz" },
            _computed: true,
          },
        },
      ],
    });
  });

  it("should understand call expressions", () => {
    expect(createAst("foo()")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "foo" },
            _arguments: [],
          },
        },
      ],
    });
  });

  it("should parse call expression arguments", () => {
    expect(createAst("foo(bar, baz)")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "foo" },
            _arguments: [
              { _type: ASTType._Identifier, _name: "bar" },
              { _type: ASTType._Identifier, _name: "baz" },
            ],
          },
        },
      ],
    });
  });

  it("should parse call expression left-to-right", () => {
    expect(createAst("foo(bar, baz)(man, shell)")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: {
              _type: ASTType._CallExpression,
              _callee: { _type: ASTType._Identifier, _name: "foo" },
              _arguments: [
                { _type: ASTType._Identifier, _name: "bar" },
                { _type: ASTType._Identifier, _name: "baz" },
              ],
            },
            _arguments: [
              { _type: ASTType._Identifier, _name: "man" },
              { _type: ASTType._Identifier, _name: "shell" },
            ],
          },
        },
      ],
    });
  });

  it("should keep the context when having superfluous parenthesis", () => {
    expect(createAst("(foo)(bar, baz)")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "foo" },
            _arguments: [
              { _type: ASTType._Identifier, _name: "bar" },
              { _type: ASTType._Identifier, _name: "baz" },
            ],
          },
        },
      ],
    });
  });

  it("should treat member expressions and call expression with the same precedence", () => {
    expect(createAst("foo.bar[baz]()")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: {
              _type: ASTType._MemberExpression,
              _object: {
                _type: ASTType._MemberExpression,
                _object: { _type: ASTType._Identifier, _name: "foo" },
                _property: { _type: ASTType._Identifier, _name: "bar" },
                _computed: false,
              },
              _property: { _type: ASTType._Identifier, _name: "baz" },
              _computed: true,
            },
            _arguments: [],
          },
        },
      ],
    });
    expect(createAst("foo[bar]().baz")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: {
              _type: ASTType._CallExpression,
              _callee: {
                _type: ASTType._MemberExpression,
                _object: { _type: ASTType._Identifier, _name: "foo" },
                _property: { _type: ASTType._Identifier, _name: "bar" },
                _computed: true,
              },
              _arguments: [],
            },
            _property: { _type: ASTType._Identifier, _name: "baz" },
            _computed: false,
          },
        },
      ],
    });
    expect(createAst("foo().bar[baz]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: {
              _type: ASTType._MemberExpression,
              _object: {
                _type: ASTType._CallExpression,
                _callee: { _type: ASTType._Identifier, _name: "foo" },
                _arguments: [],
              },
              _property: { _type: ASTType._Identifier, _name: "bar" },
              _computed: false,
            },
            _property: { _type: ASTType._Identifier, _name: "baz" },
            _computed: true,
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
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: { _type: ASTType._Literal, _value: value },
          },
        ],
      });
    });
  });

  it("should understand the `this` expression", () => {
    expect(createAst("this")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._ThisExpression },
        },
      ],
    });
  });

  it("should understand the `$locals` expression", () => {
    expect(createAst("$locals")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._LocalsExpression },
        },
      ],
    });
  });

  it("should not confuse `this`, `$locals`, `undefined`, `true`, `false`, `null` when used as identifiers", () => {
    ["this", "$locals", "undefined", "true", "false", "null"].forEach(
      (identifier) => {
        expect(createAst(`foo.${identifier}`)).toEqual({
          _type: ASTType._Program,
          _body: [
            {
              _type: ASTType._ExpressionStatement,
              _expression: {
                _type: ASTType._MemberExpression,
                _object: { _type: ASTType._Identifier, _name: "foo" },
                _property: { _type: ASTType._Identifier, _name: identifier },
                _computed: false,
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
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._UnaryExpression,
              _operator: operator,
              _prefix: true,
              _argument: { _type: ASTType._Identifier, _name: "foo" },
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
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._UnaryExpression,
              _operator: operators[0],
              _prefix: true,
              _argument: {
                _type: ASTType._UnaryExpression,
                _operator: operators[1],
                _prefix: true,
                _argument: {
                  _type: ASTType._UnaryExpression,
                  _operator: operators[2],
                  _prefix: true,
                  _argument: { _type: ASTType._Identifier, _name: "foo" },
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
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._BinaryExpression,
              _operator: operator,
              _left: { _type: ASTType._Identifier, _name: "foo" },
              _right: { _type: ASTType._Identifier, _name: "bar" },
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
            _type: ASTType._Program,
            _body: [
              {
                _type: ASTType._ExpressionStatement,
                _expression: {
                  _type: ASTType._BinaryExpression,
                  _operator: op2,
                  _left: {
                    _type: ASTType._BinaryExpression,
                    _operator: op1,
                    _left: { _type: ASTType._Identifier, _name: "foo" },
                    _right: { _type: ASTType._Identifier, _name: "bar" },
                  },
                  _right: { _type: ASTType._Identifier, _name: "baz" },
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
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._UnaryExpression,
              _operator: operator,
              _prefix: true,
              _argument: {
                _type: ASTType._CallExpression,
                _callee: { _type: ASTType._Identifier, _name: "foo" },
                _arguments: [],
              },
            },
          },
        ],
      });
      expect(createAst(`${operator}foo.bar`)).toEqual({
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._UnaryExpression,
              _operator: operator,
              _prefix: true,
              _argument: {
                _type: ASTType._MemberExpression,
                _object: { _type: ASTType._Identifier, _name: "foo" },
                _property: { _type: ASTType._Identifier, _name: "bar" },
                _computed: false,
              },
            },
          },
        ],
      });
      expect(createAst(`${operator}foo[bar]`)).toEqual({
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._UnaryExpression,
              _operator: operator,
              _prefix: true,
              _argument: {
                _type: ASTType._MemberExpression,
                _object: { _type: ASTType._Identifier, _name: "foo" },
                _property: { _type: ASTType._Identifier, _name: "bar" },
                _computed: true,
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
          _type: ASTType._Program,
          _body: [
            {
              _type: ASTType._ExpressionStatement,
              _expression: {
                _type: ASTType._BinaryExpression,
                _operator: op2,
                _left: {
                  _type: ASTType._UnaryExpression,
                  _operator: op1,
                  _prefix: true,
                  _argument: { _type: ASTType._Identifier, _name: "foo" },
                },
                _right: {
                  _type: ASTType._UnaryExpression,
                  _operator: op1,
                  _prefix: true,
                  _argument: { _type: ASTType._Identifier, _name: "bar" },
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
            _type: ASTType._Program,
            _body: [
              {
                _type: ASTType._ExpressionStatement,
                _expression: {
                  _type: ASTType._BinaryExpression,
                  _operator: op2,
                  _left: {
                    _type: ASTType._BinaryExpression,
                    _operator: op1,
                    _left: { _type: ASTType._Identifier, _name: "foo" },
                    _right: { _type: ASTType._Identifier, _name: "bar" },
                  },
                  _right: {
                    _type: ASTType._BinaryExpression,
                    _operator: op1,
                    _left: { _type: ASTType._Identifier, _name: "baz" },
                    _right: { _type: ASTType._Identifier, _name: "man" },
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
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._LogicalExpression,
              _operator: operator,
              _left: { _type: ASTType._Identifier, _name: "foo" },
              _right: { _type: ASTType._Identifier, _name: "bar" },
            },
          },
        ],
      });
    });
  });

  it("should associate logical operators left-to-right", () => {
    ["||", "&&"].forEach((op) => {
      expect(createAst(`foo${op}bar${op}baz`)).toEqual({
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._LogicalExpression,
              _operator: op,
              _left: {
                _type: ASTType._LogicalExpression,
                _operator: op,
                _left: { _type: ASTType._Identifier, _name: "foo" },
                _right: { _type: ASTType._Identifier, _name: "bar" },
              },
              _right: { _type: ASTType._Identifier, _name: "baz" },
            },
          },
        ],
      });
    });
  });

  it("should understand ternary operators", () => {
    expect(createAst("foo?bar:baz")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ConditionalExpression,
            _test: { _type: ASTType._Identifier, _name: "foo" },
            _alternate: { _type: ASTType._Identifier, _name: "bar" },
            _consequent: { _type: ASTType._Identifier, _name: "baz" },
          },
        },
      ],
    });
  });

  it("should associate the conditional operator right-to-left", () => {
    expect(createAst("foo0?foo1:foo2?bar0?bar1:bar2:man0?man1:man2")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ConditionalExpression,
            _test: { _type: ASTType._Identifier, _name: "foo0" },
            _alternate: { _type: ASTType._Identifier, _name: "foo1" },
            _consequent: {
              _type: ASTType._ConditionalExpression,
              _test: { _type: ASTType._Identifier, _name: "foo2" },
              _alternate: {
                _type: ASTType._ConditionalExpression,
                _test: { _type: ASTType._Identifier, _name: "bar0" },
                _alternate: { _type: ASTType._Identifier, _name: "bar1" },
                _consequent: { _type: ASTType._Identifier, _name: "bar2" },
              },
              _consequent: {
                _type: ASTType._ConditionalExpression,
                _test: { _type: ASTType._Identifier, _name: "man0" },
                _alternate: { _type: ASTType._Identifier, _name: "man1" },
                _consequent: { _type: ASTType._Identifier, _name: "man2" },
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
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._AssignmentExpression,
            _left: { _type: ASTType._Identifier, _name: "foo" },
            _right: { _type: ASTType._Identifier, _name: "bar" },
            _operator: "=",
          },
        },
      ],
    });
  });

  it("should associate assignments right-to-left", () => {
    // Currently, only `=` is supported
    expect(createAst("foo=bar=man")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._AssignmentExpression,
            _left: { _type: ASTType._Identifier, _name: "foo" },
            _right: {
              _type: ASTType._AssignmentExpression,
              _left: { _type: ASTType._Identifier, _name: "bar" },
              _right: { _type: ASTType._Identifier, _name: "man" },
              _operator: "=",
            },
            _operator: "=",
          },
        },
      ],
    });
  });

  it("should give higher precedence to equality than to the logical `and` operator", () => {
    ["==", "!=", "===", "!=="].forEach((operator) => {
      expect(createAst(`foo${operator}bar && man${operator}shell`)).toEqual({
        _type: ASTType._Program,
        _body: [
          {
            _type: ASTType._ExpressionStatement,
            _expression: {
              _type: ASTType._LogicalExpression,
              _operator: "&&",
              _left: {
                _type: ASTType._BinaryExpression,
                _operator: operator,
                _left: { _type: ASTType._Identifier, _name: "foo" },
                _right: { _type: ASTType._Identifier, _name: "bar" },
              },
              _right: {
                _type: ASTType._BinaryExpression,
                _operator: operator,
                _left: { _type: ASTType._Identifier, _name: "man" },
                _right: { _type: ASTType._Identifier, _name: "shell" },
              },
            },
          },
        ],
      });
    });
  });

  it("should give higher precedence to logical `and` than to logical `or`", () => {
    expect(createAst("foo&&bar||man&&shell")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._LogicalExpression,
            _operator: "||",
            _left: {
              _type: ASTType._LogicalExpression,
              _operator: "&&",
              _left: { _type: ASTType._Identifier, _name: "foo" },
              _right: { _type: ASTType._Identifier, _name: "bar" },
            },
            _right: {
              _type: ASTType._LogicalExpression,
              _operator: "&&",
              _left: { _type: ASTType._Identifier, _name: "man" },
              _right: { _type: ASTType._Identifier, _name: "shell" },
            },
          },
        },
      ],
    });
  });

  it("should give higher precedence to the logical `or` than to the conditional operator", () => {
    expect(createAst("foo||bar?man:shell")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ConditionalExpression,
            _test: {
              _type: ASTType._LogicalExpression,
              _operator: "||",
              _left: { _type: ASTType._Identifier, _name: "foo" },
              _right: { _type: ASTType._Identifier, _name: "bar" },
            },
            _alternate: { _type: ASTType._Identifier, _name: "man" },
            _consequent: { _type: ASTType._Identifier, _name: "shell" },
          },
        },
      ],
    });
  });

  it("should give higher precedence to the conditional operator than to assignment operators", () => {
    expect(createAst("foo=bar?man:shell")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._AssignmentExpression,
            _left: { _type: ASTType._Identifier, _name: "foo" },
            _right: {
              _type: ASTType._ConditionalExpression,
              _test: { _type: ASTType._Identifier, _name: "bar" },
              _alternate: { _type: ASTType._Identifier, _name: "man" },
              _consequent: { _type: ASTType._Identifier, _name: "shell" },
            },
            _operator: "=",
          },
        },
      ],
    });
  });

  it("should understand array literals", () => {
    expect(createAst("[]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ArrayExpression,
            _elements: [],
          },
        },
      ],
    });
    expect(createAst("[foo]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ArrayExpression,
            _elements: [{ _type: ASTType._Identifier, _name: "foo" }],
          },
        },
      ],
    });
    expect(createAst("[foo,]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ArrayExpression,
            _elements: [{ _type: ASTType._Identifier, _name: "foo" }],
          },
        },
      ],
    });
    expect(createAst("[foo,bar,man,shell]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ArrayExpression,
            _elements: [
              { _type: ASTType._Identifier, _name: "foo" },
              { _type: ASTType._Identifier, _name: "bar" },
              { _type: ASTType._Identifier, _name: "man" },
              { _type: ASTType._Identifier, _name: "shell" },
            ],
          },
        },
      ],
    });
    expect(createAst("[foo,bar,man,shell,]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ArrayExpression,
            _elements: [
              { _type: ASTType._Identifier, _name: "foo" },
              { _type: ASTType._Identifier, _name: "bar" },
              { _type: ASTType._Identifier, _name: "man" },
              { _type: ASTType._Identifier, _name: "shell" },
            ],
          },
        },
      ],
    });
  });

  it("should understand objects", () => {
    expect(createAst("{}")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [],
          },
        },
      ],
    });
    expect(createAst("{foo: bar}")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "foo" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "bar" },
              },
            ],
          },
        },
      ],
    });
    expect(createAst("{foo: bar,}")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "foo" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "bar" },
              },
            ],
          },
        },
      ],
    });
    expect(createAst('{foo: bar, "man": "shell", 42: 23}')).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "foo" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "bar" },
              },
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Literal, _value: "man" },
                _computed: false,
                _value: { _type: ASTType._Literal, _value: "shell" },
              },
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Literal, _value: 42 },
                _computed: false,
                _value: { _type: ASTType._Literal, _value: 23 },
              },
            ],
          },
        },
      ],
    });
    expect(createAst('{foo: bar, "man": "shell", 42: 23,}')).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "foo" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "bar" },
              },
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Literal, _value: "man" },
                _computed: false,
                _value: { _type: ASTType._Literal, _value: "shell" },
              },
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Literal, _value: 42 },
                _computed: false,
                _value: { _type: ASTType._Literal, _value: 23 },
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
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "x" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "x" },
              },
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "y" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "y" },
              },
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "z" },
                _computed: false,
                _value: { _type: ASTType._Identifier, _name: "z" },
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
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "x" },
                _computed: true,
                _value: { _type: ASTType._Identifier, _name: "x" },
              },
            ],
          },
        },
      ],
    });
    expect(createAst("{[x + 1]: x}")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: {
                  _type: ASTType._BinaryExpression,
                  _operator: "+",
                  _left: { _type: ASTType._Identifier, _name: "x" },
                  _right: { _type: ASTType._Literal, _value: 1 },
                },
                _computed: true,
                _value: { _type: ASTType._Identifier, _name: "x" },
              },
            ],
          },
        },
      ],
    });
  });

  it("should understand multiple expressions", () => {
    expect(createAst("foo = bar; man = shell")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._AssignmentExpression,
            _left: { _type: ASTType._Identifier, _name: "foo" },
            _right: { _type: ASTType._Identifier, _name: "bar" },
            _operator: "=",
          },
        },
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._AssignmentExpression,
            _left: { _type: ASTType._Identifier, _name: "man" },
            _right: { _type: ASTType._Identifier, _name: "shell" },
            _operator: "=",
          },
        },
      ],
    });
  });

  // This is non-standard syntax
  it("should understand filters", () => {
    expect(createAst("foo | bar")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "bar" },
            _arguments: [{ _type: ASTType._Identifier, _name: "foo" }],
            _filter: true,
          },
        },
      ],
    });
  });

  it("should understand filters with extra parameters", () => {
    expect(createAst("foo | bar:baz")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "bar" },
            _arguments: [
              { _type: ASTType._Identifier, _name: "foo" },
              { _type: ASTType._Identifier, _name: "baz" },
            ],
            _filter: true,
          },
        },
      ],
    });
  });

  it("should associate filters right-to-left", () => {
    expect(createAst("foo | bar:man | shell")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "shell" },
            _arguments: [
              {
                _type: ASTType._CallExpression,
                _callee: { _type: ASTType._Identifier, _name: "bar" },
                _arguments: [
                  { _type: ASTType._Identifier, _name: "foo" },
                  { _type: ASTType._Identifier, _name: "man" },
                ],
                _filter: true,
              },
            ],
            _filter: true,
          },
        },
      ],
    });
  });

  it("should give higher precedence to assignments over filters", () => {
    expect(createAst("foo=bar | man")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "man" },
            _arguments: [
              {
                _type: ASTType._AssignmentExpression,
                _left: { _type: ASTType._Identifier, _name: "foo" },
                _right: { _type: ASTType._Identifier, _name: "bar" },
                _operator: "=",
              },
            ],
            _filter: true,
          },
        },
      ],
    });
  });

  it("should accept expression as filters parameters", () => {
    expect(createAst("foo | bar:baz=man")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "bar" },
            _arguments: [
              { _type: ASTType._Identifier, _name: "foo" },
              {
                _type: ASTType._AssignmentExpression,
                _left: { _type: ASTType._Identifier, _name: "baz" },
                _right: { _type: ASTType._Identifier, _name: "man" },
                _operator: "=",
              },
            ],
            _filter: true,
          },
        },
      ],
    });
  });

  it("should accept expression as computer members", () => {
    expect(createAst("foo[a = 1]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: { _type: ASTType._Identifier, _name: "foo" },
            _property: {
              _type: ASTType._AssignmentExpression,
              _left: { _type: ASTType._Identifier, _name: "a" },
              _right: { _type: ASTType._Literal, _value: 1 },
              _operator: "=",
            },
            _computed: true,
          },
        },
      ],
    });
  });

  it("should accept expression in function arguments", () => {
    expect(createAst("foo(a = 1)")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._CallExpression,
            _callee: { _type: ASTType._Identifier, _name: "foo" },
            _arguments: [
              {
                _type: ASTType._AssignmentExpression,
                _left: { _type: ASTType._Identifier, _name: "a" },
                _right: { _type: ASTType._Literal, _value: 1 },
                _operator: "=",
              },
            ],
          },
        },
      ],
    });
  });

  it("should accept expression as part of ternary operators", () => {
    expect(createAst("foo || bar ? man = 1 : shell = 1")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ConditionalExpression,
            _test: {
              _type: ASTType._LogicalExpression,
              _operator: "||",
              _left: { _type: ASTType._Identifier, _name: "foo" },
              _right: { _type: ASTType._Identifier, _name: "bar" },
            },
            _alternate: {
              _type: ASTType._AssignmentExpression,
              _left: { _type: ASTType._Identifier, _name: "man" },
              _right: { _type: ASTType._Literal, _value: 1 },
              _operator: "=",
            },
            _consequent: {
              _type: ASTType._AssignmentExpression,
              _left: { _type: ASTType._Identifier, _name: "shell" },
              _right: { _type: ASTType._Literal, _value: 1 },
              _operator: "=",
            },
          },
        },
      ],
    });
  });

  it("should accept expression as part of array literals", () => {
    expect(createAst("[foo = 1]")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ArrayExpression,
            _elements: [
              {
                _type: ASTType._AssignmentExpression,
                _left: { _type: ASTType._Identifier, _name: "foo" },
                _right: { _type: ASTType._Literal, _value: 1 },
                _operator: "=",
              },
            ],
          },
        },
      ],
    });
  });

  it("should accept expression as part of object literals", () => {
    expect(createAst("{foo: bar = 1}")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._ObjectExpression,
            _properties: [
              {
                _type: ASTType._Property,

                _key: { _type: ASTType._Identifier, _name: "foo" },
                _computed: false,
                _value: {
                  _type: ASTType._AssignmentExpression,
                  _left: { _type: ASTType._Identifier, _name: "bar" },
                  _right: { _type: ASTType._Literal, _value: 1 },
                  _operator: "=",
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
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: {
            _type: ASTType._MemberExpression,
            _object: {
              _type: ASTType._BinaryExpression,
              _operator: "+",
              _left: { _type: ASTType._Identifier, _name: "foo" },
              _right: { _type: ASTType._Identifier, _name: "bar" },
            },
            _property: { _type: ASTType._Identifier, _name: "man" },
            _computed: false,
          },
        },
      ],
    });
  });

  it("should skip empty expressions", () => {
    expect(createAst("foo;;;;bar")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._Identifier, _name: "foo" },
        },
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._Identifier, _name: "bar" },
        },
      ],
    });
    expect(createAst(";foo")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._Identifier, _name: "foo" },
        },
      ],
    });
    expect(createAst("foo;")).toEqual({
      _type: ASTType._Program,
      _body: [
        {
          _type: ASTType._ExpressionStatement,
          _expression: { _type: ASTType._Identifier, _name: "foo" },
        },
      ],
    });
    expect(createAst(";;;;")).toEqual({ _type: ASTType._Program, _body: [] });
    expect(createAst("")).toEqual({ _type: ASTType._Program, _body: [] });
  });
});
