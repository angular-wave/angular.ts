/// <reference types="jasmine" />
import { Parser } from "./parser.ts";
import { Lexer } from "../lexer/lexer.ts";

describe("Parser", () => {
  it("can be contructed", () => {
    const parser = new Parser(new Lexer(), () => () => undefined);

    expect(parser).toBeDefined();
  });
});
