/**
 * Minimal browser extern surface for jsinterop-generator.
 *
 * AngularTS's Closure externs intentionally reuse browser-native names instead
 * of duplicating DOM APIs. Closure Compiler supplies those browser externs when
 * compiling JavaScript; jsinterop-generator needs a small input file to resolve
 * the same names while generating Java bindings.
 */

/** @record */
function Event() {}

/** @record @extends {Event} */
function CustomEvent() {}

/** @record */
function Node() {}

/** @record @extends {Node} */
function Element() {}

/** @record @extends {Element} */
function HTMLElement() {}

/** @record @extends {Node} */
function Document() {}

/** @record */
function Window() {}

/** @record */
function Animation() {}

/** @record */
function Keyframe() {}

/** @record */
function KeyframeAnimationOptions() {}

/** @record */
function AbortSignal() {}

/** @record @template T */
function ReadableStream() {}

/** @record @template T */
function WritableStream() {}

/** @record */
function WebTransport() {}

/** @record */
function ArrayBuffer() {}

/** @record */
function ArrayBufferView() {}

/** @record */
function Uint8Array() {}

/** @typedef {?} */
var BufferSource;
