import { dealoc } from "./dom.js";
import { isObject } from "./utils.js";

/**
 * Triggers a browser event on the specified element.
 * @param {HTMLElement} element - The target element.
 * @param {Object} options - The event type and properties.
 */
export function browserTrigger(element, options) {
  const { type, ...eventProps } = options;

  let event;

  if (isObject(options) && type.startsWith("key")) {
    event = new KeyboardEvent(type, eventProps);
  } else if (isObject(options) && type.startsWith("mouse")) {
    event = new MouseEvent(type, eventProps);
  } else {
    event = new Event(type || options, { bubbles: true, cancelable: true });
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

export let ELEMENT;

/**
 * Helper for bootstraping content onto default element
 */
export function bootstrap(htmlContent, moduleName) {
  if (!ELEMENT) {
    ELEMENT = document.getElementById("app");
  }
  dealoc(ELEMENT);
  ELEMENT.innerHTML = htmlContent;

  return window.angular.bootstrap(ELEMENT, [moduleName || "myModule"]);
}
