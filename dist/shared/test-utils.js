import { dealoc } from './dom.js';
import { isString } from './utils.js';

function browserTrigger(element, options) {
    let type;
    let eventProps = {};
    if (isString(options)) {
        type = options;
    }
    else {
        ({ type } = options);
        eventProps = options;
    }
    let event;
    if (type.startsWith("key")) {
        event = new KeyboardEvent(type, eventProps);
    }
    else if (type.startsWith("mouse")) {
        event = new MouseEvent(type, eventProps);
    }
    else {
        event = new Event(type, { bubbles: true, cancelable: true });
    }
    element.dispatchEvent(event);
}
/**
 * Delays execution for a specified number of milliseconds.
 * TODO remove
 *
 * @param [timeout=0] - The number of milliseconds to wait. Defaults to 0.
 * @returns A promise that resolves after the delay.
 */
function wait(timeout = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}
let ELEMENT;
/**
 * Helper for bootstraping content onto default element
 *
 */
function bootstrap(htmlContent, moduleName) {
    const element = ELEMENT ?? document.getElementById("app");
    if (!element) {
        throw new Error("Missing #app test element");
    }
    ELEMENT = element;
    dealoc(element);
    element.innerHTML = htmlContent;
    return window.angular.bootstrap(element, [moduleName ?? "myModule"]);
}

export { ELEMENT, bootstrap, browserTrigger, wait };
