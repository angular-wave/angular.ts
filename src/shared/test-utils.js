import { dealoc } from "./dom.js";
/**
 * @typedef {(
 *   | ({ type: `key${string}` } & KeyboardEventInit)
 *   | ({ type: `mouse${string}` } & MouseEventInit)
 *   | ({ type: string } & EventInit)
 *   | string
 * )} BrowserTriggerOptions
 */

/**
 * @param {HTMLElement} element
 * @param {BrowserTriggerOptions} options
 */
export function browserTrigger(element, options) {
  let type;

  let eventProps = {};

  if (typeof options === "string") {
    type = options;
  } else {
    // eslint-disable-next-line prefer-destructuring
    type = options.type;
    eventProps = options;
  }

  let event;

  if (type.startsWith("key")) {
    event = new KeyboardEvent(
      type,
      /** @type {KeyboardEventInit} */ (eventProps),
    );
  } else if (type.startsWith("mouse")) {
    event = new MouseEvent(type, /** @type {MouseEventInit} */ (eventProps));
  } else {
    event = new Event(type, { bubbles: true, cancelable: true });
  }

  element.dispatchEvent(event);
}

/**
 * Delays execution for a specified number of milliseconds.
 * TODO remove
 *
 * @param {number} [timeout=0] - The number of milliseconds to wait. Defaults to 0.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export function wait(timeout = 0) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * @type {HTMLElement}
 */
export let ELEMENT;

/**
 * Helper for bootstraping content onto default element
 *
 * @param {string} htmlContent,
 * @param {string} moduleName
 *
 * @returns {ng.InjectorService}
 */
export function bootstrap(htmlContent, moduleName) {
  if (!ELEMENT) {
    ELEMENT = /** @type {HTMLElement} */ (document.getElementById("app"));
  }
  dealoc(ELEMENT);
  ELEMENT.innerHTML = htmlContent;

  return window.angular.bootstrap(ELEMENT, [moduleName || "myModule"]);
}
