import angular_ts as ng
import angular_ts/bootstrap
import angular_ts/component
import angular_ts/cookie
import angular_ts/filters
import angular_ts/http
import angular_ts/injectable
import angular_ts/injection_tokens
import angular_ts/storage
import angular_ts/token
import gleeunit
import gleeunit/should

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

pub fn bootstrap_default_is_not_strict_test() {
  bootstrap.default_config()
  |> bootstrap.strict_di
  |> should.equal(False)
}

pub fn generated_http_token_test() {
  injection_tokens.http()
  |> token.name
  |> should.equal("$http")
}

pub fn generated_unknown_token_fallback_test() {
  injection_tokens.view()
  |> token.name
  |> should.equal("$view")
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
