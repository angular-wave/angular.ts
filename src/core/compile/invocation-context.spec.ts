import { createComponentTemplateInvocationLocals } from "./invocation-context.ts";

describe("component template invocation context", () => {
  it("exposes the component host as the public $element local", () => {
    const element = document.createElement("example-component");

    expect(createComponentTemplateInvocationLocals(element)).toEqual({
      $element: element,
    });
  });
});
