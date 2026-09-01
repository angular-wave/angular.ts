import angular_ts as ng
import angular_ts/component
import angular_ts/cookie
import angular_ts/filters
import angular_ts/geolocation
import angular_ts/http
import angular_ts/injectable
import angular_ts/injection_tokens
import angular_ts/programmatic_view
import angular_ts/storage
import angular_ts/token
import angular_ts/unsafe
import angular_ts/worker
import gleam/dynamic.{type Dynamic}
import gleam/option
import gleeunit
import gleeunit/should

@external(javascript, "./programmatic_view_test_ffi.mjs", "install_programmatic_runtime")
fn install_programmatic_runtime() -> Nil

fn marker_kind(value: Dynamic) -> String {
  value
  |> unsafe.get_property("kind")
  |> unsafe.from_dynamic
}

pub fn main() {
  gleeunit.main()
}

pub fn token_name_test() {
  ng.token("todoStore")
  |> token.name
  |> should.equal("todoStore")
}

pub fn inject1_records_token_name_test() {
  let api = token.new("api")

  injectable.inject1(api, fn(value) { value })
  |> injectable.tokens
  |> should.equal(["api"])
}

pub fn binding_symbol_test() {
  component.one_way_binding(True)
  |> component.binding_symbol
  |> should.equal("<?")
}

pub fn programmatic_view_context_test() {
  let host = unsafe.empty_object()
  let context =
    unsafe.empty_object()
    |> unsafe.set_property("controller", unsafe.coerce("ready"))
    |> unsafe.set_property("host", host)
    |> unsafe.set_property("onDestroy", unsafe.coerce(fn(cleanup) { cleanup }))
    |> programmatic_view.from_dynamic

  context
  |> programmatic_view.controller
  |> should.equal("ready")

  context
  |> programmatic_view.host
  |> should.equal(host)

  context
  |> programmatic_view.on_destroy(fn() { Nil })
  |> unsafe.call_function0

  Nil
}

pub fn programmatic_view_helpers_test() {
  install_programmatic_runtime()

  programmatic_view.event(fn(_) { Nil })
  |> marker_kind
  |> should.equal("event")

  programmatic_view.event_with_options(fn(_) { Nil }, unsafe.empty_object())
  |> marker_kind
  |> should.equal("event")

  [programmatic_view.property("title", "ready")]
  |> programmatic_view.attrs
  |> marker_kind
  |> should.equal("attrs")

  [programmatic_view.property("value", 1)]
  |> programmatic_view.props
  |> marker_kind
  |> should.equal("props")

  programmatic_view.each(fn() { ["ready"] }, fn(item) { item }, fn(read) {
    programmatic_view.child(read())
  })
  |> marker_kind
  |> should.equal("each")

  programmatic_view.tag("button", [], [])
  |> marker_kind
  |> should.equal("view-tag")

  programmatic_view.tag_ns("http://www.w3.org/2000/svg", "circle", [], [])
  |> marker_kind
  |> should.equal("view-tag-ns")
}

pub fn generated_http_token_test() {
  injection_tokens.http()
  |> token.name
  |> should.equal("$http")
}

pub fn http_method_name_test() {
  http.method_name(http.Patch)
  |> should.equal("PATCH")
}

pub fn http_response_status_name_test() {
  http.response_status_name(http.Timeout)
  |> should.equal("timeout")
}

pub fn http_response_type_name_test() {
  http.response_type_name(http.ArrayBuffer)
  |> should.equal("arraybuffer")
}

pub fn storage_type_name_test() {
  storage.storage_type_name(storage.Session)
  |> should.equal("session")
}

pub fn cookie_same_site_name_test() {
  cookie.same_site_name(cookie.NonePolicy)
  |> should.equal("None")
}

pub fn date_filter_format_name_test() {
  filters.date_format_name(filters.MediumDate)
  |> should.equal("mediumDate")
}

pub fn entry_filter_item_test() {
  let item = filters.EntryFilterItem("name", "AngularTS")

  item.value
  |> should.equal("AngularTS")
}

pub fn geolocation_value_test() {
  let value =
    unsafe.empty_object()
    |> unsafe.set_property("latitude", unsafe.coerce(56.9496))
    |> unsafe.set_property("longitude", unsafe.coerce(24.1052))
    |> unsafe.set_property("accuracy", unsafe.coerce(4.5))
    |> unsafe.set_property("altitudeAccuracy", unsafe.coerce(8.0))
    |> unsafe.set_property("heading", unsafe.coerce(90.0))
    |> unsafe.set_property("timestamp", unsafe.coerce(1_788_192_000_000.0))
    |> geolocation.from_dynamic

  value
  |> geolocation.latitude
  |> should.equal(56.9496)

  value
  |> geolocation.altitude
  |> should.equal(option.None)

  value
  |> geolocation.altitude_accuracy
  |> should.equal(option.Some(8.0))
}

pub fn worker_restart_policy_test() {
  let config =
    worker.config()
    |> worker.with_restart(250, 4)

  config
  |> worker.restart_enabled
  |> should.equal(True)

  config
  |> worker.restart_delay
  |> should.equal(option.Some(250))

  config
  |> worker.max_restarts
  |> should.equal(option.Some(4))
}
