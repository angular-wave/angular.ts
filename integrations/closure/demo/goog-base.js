/** @const */
const goog = {};

/**
 * Declares a Closure module namespace for demo application files.
 *
 * This tiny compiler-only primitive is included before demo code so
 * `--process_closure_primitives` can rewrite `goog.module(...)` without
 * shipping a Closure Library runtime to the browser.
 *
 * @param {string} name
 * @return {void}
 */
goog.module = function (name) {};

/**
 * Imports a Closure module namespace for demo application files.
 *
 * @param {string} name
 * @return {*}
 */
goog.require = function (name) {};
