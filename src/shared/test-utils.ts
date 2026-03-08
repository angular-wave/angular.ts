import { dealoc } from "./dom.ts";

export type BrowserTriggerOptions =
  | (
      | ({ type: `key${string}` } & KeyboardEventInit)
      | ({ type: `mouse${string}` } & MouseEventInit)
      | ({ type: string } & EventInit)
    )
  | string;

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

export function wait(timeout = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export let ELEMENT: HTMLElement;

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
