import angular_ts/namespace
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option, None, Some}

/// Plain location snapshot written by the AngularTS `geolocation` directive.
pub type GeolocationValue =
  namespace.GeolocationValue

/// Treats a dynamic AngularTS model value as a geolocation snapshot.
pub fn from_dynamic(value: Dynamic) -> GeolocationValue {
  unsafe.from_dynamic(value)
}

pub fn latitude(value: GeolocationValue) -> Float {
  number(value, "latitude")
}

pub fn longitude(value: GeolocationValue) -> Float {
  number(value, "longitude")
}

pub fn accuracy(value: GeolocationValue) -> Float {
  number(value, "accuracy")
}

pub fn altitude(value: GeolocationValue) -> Option(Float) {
  optional_number(value, "altitude")
}

pub fn altitude_accuracy(value: GeolocationValue) -> Option(Float) {
  optional_number(value, "altitudeAccuracy")
}

pub fn heading(value: GeolocationValue) -> Option(Float) {
  optional_number(value, "heading")
}

pub fn speed(value: GeolocationValue) -> Option(Float) {
  optional_number(value, "speed")
}

pub fn timestamp(value: GeolocationValue) -> Float {
  number(value, "timestamp")
}

fn number(value: GeolocationValue, name: String) -> Float {
  value
  |> unsafe.coerce
  |> unsafe.get_property(name)
  |> unsafe.from_dynamic
}

fn optional_number(value: GeolocationValue, name: String) -> Option(Float) {
  let raw =
    value
    |> unsafe.coerce
    |> unsafe.get_property(name)

  case is_nullish(raw) {
    True -> None
    False -> Some(unsafe.from_dynamic(raw))
  }
}

@external(javascript, "./ffi.mjs", "is_nullish")
fn is_nullish(value: Dynamic) -> Bool
