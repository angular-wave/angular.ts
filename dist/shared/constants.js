const VALID_CLASS = "ng-valid";
const INVALID_CLASS = "ng-invalid";
const PRISTINE_CLASS = "ng-pristine";
const DIRTY_CLASS = "ng-dirty";
const UNTOUCHED_CLASS = "ng-untouched";
const TOUCHED_CLASS = "ng-touched";
const EMPTY_CLASS = "ng-empty";
const NOT_EMPTY_CLASS = "ng-not-empty";
// x prefix is being kept for view-directive.spec lines 1550, 565
const PREFIX_REGEXP = /^((?:x|data)[-])/i;
const SPECIAL_CHARS_REGEXP = /[-]+(.)/g;
const ALIASED_ATTR = {
    ngMinlength: "minlength",
    ngMaxlength: "maxlength",
    ngMin: "min",
    ngMax: "max",
    ngPattern: "pattern",
    ngStep: "step",
};

export { ALIASED_ATTR, DIRTY_CLASS, EMPTY_CLASS, INVALID_CLASS, NOT_EMPTY_CLASS, PREFIX_REGEXP, PRISTINE_CLASS, SPECIAL_CHARS_REGEXP, TOUCHED_CLASS, UNTOUCHED_CLASS, VALID_CLASS };
