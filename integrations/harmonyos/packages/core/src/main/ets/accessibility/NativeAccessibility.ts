import { nativeElements } from "../generated/NativeElementCatalog.ts";
import type { NativeElementName } from "../components/NativeRendererCatalog.ts";

export interface NativeAccessibilityState {
  readonly role: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly required: boolean;
  readonly selected: boolean;
  readonly checked: boolean | null;
  readonly value: string | number | null;
}

export function nativeAccessibilityState(
  name: NativeElementName,
  properties: Readonly<Record<string, unknown>>,
): NativeAccessibilityState {
  const definition = nativeElements[name];
  const labelProperty = definition.accessibility.labelProperty;
  const labelValue = properties[labelProperty];
  const value = properties.value;
  return {
    role: definition.accessibility.role,
    label: typeof labelValue === "string" ? labelValue : "",
    enabled: properties.enabled !== false,
    required: properties.required === true,
    selected: properties.selected === true,
    checked:
      typeof properties.checked === "boolean"
        ? properties.checked
        : typeof value === "boolean"
          ? value
          : null,
    value:
      typeof value === "string" || typeof value === "number" ? value : null,
  };
}
