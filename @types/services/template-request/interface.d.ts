export interface TemplateRequestService {
  /**
   * Downloads a template using $http and, upon success, stores the
   * contents inside of $templateCache.
   *
   * If the HTTP request fails or the response data of the HTTP request is
   * empty then a $compile error will be thrown (unless
   * {ignoreRequestError} is set to true).
   *
   * @param templateUrl The template URL.
   *
   * @return   A promise whose value is the template content.
   */
  (templateUrl: string): Promise<string>;
}
