import type { ComponentDefinition } from "../../interface.ts";
import { tags } from "./programmatic-view.ts";

// Compile-time contracts; browser tests live in view-api.spec.ts.
// @ts-expect-error misspelled native properties are rejected.
tags.input({ valeu: "invalid" });

// @ts-expect-error a view cannot be combined with a template.
const invalid: ComponentDefinition = { view: () => null, template: "" };
void invalid;

// Empty native properties are supported in static values and reactive readers.
tags.input({ value: () => undefined, placeholder: () => null, disabled: null });
tags.button({
  onclick: {
    handleEvent(event: MouseEvent) {
      void event.clientX;
    },
  },
  onmousedown(event) {
    const x: number = event.clientX;
    void x;
  },
  onfocus: null,
  onblur: undefined,
});

// @ts-expect-error reactive native properties retain their actual value type.
tags.input({ value: () => true });
// @ts-expect-error native event bindings retain their actual event type.
tags.button({
  onclick(event: KeyboardEvent) {
    void event.key;
  },
});
