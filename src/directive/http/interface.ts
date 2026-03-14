/**
 * Possible values for `data-swap` attribute
 */
export const SwapMode = {
  /** (default) Replaces the contents inside the element */
  innerHTML: "innerHTML",

  /** Replaces the entire element, including the tag itself */
  outerHTML: "outerHTML",

  /** Inserts plain text (without parsing HTML) */
  textContent: "textContent",

  /** Inserts HTML immediately before the element itself */
  beforebegin: "beforebegin",

  /** Inserts HTML inside the element, before its first child */
  afterbegin: "afterbegin",

  /** Inserts HTML inside the element, after its last child */
  beforeend: "beforeend",

  /** Inserts HTML immediately after the element itself */
  afterend: "afterend",

  /** Removes the element entirely */
  delete: "delete",

  /** Performs no insertion (no-op) */
  none: "none",
} as const;

/**
 * Union type representing all possible DOM insertion modes.
 */
export type SwapModeType = keyof typeof SwapMode;
