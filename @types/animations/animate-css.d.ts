export function AnimateCssProvider(): void;
export class AnimateCssProvider {
  $get: (() => (
    element: any,
    initialOptions: any,
  ) => {
    $$willAnimate: boolean;
    start(): any;
    end: () => void;
  })[];
}
