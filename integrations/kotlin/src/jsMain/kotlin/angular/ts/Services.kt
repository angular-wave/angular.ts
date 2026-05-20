package angular.ts

import angular.ts.generated.Angular as RawAngular
import angular.ts.generated.AnchorScrollService as RawAnchorScrollService
import angular.ts.generated.AriaService as RawAriaService
import angular.ts.generated.CompileService as RawCompileService
import angular.ts.generated.ControllerService as RawControllerService
import angular.ts.generated.CookieService as RawCookieService
import angular.ts.generated.ExceptionHandlerService as RawExceptionHandlerService
import angular.ts.generated.FilterProvider as RawFilterProvider
import angular.ts.generated.FilterService as RawFilterService
import angular.ts.generated.HttpParamSerializerProvider as RawHttpParamSerializerProvider
import angular.ts.generated.HttpParamSerializerSerService as RawHttpParamSerializerSerService
import angular.ts.generated.HttpService as RawHttpService
import angular.ts.generated.InterpolateService as RawInterpolateService
import angular.ts.generated.LocationService as RawLocationService
import angular.ts.generated.LogService as RawLogService
import angular.ts.generated.ParseService as RawParseService
import angular.ts.generated.ProvideService as RawProvideService
import angular.ts.generated.RestFactory as RawRestFactory
import angular.ts.generated.RestService as RawRestService
import angular.ts.generated.TemplateCacheService as RawTemplateCacheService
import angular.ts.generated.TemplateRequestService as RawTemplateRequestService
import org.w3c.dom.Element

public enum class SameSite(
    internal val raw: String,
) {
    Lax("Lax"),
    Strict("Strict"),
    None("None"),
}

public data class CookieOptions public constructor(
    public val path: String? = null,
    public val domain: String? = null,
    public val expires: Any? = null,
    public val secure: Boolean? = null,
    public val sameSite: SameSite? = null,
)

public enum class StorageType(
    public val raw: String,
) {
    Local("local"),
    Session("session"),
    Cookie("cookie"),
    Custom("custom"),
}

public enum class DateFilterFormat(
    public val raw: String,
) {
    Short("short"),
    Medium("medium"),
    Long("long"),
    Full("full"),
    ShortDate("shortDate"),
    MediumDate("mediumDate"),
    LongDate("longDate"),
    FullDate("fullDate"),
    ShortTime("shortTime"),
    MediumTime("mediumTime"),
    LongTime("longTime"),
    FullTime("fullTime"),
}

public enum class HttpMethod(
    public val raw: String,
) {
    Get("GET"),
    Post("POST"),
    Put("PUT"),
    Delete("DELETE"),
    Patch("PATCH"),
    Head("HEAD"),
    Options("OPTIONS"),
}

public enum class HttpResponseStatus(
    public val raw: String,
) {
    Complete("complete"),
    Error("error"),
    Timeout("timeout"),
    Abort("abort"),
}

public enum class HttpResponseType(
    public val raw: String,
) {
    ArrayBuffer("arraybuffer"),
    Blob("blob"),
    Document("document"),
    Json("json"),
    Stream("stream"),
    Text("text"),
}

public enum class RestCacheStrategy(
    public val raw: String,
) {
    CacheFirst("cache-first"),
    NetworkFirst("network-first"),
    StaleWhileRevalidate("stale-while-revalidate"),
}

public enum class RestResponseSource(
    public val raw: String,
) {
    Network("network"),
    Cache("cache"),
}

public data class DateFilterOptions public constructor(
    public val locale: String? = null,
    public val intl: Map<String, Any?> = emptyMap(),
)

public data class NumberFilterOptions public constructor(
    public val locale: String? = null,
    public val intl: Map<String, Any?> = emptyMap(),
)

public data class CurrencyFilterOptions public constructor(
    public val locale: String? = null,
    public val intl: Map<String, Any?> = emptyMap(),
)

public data class RelativeTimeFilterOptions public constructor(
    public val locale: String? = null,
    public val intl: Map<String, Any?> = emptyMap(),
)

public typealias HttpHeaders = Map<String, String>

public typealias HttpParams = Map<String, Any?>

public typealias HttpParamSerializer = (HttpParams?) -> String

public typealias HttpRequestTransformer = (
    data: Any?,
    headers: HttpHeaders,
) -> Any?

public typealias HttpResponseTransformer = (
    data: Any?,
    headers: HttpHeaders,
    status: Int,
) -> Any?

public typealias EntityClass<T> = (Any?) -> T

public data class HttpRequestConfigHeaders public constructor(
    public val common: HttpHeaders? = null,
    public val get: HttpHeaders? = null,
    public val post: HttpHeaders? = null,
    public val put: HttpHeaders? = null,
    public val patch: HttpHeaders? = null,
)

public data class HttpProviderDefaults public constructor(
    public val cache: Any? = null,
    public val transformRequest: Any? = null,
    public val transformResponse: Any? = null,
    public val headers: HttpRequestConfigHeaders? = null,
    public val xsrfHeaderName: String? = null,
    public val xsrfCookieName: String? = null,
    public val withCredentials: Boolean? = null,
    public val paramSerializer: Any? = null,
)

public data class RequestShortcutConfig public constructor(
    public val defaults: HttpProviderDefaults = HttpProviderDefaults(),
    public val cache: Any? = null,
    public val transformRequest: Any? = null,
    public val transformResponse: Any? = null,
    public val headers: HttpRequestConfigHeaders? = null,
    public val xsrfHeaderName: String? = null,
    public val xsrfCookieName: String? = null,
    public val withCredentials: Boolean? = null,
    public val paramSerializer: Any? = null,
    public val params: HttpParams? = null,
    public val data: Any? = null,
    public val timeout: Any? = null,
    public val responseType: HttpResponseType? = null,
)

public data class RequestConfig public constructor(
    public val method: HttpMethod,
    public val url: String,
    public val shortcut: RequestShortcutConfig = RequestShortcutConfig(),
    public val cache: Any? = null,
    public val transformRequest: Any? = null,
    public val transformResponse: Any? = null,
    public val headers: HttpRequestConfigHeaders? = null,
    public val xsrfHeaderName: String? = null,
    public val xsrfCookieName: String? = null,
    public val withCredentials: Boolean? = null,
    public val paramSerializer: Any? = null,
    public val params: HttpParams? = null,
    public val data: Any? = null,
    public val timeout: Any? = null,
    public val responseType: HttpResponseType? = null,
    public val eventHandlers: Map<String, Any?>? = null,
    public val uploadEventHandlers: Map<String, Any?>? = null,
)

public data class HttpResponse<T> public constructor(
    public val data: T,
    public val status: Int,
    public val headers: HttpHeaders = emptyMap(),
    public val config: RequestConfig? = null,
    public val statusText: String = "",
    public val xhrStatus: HttpResponseStatus? = null,
) {
    internal companion object {
        internal fun <T> fromJs(raw: dynamic): HttpResponse<T> =
            HttpResponse(
                data = raw.data.unsafeCast<T>(),
                status = raw.status.unsafeCast<Int>(),
                statusText = raw.statusText.unsafeCast<String?>() ?: "",
                xhrStatus = httpResponseStatus(raw.xhrStatus),
            )
    }
}

public data class RestDefinition<T> public constructor(
    public val name: String,
    public val url: String,
    public val entityClass: EntityClass<T>? = null,
    public val options: RestOptions = RestOptions(),
)

public data class RestRequest public constructor(
    public val method: HttpMethod,
    public val url: String,
    public val collectionUrl: String? = null,
    public val id: Any? = null,
    public val data: Any? = null,
    public val params: Map<String, Any?>? = null,
    public val options: Map<String, Any?>? = null,
) {
    internal companion object {
        internal fun fromJs(raw: dynamic): RestRequest =
            RestRequest(
                method = httpMethod(raw.method),
                url = raw.url.unsafeCast<String>(),
                collectionUrl = raw.collectionUrl.unsafeCast<String?>(),
                id = raw.id,
                data = raw.data,
            )
    }
}

public data class RestResponse<T> public constructor(
    public val data: T,
    public val source: RestResponseSource? = null,
    public val stale: Boolean = false,
    public val status: Int? = null,
    public val headers: HttpHeaders? = null,
    public val config: RequestConfig? = null,
    public val statusText: String? = null,
    public val xhrStatus: HttpResponseStatus? = null,
) {
    internal companion object {
        internal fun <T> fromJs(raw: dynamic): RestResponse<T> =
            RestResponse(
                data = raw.data.unsafeCast<T>(),
                source = restResponseSource(raw.source),
                stale = raw.stale.unsafeCast<Boolean?>() ?: false,
                status = raw.status.unsafeCast<Int?>(),
                statusText = raw.statusText.unsafeCast<String?>(),
                xhrStatus = httpResponseStatus(raw.xhrStatus),
            )
    }
}

public data class RestRevalidateEvent<T> public constructor(
    public val key: String,
    public val request: RestRequest,
    public val response: RestResponse<T>,
) {
    internal companion object {
        internal fun <T> fromJs(raw: dynamic): RestRevalidateEvent<T> =
            RestRevalidateEvent(
                key = raw.key.unsafeCast<String>(),
                request = RestRequest.fromJs(raw.request),
                response = RestResponse.fromJs(raw.response),
            )
    }
}

public interface RestBackend {
    public fun request(request: RestRequest): Any?
}

public interface RestCacheStore {
    public fun get(key: String): Any?

    public fun set(
        key: String,
        response: RestResponse<*>,
    ): Any?

    public fun delete(key: String): Any?

    public fun deletePrefix(prefix: String): Any?
}

public data class CachedRestBackendOptions public constructor(
    public val network: RestBackend,
    public val cache: RestCacheStore,
    public val strategy: RestCacheStrategy,
    public val onRevalidate: ((RestRevalidateEvent<Any?>) -> Unit)? = null,
)

public data class RestOptions public constructor(
    public val backend: RestBackend? = null,
    public val extra: Map<String, Any?> = emptyMap(),
)

public data class EntryFilterItem<TKey, TValue> public constructor(
    public val key: TKey,
    public val value: TValue,
)

public interface StorageBackend {
    public fun get(key: String): String?

    public fun set(
        key: String,
        value: String,
    )

    public fun remove(key: String)
}

public class AngularService internal constructor(
    internal val raw: RawAngular,
) {
    public val version: String
        get() = raw.version
}

public class AnchorScrollService internal constructor(
    internal val raw: RawAnchorScrollService,
) {
    public var yOffset: Any?
        get() = raw.yOffset
        set(value) {
            raw.yOffset = value
        }

    public operator fun invoke(target: Any? = undefined) {
        callJsFunction(raw, null, arrayOf(target))
    }
}

public class AriaService internal constructor(
    internal val raw: RawAriaService,
) {
    public fun config(key: String): Boolean =
        raw.config(key)
}

public class CompileService internal constructor(
    internal val raw: RawCompileService,
) {
    public fun compile(element: Element): (Scope<Any>) -> Any? {
        val link = callJsFunction(raw, null, arrayOf(element))

        return { scope -> callJsFunction(link, null, arrayOf(scope.unsafe)) }
    }
}

public class ControllerService internal constructor(
    internal val raw: RawControllerService,
)

public class CookieService internal constructor(
    internal val raw: RawCookieService,
) {
    public fun get(key: String): String? =
        raw.asDynamic().get(key).unsafeCast<String?>()

    public fun getObject(key: String): Any? =
        raw.getObject(key)

    public fun getAll(): dynamic =
        raw.getAll()

    public fun put(
        key: String,
        value: String,
        options: CookieOptions = CookieOptions(),
    ) {
        raw.put(key, value, options.toJs())
    }

    public fun putObject(
        key: String,
        value: Any,
        options: CookieOptions = CookieOptions(),
    ) {
        raw.putObject(key, value, options.toJs())
    }

    public fun remove(
        key: String,
        options: CookieOptions = CookieOptions(),
    ) {
        raw.remove(key, options.toJs())
    }
}

public class ExceptionHandlerService internal constructor(
    internal val raw: RawExceptionHandlerService,
) {
    public fun handle(error: Any?): Any? =
        callJsFunction(raw, null, arrayOf(error))
}

public class FilterFunction internal constructor(
    internal val raw: dynamic,
) {
    public operator fun invoke(
        input: Any?,
        vararg args: Any?,
    ): Any? =
        callJsFunction(raw, null, arrayOf(input, *args))
}

public class FilterProvider internal constructor(
    internal val raw: RawFilterProvider,
)

public class FilterService internal constructor(
    internal val raw: RawFilterService,
) {
    public operator fun invoke(name: String): FilterFunction =
        FilterFunction(callJsFunction(raw, null, arrayOf(name)))

    public fun number(
        input: Any?,
        options: NumberFilterOptions? = null,
        locale: String? = null,
    ): String {
        val number = invoke("number")

        return when {
            options == null && locale == null -> number(input)
            locale == null -> number(input, options?.toJs())
            else -> number(input, options?.toJs(), locale)
        }.unsafeCast<String>()
    }

    public fun currency(
        input: Any?,
        currency: String = "USD",
        options: CurrencyFilterOptions? = null,
        locale: String? = null,
    ): String {
        val currencyFilter = invoke("currency")

        return when {
            options == null && locale == null -> currencyFilter(input, currency)
            locale == null -> currencyFilter(input, currency, options?.toJs())
            else -> currencyFilter(input, currency, options?.toJs(), locale)
        }.unsafeCast<String>()
    }

    public fun date(
        input: Any?,
        format: DateFilterFormat? = null,
        timezone: Any? = null,
    ): String {
        val date = invoke("date")

        return when {
            format == null && timezone == null -> date(input)
            timezone == null -> date(input, format?.raw)
            else -> date(input, format?.raw, timezone)
        }.unsafeCast<String>()
    }

    public fun date(
        input: Any?,
        options: DateFilterOptions,
        timezone: Any? = null,
    ): String {
        val date = invoke("date")

        return if (timezone == null) {
            date(input, options.toJs())
        } else {
            date(input, options.toJs(), timezone)
        }.unsafeCast<String>()
    }

    public fun relativeTime(
        input: Any?,
        unit: String = "day",
        options: RelativeTimeFilterOptions? = null,
        locale: String? = null,
    ): String {
        val relativeTime = invoke("relativeTime")

        return when {
            options == null && locale == null -> relativeTime(input, unit)
            locale == null -> relativeTime(input, unit, options?.toJs())
            else -> relativeTime(input, unit, options?.toJs(), locale)
        }.unsafeCast<String>()
    }
}

public class HttpParamSerializerProvider internal constructor(
    internal val raw: RawHttpParamSerializerProvider,
)

public class HttpParamSerializerService internal constructor(
    internal val raw: RawHttpParamSerializerSerService,
) {
    public operator fun invoke(params: HttpParams? = null): String =
        callJsFunction(raw, null, arrayOf(params?.toJsRecord())).unsafeCast<String>()
}

public class HttpProvider internal constructor(
    internal val raw: dynamic,
) {
    public fun setDefaults(defaults: HttpProviderDefaults): HttpProvider {
        raw.defaults = defaults.toJs()
        return this
    }
}

public class HttpPromise<T> internal constructor(
    internal val raw: dynamic,
) {
    public fun then(
        onFulfilled: (HttpResponse<T>) -> Any?,
        onRejected: ((Any?) -> Any?)? = null,
    ): dynamic {
        val fulfilled = { response: dynamic ->
            onFulfilled(HttpResponse.fromJs(response))
        }

        return if (onRejected == null) {
            raw.then(fulfilled)
        } else {
            raw.then(fulfilled, onRejected)
        }
    }

    public fun catchError(onRejected: (Any?) -> Any?): dynamic =
        raw.asDynamic().catch(onRejected)
}

public class HttpService internal constructor(
    internal val raw: RawHttpService,
) {
    public val pendingRequestsCount: Int
        get() = raw.pendingRequests.size

    public fun setDefaults(defaults: HttpProviderDefaults): HttpService {
        raw.defaults = defaults.toJs()
        return this
    }

    public fun <T> request(config: RequestConfig): HttpPromise<T> =
        HttpPromise(raw(config.toJs()))

    public fun <T> get(
        url: String,
        config: RequestShortcutConfig = RequestShortcutConfig(),
    ): HttpPromise<T> =
        HttpPromise(raw.get(url, config.toJs()))

    public fun <T> delete(
        url: String,
        config: RequestShortcutConfig = RequestShortcutConfig(),
    ): HttpPromise<T> =
        HttpPromise(raw.delete(url, config.toJs()))

    public fun <T> head(
        url: String,
        config: RequestShortcutConfig = RequestShortcutConfig(),
    ): HttpPromise<T> =
        HttpPromise(raw.head(url, config.toJs()))

    public fun <T> post(
        url: String,
        data: Any?,
        config: RequestShortcutConfig = RequestShortcutConfig(),
    ): HttpPromise<T> =
        HttpPromise(raw.post(url, data, config.toJs()))

    public fun <T> put(
        url: String,
        data: Any?,
        config: RequestShortcutConfig = RequestShortcutConfig(),
    ): HttpPromise<T> =
        HttpPromise(raw.put(url, data, config.toJs()))

    public fun <T> patch(
        url: String,
        data: Any?,
        config: RequestShortcutConfig = RequestShortcutConfig(),
    ): HttpPromise<T> =
        HttpPromise(raw.patch(url, data, config.toJs()))
}

public class RestProvider internal constructor(
    internal val raw: dynamic,
)

public class RestFactory internal constructor(
    internal val raw: RawRestFactory,
) {
    public operator fun <T, ID> invoke(
        baseUrl: String,
        entityClass: EntityClass<T>? = null,
        options: RestOptions = RestOptions(),
    ): RestService<T, ID> =
        RestService(
            callJsFunction(raw, null, arrayOf(baseUrl, entityClass, options.toJs()))
                .unsafeCast<RawRestService<T, ID>>(),
        )
}

public class RestService<T, ID> internal constructor(
    internal val raw: RawRestService<T, ID>,
) {
    public fun buildUrl(
        template: String,
        params: Map<String, Any?> = emptyMap(),
    ): String =
        raw.buildUrl(template, params.toJsRecord())

    public fun list(params: Map<String, Any?>? = null): Any? =
        raw.list(params?.toJsRecord())

    public fun get(
        id: ID,
        params: Map<String, Any?>? = null,
    ): Any? =
        raw.get(id, params?.toJsRecord())

    public fun create(item: T): Any? =
        raw.create(item)

    public fun update(
        id: ID,
        item: Any?,
    ): Any? =
        raw.update(id, item)

    public fun delete(id: ID): Any? =
        raw.delete(id)
}

public class Interpolation internal constructor(
    private val raw: dynamic,
) {
    public operator fun invoke(context: Scope<*>): Any? =
        callJsFunction(raw, null, arrayOf(context.unsafe))

    public operator fun invoke(context: Any?): Any? =
        callJsFunction(raw, null, arrayOf(context))
}

public class InterpolateService internal constructor(
    internal val raw: RawInterpolateService,
) {
    public fun startSymbol(): String =
        raw.startSymbol()

    public fun endSymbol(): String =
        raw.endSymbol()

    public operator fun invoke(
        text: String,
        mustHaveExpression: Boolean = false,
    ): Interpolation? {
        val interpolation = callJsFunction(raw, null, arrayOf(text, mustHaveExpression))

        return if (js("interpolation == null").unsafeCast<Boolean>()) {
            null
        } else {
            Interpolation(interpolation)
        }
    }
}

public class LogService internal constructor(
    internal val raw: RawLogService,
) {
    public fun debug(vararg values: Any?) {
        callJsFunction(raw.asDynamic().debug, raw, values)
    }

    public fun error(vararg values: Any?) {
        callJsFunction(raw.asDynamic().error, raw, values)
    }

    public fun info(vararg values: Any?) {
        callJsFunction(raw.asDynamic().info, raw, values)
    }

    public fun log(vararg values: Any?) {
        callJsFunction(raw.asDynamic().log, raw, values)
    }

    public fun warn(vararg values: Any?) {
        callJsFunction(raw.asDynamic().warn, raw, values)
    }
}

public class LocationService internal constructor(
    internal val raw: RawLocationService,
) {
    public val url: String
        get() = raw.getUrl()

    public val path: String
        get() = raw.getPath()

    public val hash: String
        get() = raw.getHash()

    public val search: dynamic
        get() = raw.getSearch()

    public fun setUrl(url: String): LocationService {
        raw.setUrl(url)
        return this
    }

    public fun setPath(path: Any?): LocationService {
        raw.setPath(path)
        return this
    }

    public fun setHash(hash: Any?): LocationService {
        raw.setHash(hash)
        return this
    }

    public fun setSearch(
        search: Any?,
        value: Any? = undefined,
    ): LocationService {
        raw.setSearch(search, value)
        return this
    }

    public fun setState(state: Any?): LocationService {
        raw.setState(state)
        return this
    }
}

public class ParsedExpression internal constructor(
    private val raw: dynamic,
) {
    public operator fun invoke(context: Scope<*>): Any? =
        callJsFunction(raw, null, arrayOf(context.unsafe))

    public operator fun invoke(context: Any?): Any? =
        callJsFunction(raw, null, arrayOf(context))
}

public class ParseService internal constructor(
    internal val raw: RawParseService,
) {
    public operator fun invoke(expression: String): ParsedExpression =
        ParsedExpression(callJsFunction(raw, null, arrayOf(expression)))
}

public class ProvideService internal constructor(
    internal val raw: RawProvideService,
) {
    public fun <T> value(
        token: Token<T>,
        value: T,
    ): ProvideService {
        raw.value(token.name, value)
        return this
    }

    public fun <T> factory(
        token: Token<T>,
        factory: InjectableFactory<T>,
    ): ProvideService {
        raw.factory(token.name, factory.toJs())
        return this
    }
}

public class TemplateCacheService internal constructor(
    internal val raw: RawTemplateCacheService,
) {
    public val size: Int
        get() = raw.asDynamic().size.unsafeCast<Int>()

    public fun clear() {
        raw.asDynamic().clear()
    }

    public fun delete(key: String): Boolean =
        raw.asDynamic().delete(key).unsafeCast<Boolean>()

    public fun get(key: String): String? =
        raw.asDynamic().get(key).unsafeCast<String?>()

    public fun has(key: String): Boolean =
        raw.asDynamic().has(key).unsafeCast<Boolean>()

    public fun set(
        key: String,
        value: String,
    ): TemplateCacheService {
        raw.asDynamic().set(key, value)
        return this
    }
}

public class TemplateRequestService internal constructor(
    internal val raw: RawTemplateRequestService,
) {
    public operator fun invoke(templateUrl: String): dynamic =
        callJsFunction(raw, null, arrayOf(templateUrl))
}

private fun CookieOptions.toJs(): dynamic {
    val raw = js("{}")

    if (path != null) raw.path = path
    if (domain != null) raw.domain = domain
    if (expires != null) raw.expires = expires
    if (secure != null) raw.secure = secure
    if (sameSite != null) raw.samesite = sameSite.raw

    return raw
}

private fun HttpRequestConfigHeaders.toJs(): dynamic {
    val raw = js("{}")

    if (common != null) raw.common = common.toJsRecord()
    if (get != null) raw["get"] = get.toJsRecord()
    if (post != null) raw.post = post.toJsRecord()
    if (put != null) raw.put = put.toJsRecord()
    if (patch != null) raw.patch = patch.toJsRecord()

    return raw
}

private fun HttpProviderDefaults.toJs(): dynamic {
    val raw = js("{}")

    if (cache != null) raw.cache = cache
    if (transformRequest != null) raw.transformRequest = transformRequest
    if (transformResponse != null) raw.transformResponse = transformResponse
    if (headers != null) raw.headers = headers.toJs()
    if (xsrfHeaderName != null) raw.xsrfHeaderName = xsrfHeaderName
    if (xsrfCookieName != null) raw.xsrfCookieName = xsrfCookieName
    if (withCredentials != null) raw.withCredentials = withCredentials
    if (paramSerializer != null) raw.paramSerializer = paramSerializer

    return raw
}

private fun RequestShortcutConfig.toJs(): dynamic {
    val raw = defaults.toJs()

    if (cache != null) raw.cache = cache
    if (transformRequest != null) raw.transformRequest = transformRequest
    if (transformResponse != null) raw.transformResponse = transformResponse
    if (headers != null) raw.headers = headers.toJs()
    if (xsrfHeaderName != null) raw.xsrfHeaderName = xsrfHeaderName
    if (xsrfCookieName != null) raw.xsrfCookieName = xsrfCookieName
    if (withCredentials != null) raw.withCredentials = withCredentials
    if (paramSerializer != null) raw.paramSerializer = paramSerializer
    if (params != null) raw.params = params.toJsRecord()
    if (data != null) raw.data = data
    if (timeout != null) raw.timeout = timeout
    if (responseType != null) raw.responseType = responseType.raw

    return raw
}

private fun RequestConfig.toJs(): dynamic {
    val raw = shortcut.toJs()

    if (cache != null) raw.cache = cache
    if (transformRequest != null) raw.transformRequest = transformRequest
    if (transformResponse != null) raw.transformResponse = transformResponse
    if (headers != null) raw.headers = headers.toJs()
    if (xsrfHeaderName != null) raw.xsrfHeaderName = xsrfHeaderName
    if (xsrfCookieName != null) raw.xsrfCookieName = xsrfCookieName
    if (withCredentials != null) raw.withCredentials = withCredentials
    if (paramSerializer != null) raw.paramSerializer = paramSerializer
    if (params != null) raw.params = params.toJsRecord()
    if (data != null) raw.data = data
    if (timeout != null) raw.timeout = timeout
    if (responseType != null) raw.responseType = responseType.raw
    if (eventHandlers != null) raw.eventHandlers = eventHandlers.toJsRecord()
    if (uploadEventHandlers != null) raw.uploadEventHandlers = uploadEventHandlers.toJsRecord()

    raw.method = method.raw
    raw.url = url

    return raw
}

private fun RestDefinition<*>.toJs(): dynamic {
    val raw = js("{}")

    raw.name = name
    raw.url = url
    if (entityClass != null) raw.entityClass = entityClass
    raw.options = options.toJs()

    return raw
}

private fun RestRequest.toJs(): dynamic {
    val raw = js("{}")

    raw.method = method.raw
    raw.url = url
    if (collectionUrl != null) raw.collectionUrl = collectionUrl
    if (id != null) raw.id = id
    if (data != null) raw.data = data
    if (params != null) raw.params = params.toJsRecord()
    if (options != null) raw.options = options.toJsRecord()

    return raw
}

private fun RestResponse<*>.toJs(): dynamic {
    val raw = js("{}")

    raw.data = data
    if (source != null) raw.source = source.raw
    raw.stale = stale
    if (status != null) raw.status = status
    if (headers != null) raw.headers = headers.toJsRecord()
    if (config != null) raw.config = config.toJs()
    if (statusText != null) raw.statusText = statusText
    if (xhrStatus != null) raw.xhrStatus = xhrStatus.raw

    return raw
}

private fun CachedRestBackendOptions.toJs(): dynamic {
    val raw = js("{}")

    raw.network = network.toJs()
    raw.cache = cache.toJs()
    raw.strategy = strategy.raw

    if (onRevalidate != null) {
        raw.onRevalidate = { event: dynamic ->
            onRevalidate.invoke(RestRevalidateEvent.fromJs(event))
        }
    }

    return raw
}

private fun RestOptions.toJs(): dynamic {
    val raw = extra.toJsRecord()

    if (backend != null) raw.backend = backend.toJs()

    return raw
}

private fun RestBackend.toJs(): dynamic {
    val backend = this
    val raw = js("{}")

    raw.request = { request: dynamic -> backend.request(RestRequest.fromJs(request)) }

    return raw
}

private fun RestCacheStore.toJs(): dynamic {
    val cache = this
    val raw = js("{}")

    raw.get = { key: String -> cache.get(key) }
    raw.set = { key: String, response: dynamic -> cache.set(key, RestResponse.fromJs<Any?>(response)) }
    raw.delete = { key: String -> cache.delete(key) }
    raw.deletePrefix = { prefix: String -> cache.deletePrefix(prefix) }

    return raw
}

private fun DateFilterOptions.toJs(): dynamic =
    optionRecord(intl, locale)

private fun NumberFilterOptions.toJs(): dynamic =
    optionRecord(intl, locale)

private fun CurrencyFilterOptions.toJs(): dynamic =
    optionRecord(intl, locale)

private fun RelativeTimeFilterOptions.toJs(): dynamic =
    optionRecord(intl, locale)

private fun optionRecord(
    values: Map<String, Any?>,
    locale: String?,
): dynamic {
    val raw = values.toJsRecord()

    if (locale != null) raw.locale = locale

    return raw
}

private fun httpMethod(value: Any?): HttpMethod {
    val raw = value.unsafeCast<String?>()

    return HttpMethod.values().firstOrNull { method -> method.raw == raw } ?: HttpMethod.Get
}

private fun httpResponseStatus(value: Any?): HttpResponseStatus? {
    val raw = value.unsafeCast<String?>()

    return HttpResponseStatus.values().firstOrNull { status -> status.raw == raw }
}

private fun restResponseSource(value: Any?): RestResponseSource? {
    val raw = value.unsafeCast<String?>()

    return RestResponseSource.values().firstOrNull { source -> source.raw == raw }
}

@Suppress("UNUSED_VARIABLE")
private val undefined: dynamic =
    js("undefined")
