/**
 * Shared CSS class names and attribute normalization constants used across directives.
 */
export declare const VALID_CLASS = "ng-valid";
export declare const INVALID_CLASS = "ng-invalid";
export declare const PRISTINE_CLASS = "ng-pristine";
export declare const DIRTY_CLASS = "ng-dirty";
export declare const UNTOUCHED_CLASS = "ng-untouched";
export declare const TOUCHED_CLASS = "ng-touched";
export declare const EMPTY_CLASS = "ng-empty";
export declare const NOT_EMPTY_CLASS = "ng-not-empty";
/**
 * Matches supported vendor prefixes that should be stripped when normalizing
 * directive and attribute names.
 *
 * The `x-` prefix is intentionally retained for compatibility with existing
 * view directive fixtures.
 */
export declare const PREFIX_REGEXP: RegExp;
/**
 * Matches hyphenated characters so attribute names can be converted to camelCase.
 */
export declare const SPECIAL_CHARS_REGEXP: RegExp;
/**
 * Maps AngularTS validation aliases to the underlying native HTML attributes.
 */
export declare const ALIASED_ATTR: Record<string, string>;
