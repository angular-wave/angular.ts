// @ts-nocheck
/// <reference types="jasmine" />
import { normalizeNgViewTarget } from "./view-target.ts";

describe("normalizeNgViewTarget", () => {
  it("defaults missing view names", () => {
    const context = { name: "child", parent: { name: "parent" } };
    expect(normalizeNgViewTarget(context)).toEqual({
      ngViewName: "$default",
      ngViewContextAnchor: "parent",
    });
  });

  it("parses explicit at-suffix anchors", () => {
    const context = { name: "child" };

    expect(normalizeNgViewTarget(context, "header@sidebar")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "sidebar",
    });
  });

  it("supports relative view sugar", () => {
    const context = { name: "child", parent: { name: "parent" } };

    expect(normalizeNgViewTarget(context, "^.header")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "parent",
    });

    expect(normalizeNgViewTarget(context, "^.^.content")).toEqual({
      ngViewName: "content",
      ngViewContextAnchor: "parent",
    });
  });

  it("keeps dot anchor as current context", () => {
    const context = { name: "child", parent: { name: "parent" } };

    expect(normalizeNgViewTarget(context, "header@.")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "child",
    });
  });

  it("strips bang-prefixed absolute targets", () => {
    const context = { name: "child", parent: { name: "parent" } };

    expect(normalizeNgViewTarget(context, "!header@.")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "",
    });
  });

  it("falls back to root for long relative chains", () => {
    const context = {
      name: "child",
      parent: { name: "parent", parent: null },
    };

    expect(normalizeNgViewTarget(context, "^.^.^.main")).toEqual({
      ngViewName: "main",
      ngViewContextAnchor: "parent",
    });
  });

  it("falls back to root when context has no parent", () => {
    const context = { name: "root" };

    expect(normalizeNgViewTarget(context, "^.")).toEqual({
      ngViewName: "",
      ngViewContextAnchor: "root",
    });
  });
});
