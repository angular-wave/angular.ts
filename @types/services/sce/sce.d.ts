type SceMatcher = RegExp | "self";
export declare const SCE_CONTEXTS: {
  readonly HTML: "html";
  readonly CSS: "css";
  readonly MEDIA_URL: "mediaUrl";
  readonly URL: "url";
  readonly RESOURCE_URL: "resourceUrl";
};
/**
 * @param {string} str
 */
export declare function escapeForRegexp(str: string): string;
/**
 * Adjusts a matcher string or RegExp into a proper RegExp.
 *
 * @param {string | RegExp | "self"} matcher
 * @returns {RegExp | "self"}
 */
export declare function adjustMatcher(
  matcher: string | RegExp | "self",
): SceMatcher;
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
export declare class SceDelegateProvider {
  trustedResourceUrlList: (value?: SceMatcher[] | null) => SceMatcher[];
  bannedResourceUrlList: (value?: SceMatcher[] | null) => SceMatcher[];
  $get: any[];
  constructor();
}
export declare function SceProvider(this: any): void;
export {};
