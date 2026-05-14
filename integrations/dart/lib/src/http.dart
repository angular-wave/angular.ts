import 'dart:js_interop';

import 'unsafe.dart' as unsafe;

/// Supported http method values.
enum HttpMethod {
  /// Invokes get.
  get('GET'),

  /// Invokes post.
  post('POST'),

  /// Invokes put.
  put('PUT'),

  /// Invokes delete.
  delete('DELETE'),

  /// Invokes patch.
  patch('PATCH'),

  /// Invokes head.
  head('HEAD'),

  /// Invokes options.
  options('OPTIONS');

  const HttpMethod(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Supported http response status values.
enum HttpResponseStatus {
  /// Invokes complete.
  complete('complete'),

  /// Invokes error.
  error('error'),

  /// Invokes timeout.
  timeout('timeout'),

  /// Invokes abort.
  abort('abort');

  const HttpResponseStatus(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Supported http response type values.
enum HttpResponseType {
  /// Invokes arraybuffer.
  arraybuffer('arraybuffer'),

  /// Invokes blob.
  blob('blob'),

  /// Invokes document.
  document('document'),

  /// Invokes json.
  json('json'),

  /// Invokes stream.
  stream('stream'),

  /// Invokes text.
  text('text');

  const HttpResponseType(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Signature for http headers.
typedef HttpHeaders = Map<String, String>;

/// Signature for http params.
typedef HttpParams = Map<String, Object?>;

/// Signature for http param serializer.
typedef HttpParamSerializer = String Function(HttpParams? params);

/// Signature for http request transformer.
typedef HttpRequestTransformer = Object? Function(
  Object? data,
  HttpHeaders headers,
);

/// Signature for http response transformer.
typedef HttpResponseTransformer = Object? Function(
  Object? data,
  HttpHeaders headers,
  int status,
);

/// Represents http request config headers.
final class HttpRequestConfigHeaders {
  /// Creates a http request config headers.
  const HttpRequestConfigHeaders({
    this.common,
    this.get,
    this.post,
    this.put,
    this.patch,
  });

  /// The common.
  final HttpHeaders? common;

  /// The get.
  final HttpHeaders? get;

  /// The post.
  final HttpHeaders? post;

  /// The put.
  final HttpHeaders? put;

  /// The patch.
  final HttpHeaders? patch;

  /// The to map.
  Map<String, Object?> toMap() => {
        if (common != null) 'common': common,
        if (get != null) 'get': get,
        if (post != null) 'post': post,
        if (put != null) 'put': put,
        if (patch != null) 'patch': patch,
      };
}

/// Represents http provider defaults.
final class HttpProviderDefaults {
  /// Creates a http provider defaults.
  const HttpProviderDefaults({
    this.cache,
    this.headers,
    this.xsrfHeaderName,
    this.xsrfCookieName,
    this.withCredentials,
    this.paramSerializer,
  });

  /// The cache.
  final Object? cache;

  /// The headers.
  final HttpRequestConfigHeaders? headers;

  /// The xsrf header name.
  final String? xsrfHeaderName;

  /// The xsrf cookie name.
  final String? xsrfCookieName;

  /// The with credentials.
  final bool? withCredentials;

  /// The param serializer.
  final Object? paramSerializer;

  /// The to map.
  Map<String, Object?> toMap() => {
        if (cache != null) 'cache': cache,
        if (headers != null) 'headers': headers!.toMap(),
        if (xsrfHeaderName != null) 'xsrfHeaderName': xsrfHeaderName,
        if (xsrfCookieName != null) 'xsrfCookieName': xsrfCookieName,
        if (withCredentials != null) 'withCredentials': withCredentials,
        if (paramSerializer != null) 'paramSerializer': paramSerializer,
      };
}

/// Represents request shortcut config.
final class RequestShortcutConfig {
  /// Creates a request shortcut config.
  const RequestShortcutConfig({
    this.defaults = const HttpProviderDefaults(),
    this.params,
    this.data,
    this.timeout,
    this.responseType,
  });

  /// The defaults.
  final HttpProviderDefaults defaults;

  /// The params.
  final HttpParams? params;

  /// The data.
  final Object? data;

  /// The timeout.
  final Object? timeout;

  /// The response type.
  final HttpResponseType? responseType;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...defaults.toMap(),
        if (params != null) 'params': params,
        if (data != null) 'data': data,
        if (timeout != null) 'timeout': timeout,
        if (responseType != null) 'responseType': responseType!.value,
      };
}

/// Represents request config.
final class RequestConfig {
  /// Creates a request config.
  const RequestConfig({
    required this.method,
    required this.url,
    this.shortcut = const RequestShortcutConfig(),
    this.eventHandlers,
    this.uploadEventHandlers,
  });

  /// The method.
  final HttpMethod method;

  /// The url.
  final String url;

  /// The shortcut.
  final RequestShortcutConfig shortcut;

  /// The event handlers.
  final Map<String, JSFunction>? eventHandlers;

  /// The upload event handlers.
  final Map<String, JSFunction>? uploadEventHandlers;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      ...shortcut.toMap(),
      'method': method.value,
      'url': url,
      if (eventHandlers != null) 'eventHandlers': eventHandlers,
      if (uploadEventHandlers != null)
        'uploadEventHandlers': uploadEventHandlers,
    });
  }
}

/// Represents http response.
final class HttpResponse<T> {
  /// Creates a http response.
  const HttpResponse({
    required this.data,
    required this.status,
    required this.headers,
    required this.config,
    required this.statusText,
    required this.xhrStatus,
  });

  /// The data.
  final T data;

  /// The status.
  final int status;

  /// The headers.
  final HttpHeaders headers;

  /// The config.
  final RequestConfig config;

  /// The status text.
  final String statusText;

  /// The xhr status.
  final HttpResponseStatus xhrStatus;
}

/// Signature for http promise.
typedef HttpPromise<T> = Future<HttpResponse<T>>;

/// Represents http interceptor.
final class HttpInterceptor {
  /// Creates a http interceptor.
  const HttpInterceptor({
    this.request,
    this.requestError,
    this.response,
    this.responseError,
  });

  /// Callback for function.
  final Object? Function(RequestConfig config)? request;

  /// Callback for function.
  final Object? Function(Object? rejection)? requestError;

  /// Callback for function.
  final Object? Function(HttpResponse<Object?> response)? response;

  /// Callback for function.
  final Object? Function(Object? rejection)? responseError;
}
