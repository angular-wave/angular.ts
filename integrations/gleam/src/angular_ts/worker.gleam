import angular_ts/namespace
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option, None, Some}

pub type WorkerService =
  namespace.WorkerService

pub type WorkerHandle(send, receive) =
  namespace.WorkerHandle(send, receive)

pub type WorkerError =
  namespace.WorkerError

pub type WorkerErrorCode =
  namespace.WorkerErrorCode

pub type WorkerStatus =
  namespace.WorkerStatus

pub type WorkerRequest(payload) =
  namespace.WorkerRequest(payload)

pub type WorkerResponse(result) =
  namespace.WorkerResponse(result)

pub type WorkerModelMessage(model) =
  namespace.WorkerModelMessage(model)

pub type WorkerType {
  ModuleWorker
  ClassicWorker
}

pub type WorkerCredentials {
  OmitCredentials
  SameOriginCredentials
  IncludeCredentials
}

pub opaque type WorkerConfig(receive) {
  WorkerConfig(
    worker_type: WorkerType,
    name: Option(String),
    credentials: Option(WorkerCredentials),
    decoder: Option(fn(Dynamic, Dynamic) -> receive),
    restart: Bool,
    restart_delay: Option(Int),
    max_restarts: Option(Int),
  )
}

pub opaque type WorkerRequestOptions {
  WorkerRequestOptions(
    timeout: Option(Int),
    signal: Option(Dynamic),
    transfer: Option(Dynamic),
  )
}

pub fn config() -> WorkerConfig(receive) {
  WorkerConfig(
    worker_type: ModuleWorker,
    name: None,
    credentials: None,
    decoder: None,
    restart: False,
    restart_delay: None,
    max_restarts: None,
  )
}

pub fn classic(config: WorkerConfig(receive)) -> WorkerConfig(receive) {
  WorkerConfig(..config, worker_type: ClassicWorker)
}

pub fn named(
  config: WorkerConfig(receive),
  name: String,
) -> WorkerConfig(receive) {
  WorkerConfig(..config, name: Some(name))
}

pub fn with_credentials(
  config: WorkerConfig(receive),
  credentials: WorkerCredentials,
) -> WorkerConfig(receive) {
  WorkerConfig(..config, credentials: Some(credentials))
}

pub fn decode(
  config: WorkerConfig(receive),
  decoder: fn(Dynamic, Dynamic) -> receive,
) -> WorkerConfig(receive) {
  WorkerConfig(..config, decoder: Some(decoder))
}

pub fn with_restart(
  config: WorkerConfig(receive),
  delay: Int,
  max_restarts: Int,
) -> WorkerConfig(receive) {
  WorkerConfig(
    ..config,
    restart: True,
    restart_delay: Some(delay),
    max_restarts: Some(max_restarts),
  )
}

pub fn request_options() -> WorkerRequestOptions {
  WorkerRequestOptions(timeout: None, signal: None, transfer: None)
}

pub fn with_timeout(
  options: WorkerRequestOptions,
  milliseconds: Int,
) -> WorkerRequestOptions {
  WorkerRequestOptions(..options, timeout: Some(milliseconds))
}

pub fn with_signal(
  options: WorkerRequestOptions,
  signal: Dynamic,
) -> WorkerRequestOptions {
  WorkerRequestOptions(..options, signal: Some(signal))
}

pub fn with_transfer(
  options: WorkerRequestOptions,
  transfer: Dynamic,
) -> WorkerRequestOptions {
  WorkerRequestOptions(..options, transfer: Some(transfer))
}

pub fn start(
  service: WorkerService,
  script_path: String,
  config: WorkerConfig(receive),
) -> WorkerHandle(send, receive) {
  start_worker(
    unsafe.coerce(service),
    unsafe.coerce(script_path),
    to_js_config(config),
  )
}

pub fn post(handle: WorkerHandle(send, receive), message: send) -> Nil {
  worker_post(unsafe.coerce(handle), unsafe.coerce(message))
}

pub fn request(
  handle: WorkerHandle(send, receive),
  message: send,
  options: WorkerRequestOptions,
) -> Dynamic {
  worker_request(
    unsafe.coerce(handle),
    unsafe.coerce(message),
    to_js_request_options(options),
  )
}

pub fn model(handle: WorkerHandle(send, receive), channel: String) -> Dynamic {
  worker_model(unsafe.coerce(handle), channel)
}

pub fn on_message(
  handle: WorkerHandle(send, receive),
  listener: fn(receive, Dynamic) -> Nil,
) -> Dynamic {
  worker_on_message(unsafe.coerce(handle), unsafe.coerce(listener))
}

pub fn on_error(
  handle: WorkerHandle(send, receive),
  listener: fn(WorkerError) -> Nil,
) -> Dynamic {
  worker_on_error(unsafe.coerce(handle), unsafe.coerce(listener))
}

pub fn dispose(disposer: Dynamic) -> Nil {
  worker_dispose(disposer)
}

pub fn terminate(handle: WorkerHandle(send, receive)) -> Nil {
  worker_terminate(unsafe.coerce(handle))
}

pub fn restart(handle: WorkerHandle(send, receive)) -> Nil {
  worker_restart(unsafe.coerce(handle))
}

pub fn restart_enabled(config: WorkerConfig(receive)) -> Bool {
  config.restart
}

pub fn restart_delay(config: WorkerConfig(receive)) -> Option(Int) {
  config.restart_delay
}

pub fn max_restarts(config: WorkerConfig(receive)) -> Option(Int) {
  config.max_restarts
}

pub fn to_js_config(config: WorkerConfig(receive)) -> Dynamic {
  let object = unsafe.empty_object()

  unsafe.set_string(object, "type", worker_type_name(config.worker_type))

  case config.name {
    Some(name) -> unsafe.set_string(object, "name", name)
    None -> object
  }

  case config.credentials {
    Some(credentials) ->
      unsafe.set_string(object, "credentials", credentials_name(credentials))
    None -> object
  }

  case config.decoder {
    Some(decoder) ->
      unsafe.set_property(object, "decode", unsafe.coerce(decoder))
    None -> object
  }

  unsafe.set_bool(object, "restart", config.restart)

  case config.restart_delay {
    Some(delay) ->
      unsafe.set_property(object, "restartDelay", unsafe.coerce(delay))
    None -> object
  }

  case config.max_restarts {
    Some(maximum) ->
      unsafe.set_property(object, "maxRestarts", unsafe.coerce(maximum))
    None -> object
  }
}

pub fn to_js_request_options(options: WorkerRequestOptions) -> Dynamic {
  let object = unsafe.empty_object()

  case options.timeout {
    Some(timeout) ->
      unsafe.set_property(object, "timeout", unsafe.coerce(timeout))
    None -> object
  }

  case options.signal {
    Some(signal) -> unsafe.set_property(object, "signal", signal)
    None -> object
  }

  case options.transfer {
    Some(transfer) -> unsafe.set_property(object, "transfer", transfer)
    None -> object
  }
}

fn worker_type_name(worker_type: WorkerType) -> String {
  case worker_type {
    ModuleWorker -> "module"
    ClassicWorker -> "classic"
  }
}

fn credentials_name(credentials: WorkerCredentials) -> String {
  case credentials {
    OmitCredentials -> "omit"
    SameOriginCredentials -> "same-origin"
    IncludeCredentials -> "include"
  }
}

@external(javascript, "./ffi.mjs", "call_function2")
fn start_worker(
  service: Dynamic,
  script_path: Dynamic,
  config: Dynamic,
) -> WorkerHandle(send, receive)

@external(javascript, "./ffi.mjs", "call_method1")
fn call_worker_post(handle: Dynamic, method: String, message: Dynamic) -> Nil

fn worker_post(handle: Dynamic, message: Dynamic) -> Nil {
  call_worker_post(handle, "post", message)
}

@external(javascript, "./ffi.mjs", "call_method2")
fn call_worker_request(
  handle: Dynamic,
  method: String,
  message: Dynamic,
  options: Dynamic,
) -> Dynamic

fn worker_request(
  handle: Dynamic,
  message: Dynamic,
  options: Dynamic,
) -> Dynamic {
  call_worker_request(handle, "request", message, options)
}

@external(javascript, "./ffi.mjs", "call_method1")
fn call_worker_method1(
  handle: Dynamic,
  method: String,
  argument: Dynamic,
) -> Dynamic

fn worker_model(handle: Dynamic, channel: String) -> Dynamic {
  call_worker_method1(handle, "model", unsafe.coerce(channel))
}

fn worker_on_message(handle: Dynamic, listener: Dynamic) -> Dynamic {
  call_worker_method1(handle, "onMessage", listener)
}

fn worker_on_error(handle: Dynamic, listener: Dynamic) -> Dynamic {
  call_worker_method1(handle, "onError", listener)
}

@external(javascript, "./ffi.mjs", "call_function0")
fn worker_dispose(disposer: Dynamic) -> Nil

@external(javascript, "./ffi.mjs", "call_method0")
fn call_worker_method0(handle: Dynamic, method: String) -> Nil

fn worker_terminate(handle: Dynamic) -> Nil {
  call_worker_method0(handle, "terminate")
}

fn worker_restart(handle: Dynamic) -> Nil {
  call_worker_method0(handle, "restart")
}
