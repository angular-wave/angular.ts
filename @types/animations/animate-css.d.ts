export function AnimateCssProvider(): void;
export class AnimateCssProvider {
  $get: (
    | string
    | ((
        $$AnimateRunner: typeof import("./runner/animate-runner.js").AnimateRunner,
        $$animateCache: any,
        $$rAFScheduler: any,
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
