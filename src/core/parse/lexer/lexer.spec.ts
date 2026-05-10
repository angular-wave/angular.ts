// @ts-nocheck
/// <reference types="jasmine" />
import { Lexer } from "./lexer.ts";
import { Angular } from "../../../angular.ts";
import { createInjector } from "../../di/injector.ts";

describe("lexer", () => {
  let $rootScope;

  let $parse;

  const logs = [];

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
    const injector = createInjector(["myModule"]);

    $parse = injector.get("$parse");
    $rootScope = injector.get("$rootScope");
  });

  describe("lexer", () => {
    let lex;

    beforeEach(() => {
      lex = function () {
        const lexer = new Lexer();

        return lexer._lex.apply(lexer, arguments);
      };
    });

    it("should tokenize digit characters as numbers without consuming identifiers", () => {
      const tokens = lex("0 9 .5 a0 value");

      expect(tokens.map((token) => token._text)).toEqual([
        "0",
        "9",
        ".5",
        "a0",
        "value",
      ]);
      expect(tokens[0]._value).toEqual(0);
      expect(tokens[1]._value).toEqual(9);
      expect(tokens[2]._value).toEqual(0.5);
      expect(tokens[3]._identifier).toEqual(true);
      expect(tokens[4]._identifier).toEqual(true);
    });

    it("should tokenize a string", () => {
      const tokens = lex("a.bc[22]+1.3|f:'a\\'c':\"d\\\"e\"");

      let i = 0;

      expect(tokens[i]._index).toEqual(0);
      expect(tokens[i]._text).toEqual("a");

      i++;
      expect(tokens[i]._index).toEqual(1);
      expect(tokens[i]._text).toEqual(".");

      i++;
      expect(tokens[i]._index).toEqual(2);
      expect(tokens[i]._text).toEqual("bc");

      i++;
      expect(tokens[i]._index).toEqual(4);
      expect(tokens[i]._text).toEqual("[");

      i++;
      expect(tokens[i]._index).toEqual(5);
      expect(tokens[i]._text).toEqual("22");
      expect(tokens[i]._value).toEqual(22);
      expect(tokens[i]._constant).toEqual(true);

      i++;
      expect(tokens[i]._index).toEqual(7);
      expect(tokens[i]._text).toEqual("]");

      i++;
      expect(tokens[i]._index).toEqual(8);
      expect(tokens[i]._text).toEqual("+");

      i++;
      expect(tokens[i]._index).toEqual(9);
      expect(tokens[i]._text).toEqual("1.3");
      expect(tokens[i]._value).toEqual(1.3);
      expect(tokens[i]._constant).toEqual(true);

      i++;
      expect(tokens[i]._index).toEqual(12);
      expect(tokens[i]._text).toEqual("|");

      i++;
      expect(tokens[i]._index).toEqual(13);
      expect(tokens[i]._text).toEqual("f");

      i++;
      expect(tokens[i]._index).toEqual(14);
      expect(tokens[i]._text).toEqual(":");

      i++;
      expect(tokens[i]._index).toEqual(15);
      expect(tokens[i]._value).toEqual("a'c");

      i++;
      expect(tokens[i]._index).toEqual(21);
      expect(tokens[i]._text).toEqual(":");

      i++;
      expect(tokens[i]._index).toEqual(22);
      expect(tokens[i]._value).toEqual('d"e');
    });

    it("should tokenize identifiers with spaces around dots the same as without spaces", () => {
      function getText(t) {
        return t._text;
      }
      const spaces = lex("foo. bar . baz").map(getText);

      const noSpaces = lex("foo.bar.baz").map(getText);

      expect(spaces).toEqual(noSpaces);
    });

    it("should tokenize undefined", () => {
      const tokens = lex("undefined");

      const i = 0;

      expect(tokens[i]._index).toEqual(0);
      expect(tokens[i]._text).toEqual("undefined");
    });

    it("should tokenize quoted string", () => {
      const str = "['\\'', \"\\\"\"]";

      const tokens = lex(str);

      expect(tokens[1]._index).toEqual(1);
      expect(tokens[1]._value).toEqual("'");

      expect(tokens[3]._index).toEqual(7);
      expect(tokens[3]._value).toEqual('"');
    });

    it("should tokenize escaped quoted string", () => {
      const str = '"\\"\\n\\f\\r\\t\\v\\u00A0"';

      const tokens = lex(str);

      expect(tokens[0]._value).toEqual('"\n\f\r\t\v\u00A0');
    });

    it("should tokenize unicode", () => {
      const tokens = lex('"\\u00A0"');

      expect(tokens.length).toEqual(1);
      expect(tokens[0]._value).toEqual("\u00a0");
    });

    it("should ignore whitespace", () => {
      const tokens = lex("a \t \n \r b");

      expect(tokens[0]._text).toEqual("a");
      expect(tokens[1]._text).toEqual("b");
    });

    it("should tokenize relation and equality", () => {
      const tokens = lex("! == != < > <= >= === !==");

      expect(tokens[0]._text).toEqual("!");
      expect(tokens[1]._text).toEqual("==");
      expect(tokens[2]._text).toEqual("!=");
      expect(tokens[3]._text).toEqual("<");
      expect(tokens[4]._text).toEqual(">");
      expect(tokens[5]._text).toEqual("<=");
      expect(tokens[6]._text).toEqual(">=");
      expect(tokens[7]._text).toEqual("===");
      expect(tokens[8]._text).toEqual("!==");
    });

    it("should tokenize logical, nullish coalescing and ternary", () => {
      const tokens = lex("&& || ?? ? :");

      expect(tokens[0]._text).toEqual("&&");
      expect(tokens[1]._text).toEqual("||");
      expect(tokens[2]._text).toEqual("??");
      expect(tokens[3]._text).toEqual("?");
      expect(tokens[4]._text).toEqual(":");
    });

    it("should tokenize statements", () => {
      const tokens = lex("a;b;");

      expect(tokens[0]._text).toEqual("a");
      expect(tokens[1]._text).toEqual(";");
      expect(tokens[2]._text).toEqual("b");
      expect(tokens[3]._text).toEqual(";");
    });

    it("should tokenize function invocation", () => {
      const tokens = lex("a()");

      expect(tokens.map((t) => t._text)).toEqual(["a", "(", ")"]);
    });

    it("should tokenize method invocation", () => {
      const tokens = lex("a.b.c (d) - e.f()");

      expect(tokens.map((t) => t._text)).toEqual([
        "a",
        ".",
        "b",
        ".",
        "c",
        "(",
        "d",
        ")",
        "-",
        "e",
        ".",
        "f",
        "(",
        ")",
      ]);
    });

    it("should tokenize number", () => {
      const tokens = lex("0.5");

      expect(tokens[0]._value).toEqual(0.5);
    });

    it("should tokenize negative number", () => {
      let value = $parse("-0.5")($rootScope);

      expect(value).toEqual(-0.5);

      value = $parse("{a:-0.5}")($rootScope);
      expect(value).toEqual({ a: -0.5 });
    });

    it("should tokenize number with exponent", () => {
      let tokens = lex("0.5E-10");

      expect(tokens[0]._value).toEqual(0.5e-10);
      expect($parse("0.5E-10")($rootScope)).toEqual(0.5e-10);

      tokens = lex("0.5E+10");
      expect(tokens[0]._value).toEqual(0.5e10);
    });

    it("should throws exception for invalid exponent", () => {
      expect(() => {
        lex("0.5E-");
      }).toThrowError(/lexerr/);

      expect(() => {
        lex("0.5E-A");
      }).toThrowError(/lexerr/);
    });

    it("should tokenize number starting with a dot", () => {
      const tokens = lex(".5");

      expect(tokens[0]._value).toEqual(0.5);
    });

    it("should throw error on invalid unicode", () => {
      expect(() => {
        lex("'\\u1''bla'");
      }).toThrowError(/lexerr/);
    });
  });
});
