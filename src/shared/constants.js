export const VALID_CLASS = "ng-valid";
export const INVALID_CLASS = "ng-invalid";
export const PRISTINE_CLASS = "ng-pristine";
export const DIRTY_CLASS = "ng-dirty";
export const UNTOUCHED_CLASS = "ng-untouched";
export const TOUCHED_CLASS = "ng-touched";
export const EMPTY_CLASS = "ng-empty";
export const NOT_EMPTY_CLASS = "ng-not-empty";

// x prefix is being kept for view-directive.spec lines 1550, 565
export const PREFIX_REGEXP = /^((?:x|data)[-])/i;
export const SPECIAL_CHARS_REGEXP = /[-]+(.)/g;

/** @type {Record<string, string>} */
export const ALIASED_ATTR = {
  ngMinlength: "minlength",
  ngMaxlength: "maxlength",
  ngMin: "min",
  ngMax: "max",
  ngPattern: "pattern",
  ngStep: "step",
};
