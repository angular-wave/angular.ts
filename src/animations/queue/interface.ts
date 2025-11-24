import { AnimateRunner } from "../runner/animate-runner.js";

export interface AnimateQueueService {
  on(
    event: string,
    container: Element,
    callback: (el: Element, phase: string, data: any) => void,
  ): void;

  off(
    event: string,
    container?: Element,
    callback?: (el: Element, phase: string, data: any) => void,
  ): void;

  pin(element: Element, parentElement: Element): void;

  push(
    element: Element,
    event: string,
    options: any,
    domOperation?: () => void,
  ): AnimateRunner;
}
