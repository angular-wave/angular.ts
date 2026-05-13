import type { HttpResponse, HttpService } from "../http/http.ts";
import type { RestBackend, RestRequest } from "./rest.ts";

/**
 * Default REST backend that adapts {@link RestRequest} objects to `$http`.
 *
 * This preserves the existing HTTP behavior for `$rest` resources while making
 * the transport swappable for custom resource backends.
 */
export class HttpRestBackend implements RestBackend {
  /** Creates a backend that executes REST requests through `$http`. */
  constructor(
    /** Runtime `$http` service used to execute requests. */
    private _$http: HttpService,
    /** Default `$http` options merged into every request. */
    private _options: Record<string, unknown> = {},
  ) {}

  /**
   * Send the REST request through `$http`.
   *
   * Request-specific options override backend defaults.
   */
  request<T>(request: RestRequest): Promise<HttpResponse<T>> {
    return this._$http<T>({
      method: request.method,
      url: request.url,
      data: request.data ?? null,
      params: request.params ?? {},
      ...this._options,
      ...(request.options ?? {}),
    });
  }
}
