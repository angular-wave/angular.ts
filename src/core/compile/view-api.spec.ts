import type {
  ComponentDefinition,
  DirectiveViewContext,
  ViewChild,
  ViewReader,
} from "../../interface.ts";
import {
  attrs,
  each,
  materializeComponentView,
  props,
  tagNS,
  tags,
  type KeyedView,
} from "./programmatic-view.ts";

describe("view API", () => {
  it("requires explicit arbitrary attributes and properties", () => {
    if (false) {
      // @ts-expect-error misspelled native properties are rejected.
      tags.input({ valeu: "invalid" });
      tags.input(attrs({ "custom-attribute": "allowed" }));
      tags.input(props({ customProperty: "allowed" }));
    }

    expect(true).toBeTrue();
  });

  it("makes component rendering strategies mutually exclusive", () => {
    const definition = { view: () => null } satisfies ComponentDefinition;

    if (false) {
      // @ts-expect-error a view cannot be combined with a template.
      const invalid: ComponentDefinition = { view: () => null, template: "" };
      void invalid;
    }

    expect(definition.view()).toBeNull();
  });

  it("omits both boolean child values", () => {
    const nodes = materializeComponentView([true, "visible", false]);

    expect(nodes.length).toBe(1);
    expect(nodes[0].textContent).toBe("visible");
  });

  it("types keyed bindings as view children", () => {
    const binding: KeyedView = each(
      () => [{ id: 1 }],
      (item) => item.id,
      (item: ViewReader<{ id: number }>) => String(item().id),
    );
    const child: ViewChild = binding;

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

  it("exposes host with a compatible element alias", () => {
    const host = document.createElement("div");
    const context = {
      controller: undefined,
      required: undefined,
      scope: {} as ng.Scope,
      host,
      element: host,
      transclude: undefined,
      onDestroy: () => () => undefined,
    } satisfies DirectiveViewContext;

    expect(context.host).toBe(context.element);
  });
});
