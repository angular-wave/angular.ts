import { Parser } from "./parser.ts";

describe("Parser", () => {
  it("can be contructed", () => {
    const parser = new Parser();
    expect(parser).toBeDefined();
  });
});
