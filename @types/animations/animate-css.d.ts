export function AnimateCssProvider(): void;
export class AnimateCssProvider {
  $get: (
    | string
    | ((
        $$animateCache: import("./cache/animate-cache.js").AnimateCache,
        $$rAFScheduler: import("./raf-scheduler.js").RafScheduler,
      ) => (
        element: any,
        initialOptions: any,
      ) => {
        $$willAnimate: boolean;
        start(): any;
        end: () => void;
      })
  )[];
}
