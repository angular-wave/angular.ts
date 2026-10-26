/// <reference types="jasmine" />
import { StateObject } from "./state-object.ts";
import { normalizeNgViewTarget } from "./view-target.ts";

interface ContextFixture {
  name: string;
  parent?: ContextFixture | null;
}
function stateContext(context: ContextFixture): StateObject {
  const state = new StateObject({ name: context.name });
  state.parent = context.parent ? stateContext(context.parent) : null;
  return state;
}

describe("normalizeNgViewTarget", () => {
  it("defaults missing view names", () => {
    const context = { name: "child", parent: { name: "parent" } };
    expect(normalizeNgViewTarget(stateContext(context))).toEqual({
      ngViewName: "$default",
      ngViewContextAnchor: "parent",
    });
  });

  it("parses explicit at-suffix anchors", () => {
    const context = { name: "child" };

    expect(
      normalizeNgViewTarget(stateContext(context), "header@sidebar"),
    ).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "sidebar",
    });
  });

  it("supports relative view sugar", () => {
    const context = { name: "child", parent: { name: "parent" } };

    expect(normalizeNgViewTarget(stateContext(context), "^.header")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "parent",
    });

    expect(normalizeNgViewTarget(stateContext(context), "^.^.content")).toEqual(
      {
        ngViewName: "content",
        ngViewContextAnchor: "parent",
      },
    );
  });

  it("keeps dot anchor as current context", () => {
    const context = { name: "child", parent: { name: "parent" } };

    expect(normalizeNgViewTarget(stateContext(context), "header@.")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "child",
    });
  });

  it("strips bang-prefixed absolute targets", () => {
    const context = { name: "child", parent: { name: "parent" } };

    expect(normalizeNgViewTarget(stateContext(context), "!header@.")).toEqual({
      ngViewName: "header",
      ngViewContextAnchor: "",
    });
  });

  it("falls back to root for long relative chains", () => {
    const context = {
      name: "child",
      parent: { name: "parent", parent: null },
    };

    expect(normalizeNgViewTarget(stateContext(context), "^.^.^.main")).toEqual({
      ngViewName: "main",
      ngViewContextAnchor: "parent",
    });
  });

  it("falls back to root when context has no parent", () => {
    const context = { name: "root" };

    expect(normalizeNgViewTarget(stateContext(context), "^.")).toEqual({
      ngViewName: "",
      ngViewContextAnchor: "root",
    });
  });
});
