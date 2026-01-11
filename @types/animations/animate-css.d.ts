export function AnimateCssProvider(): void;
export class AnimateCssProvider {
  $get: (() => (
    element: HTMLElement,
    initialOptions: ng.AnimationOptions,
  ) => {
    _willAnimate: boolean;
    start(): any;
    end: () => void;
  })[];
}
