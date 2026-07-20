import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option, None, Some}

pub type HttpMethod {
  Get
  Post
  Put
  Delete
  Patch
  Head
  Options
}

pub type HttpResponseStatus {
  Complete
  Error
  Timeout
  Abort
}

pub type HttpResponseType {
  ArrayBuffer
  Blob
  Document
  Json
  Stream
  Text
}

pub opaque type HttpRequestOptions {
  HttpRequestOptions(
    params: Option(Dynamic),
    data: Option(Dynamic),
    timeout: Option(Int),
    response_type: Option(HttpResponseType),
    with_credentials: Option(Bool),
    xsrf_header_name: Option(String),
    xsrf_cookie_name: Option(String),
    param_serializer: Option(String),
  )
}

pub opaque type HttpRequestConfig {
  HttpRequestConfig(
    method: HttpMethod,
    url: String,
    shortcut: HttpRequestOptions,
  )
}

pub fn method_name(method: HttpMethod) -> String {
  case method {
    Get -> "GET"
    Post -> "POST"
    Put -> "PUT"
    Delete -> "DELETE"
    Patch -> "PATCH"
    Head -> "HEAD"
    Options -> "OPTIONS"
  }
}

pub fn response_status_name(status: HttpResponseStatus) -> String {
  case status {
    Complete -> "complete"
    Error -> "error"
    Timeout -> "timeout"
    Abort -> "abort"
  }
}

pub fn response_type_name(response_type: HttpResponseType) -> String {
  case response_type {
    ArrayBuffer -> "arraybuffer"
    Blob -> "blob"
    Document -> "document"
    Json -> "json"
    Stream -> "stream"
    Text -> "text"
  }
}

pub fn shortcut_config() -> HttpRequestOptions {
  HttpRequestOptions(
    params: None,
    data: None,
    timeout: None,
    response_type: None,
    with_credentials: None,
    xsrf_header_name: None,
    xsrf_cookie_name: None,
    param_serializer: None,
  )
}

pub fn with_params(
  config: HttpRequestOptions,
  params: Dynamic,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, params: Some(params))
}

pub fn with_data(
  config: HttpRequestOptions,
  data: Dynamic,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, data: Some(data))
}

pub fn with_timeout(
  config: HttpRequestOptions,
  milliseconds: Int,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, timeout: Some(milliseconds))
}

pub fn with_response_type(
  config: HttpRequestOptions,
  response_type: HttpResponseType,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, response_type: Some(response_type))
}

pub fn with_credentials(
  config: HttpRequestOptions,
  enabled: Bool,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, with_credentials: Some(enabled))
}

pub fn with_xsrf_header_name(
  config: HttpRequestOptions,
  name: String,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, xsrf_header_name: Some(name))
}

pub fn with_xsrf_cookie_name(
  config: HttpRequestOptions,
  name: String,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, xsrf_cookie_name: Some(name))
}

pub fn with_param_serializer(
  config: HttpRequestOptions,
  token: String,
) -> HttpRequestOptions {
  HttpRequestOptions(..config, param_serializer: Some(token))
}

pub fn request(method: HttpMethod, url: String) -> HttpRequestConfig {
  HttpRequestConfig(method: method, url: url, shortcut: shortcut_config())
}

pub fn with_shortcut_config(
  request: HttpRequestConfig,
  shortcut: HttpRequestOptions,
) -> HttpRequestConfig {
  HttpRequestConfig(..request, shortcut: shortcut)
}

pub fn to_js_shortcut_config(config: HttpRequestOptions) -> Dynamic {
  let object = unsafe.empty_object()

  case config.params {
    Some(params) -> unsafe.set_property(object, "params", params)
    None -> object
  }

  case config.data {
    Some(data) -> unsafe.set_property(object, "data", data)
    None -> object
  }

  case config.timeout {
    Some(timeout) ->
      unsafe.set_property(object, "timeout", unsafe.coerce(timeout))
    None -> object
  }

  case config.response_type {
    Some(response_type) ->
      unsafe.set_string(
        object,
        "responseType",
        response_type_name(response_type),
      )
    None -> object
  }

  case config.with_credentials {
    Some(with_credentials) ->
      unsafe.set_bool(object, "withCredentials", with_credentials)
    None -> object
  }

  case config.xsrf_header_name {
    Some(name) -> unsafe.set_string(object, "xsrfHeaderName", name)
    None -> object
  }

  case config.xsrf_cookie_name {
    Some(name) -> unsafe.set_string(object, "xsrfCookieName", name)
    None -> object
  }

  case config.param_serializer {
    Some(token) -> unsafe.set_string(object, "paramSerializer", token)
    None -> object
  }
}

pub fn to_js_request_config(config: HttpRequestConfig) -> Dynamic {
  let object = to_js_shortcut_config(config.shortcut)

  unsafe.set_string(object, "method", method_name(config.method))
  unsafe.set_string(object, "url", config.url)
}
