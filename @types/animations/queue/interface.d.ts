import { AnimateRunner } from "../runner/animate-runner.js";
export type QueuePhase =
  | "start"
  | "close"
  | "cancel"
  | "progress"
  | "dom"
  | string;
export interface QueueAnimationData {
  addClass: string | undefined;
  removeClass: string | undefined;
  from: Record<string, any> | undefined;
  to: Record<string, any> | undefined;
  [key: string]: any;
}
export interface AnimateQueueService {
  on(
    event: string,
    container: Element,
    callback?: (
      el: Element,
      phase: QueuePhase,
      data: QueueAnimationData,
    ) => void,
  ): void;
  off(
    event: string,
    container?: Element,
    callback?: (
      el: Element,
      phase: QueuePhase,
      data: QueueAnimationData,
    ) => void,
  ): void;
  pin(element: Element, parent: Element): void;
  push(
    element: Element,
    event: string,
    options: {
      addClass?: string | null;
      removeClass?: string | null;
      from?: Record<string, any> | null;
      to?: Record<string, any> | null;
      tempClasses?: string | string[] | null;
      domOperation?: () => void;
      [key: string]: any;
    },
    domOperation?: () => void,
  ): AnimateRunner;
}
export type AnimateEventCallback = (
  el: Element,
  phase: QueuePhase,
  data: QueueAnimationData,
) => void;
export interface CallbackRegistryEntry {
  node: Element;
  callback: AnimateEventCallback;
}
export type CallbackRegistry = Record<string, CallbackRegistryEntry[]>;
