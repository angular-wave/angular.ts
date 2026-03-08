import { dealoc } from "./dom.ts";

/**
 * @typedef {(
 *   | ({ type: `key${string}` } & KeyboardEventInit)
 *   | ({ type: `mouse${string}` } & MouseEventInit)
 *   | ({ type: string } & EventInit)
 *   | string
 * )} BrowserTriggerOptions
 */
export type BrowserTriggerOptions =
  | (
      | ({ type: `key${string}` } & KeyboardEventInit)
      | ({ type: `mouse${string}` } & MouseEventInit)
      | ({ type: string } & EventInit)
    )
  | string;

/**
 * @param {HTMLElement} element
 * @param {BrowserTriggerOptions} options
 */
export function browserTrigger(
  element: HTMLElement,
  options: BrowserTriggerOptions,
): void {
  let type: string;
  let eventProps: EventInit | KeyboardEventInit | MouseEventInit = {};

  if (typeof options === "string") {
    type = options;
  } else {
    type = options.type;
    eventProps = options;
  }

  let event: Event;

  if (type.startsWith("key")) {
    event = new KeyboardEvent(type, eventProps as KeyboardEventInit);
  } else if (type.startsWith("mouse")) {
    event = new MouseEvent(type, eventProps as MouseEventInit);
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
export function wait(timeout = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * @type {HTMLElement}
 */
export let ELEMENT: HTMLElement;

/**
 * Helper for bootstraping content onto default element
 *
 * @param {string} htmlContent,
 * @param {string} moduleName
 *
 * @returns {ng.InjectorService}
 */
export function bootstrap(
  htmlContent: string,
  moduleName?: string,
): ng.InjectorService {
  if (!ELEMENT) {
    ELEMENT = document.getElementById("app") as HTMLElement;
  }

  dealoc(ELEMENT);
  ELEMENT.innerHTML = htmlContent;

  return window.angular.bootstrap(ELEMENT, [moduleName || "myModule"]);
}
