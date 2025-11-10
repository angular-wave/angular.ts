export function AnimateCssDriverProvider($$animationProvider: any): void;
export class AnimateCssDriverProvider {
  constructor($$animationProvider: any);
  /**
   * @returns {Function}
   */
  $get: (
    | string
    | ((
        $animateCss: any,
        $rootElement: Element,
      ) => (animationDetails: any) => any)
  )[];
}
export namespace AnimateCssDriverProvider {
  let $inject: string[];
}
