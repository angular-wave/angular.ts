/**
 *
 * Used for configuring the interpolation markup. Defaults to `{{` and `}}`.
 *
 * <div class="alert alert-danger">
 * This feature is sometimes used to mix different markup languages, e.g. to wrap an AngularTS
 * template within a Python Jinja template (or any other template language). Mixing templating
 * languages is **very dangerous**. The embedding template language will not safely escape AngularTS
 * expressions, so any user-controlled values in the template will cause Cross Site Scripting (XSS)
 * security bugs!
 * </div>
 */
export class InterpolateProvider {
  /**
   * @type {string} Symbol to denote start of expression in the interpolated string. Defaults to `{{`.
   */
  startSymbol: string;
  /**
   * @type {string} Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
   */
  endSymbol: string;
  $get: (
    | string
    | (($parse: ng.ParseService, $sce: ng.SceService) => ng.InterpolateService)
  )[];
}
