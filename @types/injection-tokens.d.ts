/**
 * Utility for mapping to service-names to providers
 * @param {String[]} services
 */
export function provider(services: string[]): string[];
/**
 * A helper list of tokens matching the standard injectables that come predefined in the core `ng` module.
 * These string tokens are commonly injected into services, directives, or components via `$inject`.
 *
 * Example:
 * ```js
 *
 * myDirective.$inject = [
 *   angular.$t._animate,
 *   angular.$t._templateRequest,
 * ];
 *
 * function myDirective($animate, $templateRequest) { ... }
 *
 * ```
 * @private
 * @type Readonly<Record<string, string>>
 */
export const $injectTokens: Readonly<Record<string, string>>;
