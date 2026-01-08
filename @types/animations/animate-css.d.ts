export function AnimateCssProvider(): void;
export class AnimateCssProvider {
  $get: (
    | string
    | (($$rAFScheduler: import("./raf/raf-scheduler.js").RafScheduler) => (
        element: any,
        initialOptions: any,
      ) => {
        $$willAnimate: boolean;
        start(): any;
        end: () => void;
      })
  )[];
}
