import { $injectTokens } from "../../injection-tokens.ts";
import {
  assert,
  isArray,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { BADARG } from "../../shared/validate.ts";
import { expandUriTemplate } from "./rfc.ts";
import type { HttpMethod, HttpResponse, HttpService } from "../http/http.ts";
import type { EntityClass, RestDefinition } from "./interface.ts";

type RestOptions = Record<string, any>;

export class RestService<T = any, ID = any> {
  static $nonscope = true;

  private _$http: HttpService;
  private _baseUrl: string;
  private _entityClass?: EntityClass<T>;
  private _options: RestOptions;

  constructor(
    $http: HttpService,
    baseUrl: string,
    entityClass?: EntityClass<T>,
    options: RestOptions = {},
  ) {
    assert(isString(baseUrl) && baseUrl.length > 0, "baseUrl required");

    this._$http = $http;
    this._baseUrl = baseUrl;
    this._entityClass = entityClass;
    this._options = options;
  }

  buildUrl(template: string, params: Record<string, any>): string {
    return expandUriTemplate(template, params || {});
  }

  private mapEntity(data: unknown): T | unknown {
    if (!data) return data;

    return this._entityClass ? new this._entityClass(data) : data;
  }

  async list(params: Record<string, any> = {}): Promise<T[]> {
    const url = this.buildUrl(this._baseUrl, params);
    const resp = await this.request<unknown[]>("GET", url, null, params);

    if (!isArray(resp.data)) return [];

    return resp.data.map((data) => this.mapEntity(data) as T);
  }

  async read(
    id: ID,
    params: Record<string, any> = {},
  ): Promise<T | unknown | null> {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = this.buildUrl(`${this._baseUrl}/${id}`, params);
    const resp = await this.request<unknown>("GET", url, null, params);

    return this.mapEntity(resp.data) ?? null;
  }

  async create(item: T): Promise<T | unknown> {
    assert(!isNullOrUndefined(item), `${BADARG}:item ${item}`);
    const resp = await this.request<unknown>("POST", this._baseUrl, item);

    return this.mapEntity(resp.data);
  }

  async update(id: ID, item: Partial<T>): Promise<T | unknown | null> {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      const resp = await this.request<unknown>("PUT", url, item);

      return this.mapEntity(resp.data) ?? null;
    } catch {
      return null;
    }
  }

  async delete(id: ID): Promise<boolean> {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      await this.request("DELETE", url);

      return true;
    } catch {
      return false;
    }
  }

  private async request<R>(
    method: HttpMethod,
    url: string,
    data: unknown = null,
    params: Record<string, any> = {},
  ): Promise<HttpResponse<R>> {
    return this._$http<R>({
      method,
      url,
      data,
      params,
      ...this._options,
    });
  }
}

type RestFactory = <T = any, ID = any>(
  baseUrl: string,
  entityClass?: EntityClass<T>,
  options?: RestOptions,
) => RestService<T, ID>;

export class RestProvider {
  private _definitions: RestDefinition<any>[];

  $get: [string, ($http: HttpService) => RestFactory];

  constructor() {
    this._definitions = [];
    this.$get = [
      $injectTokens._http,
      ($http: HttpService): RestFactory => {
        const services = new Map<string, RestService<any, any>>();

        const factory: RestFactory = (baseUrl, entityClass, options = {}) =>
          new RestService($http, baseUrl, entityClass, options);

        for (const def of this._definitions) {
          services.set(
            def.name,
            factory(def.url, def.entityClass, def.options),
          );
        }

        return factory;
      },
    ];
  }

  rest<T>(
    name: string,
    url: string,
    entityClass?: EntityClass<T>,
    options: RestOptions = {},
  ): void {
    this._definitions.push({ name, url, entityClass, options });
  }
}
