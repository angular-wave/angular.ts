import type { ComponentDefinition } from "../../interface.ts";
import { tags } from "./programmatic-view.ts";

// Compile-time contracts; browser tests live in view-api.spec.ts.
// @ts-expect-error misspelled native properties are rejected.
tags.input({ valeu: "invalid" });

// @ts-expect-error a view cannot be combined with a template.
const invalid: ComponentDefinition = { view: () => null, template: "" };
void invalid;
