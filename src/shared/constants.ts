/**
 * Shared CSS class names and attribute normalization constants used across directives.
 */
export const VALID_CLASS = "ng-valid";
export const INVALID_CLASS = "ng-invalid";
export const PRISTINE_CLASS = "ng-pristine";
export const DIRTY_CLASS = "ng-dirty";
export const UNTOUCHED_CLASS = "ng-untouched";
export const TOUCHED_CLASS = "ng-touched";
export const EMPTY_CLASS = "ng-empty";
export const NOT_EMPTY_CLASS = "ng-not-empty";

/**
 * Matches supported vendor prefixes that should be stripped when normalizing
 * directive and attribute names.
 *
 * The `x-` prefix is intentionally retained for compatibility with existing
 * view directive fixtures.
 */
export const PREFIX_REGEXP = /^((?:x|data)[-])/i;

/**
 * Matches hyphenated characters so attribute names can be converted to camelCase.
 */
export const SPECIAL_CHARS_REGEXP = /[-]+(.)/g;

/**
 * Maps AngularTS validation aliases to the underlying native HTML attributes.
 */
export const ALIASED_ATTR: Record<string, string> = {
  ngMinlength: "minlength",
  ngMaxlength: "maxlength",
  ngMin: "min",
  ngMax: "max",
  ngPattern: "pattern",
  ngStep: "step",
};
