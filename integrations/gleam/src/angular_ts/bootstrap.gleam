import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}

pub opaque type BootstrapConfig {
  BootstrapConfig(strict_di: Bool)
}

pub fn new(strict_di: Bool) -> BootstrapConfig {
  BootstrapConfig(strict_di)
}

pub fn default_config() -> BootstrapConfig {
  BootstrapConfig(False)
}

pub fn strict_di(config: BootstrapConfig) -> Bool {
  config.strict_di
}

pub fn to_js_object(config: BootstrapConfig) -> Dynamic {
  unsafe.empty_object()
  |> unsafe.set_bool("strictDi", config.strict_di)
}
