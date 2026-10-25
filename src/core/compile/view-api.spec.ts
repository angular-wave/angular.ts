import type {
  ComponentDefinition,
  ProgrammaticViewContext,
  ProgrammaticViewChild,
  ProgrammaticViewReader,
} from "../../interface.ts";
import {
  attrs,
  each,
  materializeProgrammaticView,
  props,
  tagNS,
  tags,
  type ProgrammaticKeyedView,
} from "./programmatic-view.ts";

describe("view API", () => {
  it("requires explicit arbitrary attributes and properties", () => {
    const attributed = tags.input(attrs({ "custom-attribute": "allowed" }));
    const withProperty = tags.input(props({ customProperty: "allowed" }));

    expect(attributed.getAttribute("custom-attribute")).toBe("allowed");
    expect(
      (withProperty as HTMLInputElement & { customProperty: string })
        .customProperty,
    ).toBe("allowed");
  });

  it("makes component rendering strategies mutually exclusive", () => {
    const definition = { view: () => null } satisfies ComponentDefinition;

    expect(definition.view()).toBeNull();
  });

  it("omits both boolean child values", () => {
    const nodes = materializeProgrammaticView([true, "visible", false]);

    expect(nodes.length).toBe(1);
    expect(nodes[0].textContent).toBe("visible");
  });

  it("types keyed bindings as view children", () => {
    const binding: ProgrammaticKeyedView = each(
      () => [{ id: 1 }],
      (item) => item.id,
      (item: ProgrammaticViewReader<{ id: number }>) => String(item().id),
    );
    const child: ProgrammaticViewChild = binding;

    expect(child).toBe(binding);
  });

  it("returns typed namespaced elements", () => {
    const svg: SVGSVGElement = tags("http://www.w3.org/2000/svg").svg();
    const circle: SVGCircleElement = tagNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );

    expect(svg instanceof SVGSVGElement).toBeTrue();
    expect(circle instanceof SVGCircleElement).toBeTrue();
  });

  it("exposes the host element", () => {
    const host = document.createElement("div");
    const context = {
      controller: undefined,
      required: undefined,
      scope: {} as ng.Scope,
      host,
      transclude: undefined,
      onDestroy: () => () => undefined,
    } satisfies ProgrammaticViewContext;

    expect(context.host).toBe(context.host);
  });
});
