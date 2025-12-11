export function escapeForRegexp(str: any): any;
/**
 * Adjusts a matcher string or RegExp into a proper RegExp.
 *
 * @param {string | RegExp | "self"} matcher
 * @returns {RegExp | "self"}
 */
export function adjustMatcher(
  matcher: string | RegExp | "self",
): RegExp | "self";
export function SceProvider(): void;
export class SceProvider {
  /**
   * @param {boolean=} value If provided, then enables/disables SCE application-wide.
   * @return {boolean} True if SCE is enabled, false otherwise.
   *
   * @description
   * Enables/disables SCE and returns the current value.
   */
  enabled: (value?: boolean | undefined, ...args: any[]) => boolean;
  $get: (string | (($parse: ng.ParseService, $sceDelegate: any) => any))[];
}
export namespace SCE_CONTEXTS {
  let HTML: string;
  let CSS: string;
  let MEDIA_URL: string;
  let URL: string;
  let RESOURCE_URL: string;
  let JS: string;
}
/**
 * `$sceDelegate` is a service that is used by the `$sce` service to provide {@link ng.$sce Strict
 * Contextual Escaping (SCE)} services to AngularTS.
 *
 * For an overview of this service and the functionality it provides in AngularTS, see the main
 * page for {@link ng.$sce SCE}. The current page is targeted for developers who need to alter how
 * SCE works in their application, which shouldn't be needed in most cases.
 *
 * <div class="alert alert-danger">
 * AngularTS strongly relies on contextual escaping for the security of bindings: disabling or
 * modifying this might cause cross site scripting (XSS) vulnerabilities. For libraries owners,
 * changes to this service will also influence users, so be extra careful and document your changes.
 * </div>
 *
 * Typically, you would configure or override the {@link ng.$sceDelegate $sceDelegate} instead of
 * the `$sce` service to customize the way Strict Contextual Escaping works in AngularTS.  This is
 * because, while the `$sce` provides numerous shorthand methods, etc., you really only need to
 * override 3 core functions (`trustAs`, `getTrusted` and `valueOf`) to replace the way things
 * work because `$sce` delegates to `$sceDelegate` for these operations.
 *
 * Refer {@link ng.$sceDelegateProvider $sceDelegateProvider} to configure this service.
 *
 * The default instance of `$sceDelegate` should work out of the box with little pain.  While you
 * can override it completely to change the behavior of `$sce`, the common case would
 * involve configuring the {@link ng.$sceDelegateProvider $sceDelegateProvider} instead by setting
 * your own trusted and banned resource lists for trusting URLs used for loading AngularTS resources
 * such as templates.  Refer {@link ng.$sceDelegateProvider#trustedResourceUrlList
 * $sceDelegateProvider.trustedResourceUrlList} and {@link
 * ng.$sceDelegateProvider#bannedResourceUrlList $sceDelegateProvider.bannedResourceUrlList}
 */
/**
 *
 * The `$sceDelegateProvider` provider allows developers to configure the {@link ng.$sceDelegate
 * $sceDelegate service}, used as a delegate for {@link ng.$sce Strict Contextual Escaping (SCE)}.
 *
 * The `$sceDelegateProvider` allows one to get/set the `trustedResourceUrlList` and
 * `bannedResourceUrlList` used to ensure that the URLs used for sourcing AngularTS templates and
 * other script-running URLs are safe (all places that use the `$sce.RESOURCE_URL` context). See
 * {@link ng.$sceDelegateProvider#trustedResourceUrlList
 * $sceDelegateProvider.trustedResourceUrlList} and
 * {@link ng.$sceDelegateProvider#bannedResourceUrlList $sceDelegateProvider.bannedResourceUrlList},
 *
 * For the general details about this service in AngularTS, read the main page for {@link ng.$sce
 * Strict Contextual Escaping (SCE)}.
 *
 * **Example**:  Consider the following case. <a name="example"></a>
 *
 * - your app is hosted at url `http://myapp.example.com/`
 * - but some of your templates are hosted on other domains you control such as
 *   `http://srv01.assets.example.com/`, `http://srv02.assets.example.com/`, etc.
 * - and you have an open redirect at `http://myapp.example.com/clickThru?...`.
 *
 * Here is what a secure configuration for this scenario might look like:
 *
 * ```
 *  angular.module('myApp', []).config(function($sceDelegateProvider) {
 *    $sceDelegateProvider.trustedResourceUrlList([
 *      // Allow same origin resource loads.
 *      'self',
 *      // Allow loading from our assets domain.  Notice the difference between * and **.
 *      'http://srv*.assets.example.com/**'
 *    ]);
 *
 *    // The banned resource URL list overrides the trusted resource URL list so the open redirect
 *    // here is blocked.
 *    $sceDelegateProvider.bannedResourceUrlList([
 *      'http://myapp.example.com/clickThru**'
 *    ]);
 *  });
 * ```
 * Note that an empty trusted resource URL list will block every resource URL from being loaded, and will require
 * you to manually mark each one as trusted with `$sce.trustAsResourceUrl`. However, templates
 * requested by {@link ng.$templateRequest $templateRequest} that are present in
 * {@link ng.$templateCache $templateCache} will not go through this check. If you have a mechanism
 * to populate your templates in that cache at config time, then it is a good idea to remove 'self'
 * from the trusted resource URL lsit. This helps to mitigate the security impact of certain types
 * of issues, like for instance attacker-controlled `ng-includes`.
 */
export class SceDelegateProvider {
  /**
   *
   * @param {Array=} value When provided, replaces the trustedResourceUrlList with
   *     the value provided.  This must be an array or null.  A snapshot of this array is used so
   *     further changes to the array are ignored.
   *     Follow {@link ng.$sce#resourceUrlPatternItem this link} for a description of the items
   *     allowed in this array.
   *
   * @return {Array} The currently set trusted resource URL array.
   *
   * @description
   * Sets/Gets the list trusted of resource URLs.
   *
   * The **default value** when no `trustedResourceUrlList` has been explicitly set is `['self']`
   * allowing only same origin resource requests.
   *
   * <div class="alert alert-warning">
   * **Note:** the default `trustedResourceUrlList` of 'self' is not recommended if your app shares
   * its origin with other apps! It is a good idea to limit it to only your application's directory.
   * </div>
   */
  trustedResourceUrlList: (value?: any[] | undefined, ...args: any[]) => any[];
  /**
   *
   * @param {Array=} bannedResourceUrlList When provided, replaces the `bannedResourceUrlList` with
   *     the value provided. This must be an array or null. A snapshot of this array is used so
   *     further changes to the array are ignored.</p><p>
   *     Follow {@link ng.$sce#resourceUrlPatternItem this link} for a description of the items
   *     allowed in this array.</p><p>
   *     The typical usage for the `bannedResourceUrlList` is to **block
   *     [open redirects](http://cwe.mitre.org/data/definitions/601.html)** served by your domain as
   *     these would otherwise be trusted but actually return content from the redirected domain.
   *     </p><p>
   *     Finally, **the banned resource URL list overrides the trusted resource URL list** and has
   *     the final say.
   *
   * @return {Array} The currently set `bannedResourceUrlList` array.
   *
   * @description
   * Sets/Gets the `bannedResourceUrlList` of trusted resource URLs.
   *
   * The **default value** when no trusted resource URL list has been explicitly set is the empty
   * array (i.e. there is no `bannedResourceUrlList`.)
   */
  bannedResourceUrlList: (value: any, ...args: any[]) => any[];
  $get: (
    | string
    | ((
        $injector: ng.InjectorService,
        $$sanitizeUri: import("../../core/sanitize/interface.ts").SanitizerFn,
        $exceptionHandler: ng.ExceptionHandlerService,
      ) => {
        trustAs: (type: string, trustedValue: any) => any;
        getTrusted: (type: string, maybeTrusted: any) => any;
        valueOf: (maybeTrusted: any) => any;
      })
  )[];
}
