import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option, None, Some}

/// Synchronous sanitizer or validator. Panic to reject the input.
pub type BindingPolicy =
  fn(String) -> String

pub type HtmlPolicy =
  BindingPolicy

pub type UrlPolicy =
  BindingPolicy

pub type ScriptPolicy =
  BindingPolicy

pub type ScriptUrlPolicy =
  BindingPolicy

pub type BindingContext {
  Html
  Url
  MediaUrl
  ResourceUrl
  Script
  ScriptUrl
}

pub fn context_name(context: BindingContext) -> String {
  case context {
    Html -> "html"
    Url -> "url"
    MediaUrl -> "mediaUrl"
    ResourceUrl -> "resourceUrl"
    Script -> "script"
    ScriptUrl -> "scriptUrl"
  }
}

/// Compiler callbacks. Omitted policies keep framework defaults.
pub type BindingPolicyConfig {
  BindingPolicyConfig(
    html_policy: Option(BindingPolicy),
    url_policy: Option(BindingPolicy),
    media_url_policy: Option(BindingPolicy),
    resource_url_policy: Option(BindingPolicy),
    script_policy: Option(BindingPolicy),
    script_url_policy: Option(BindingPolicy),
  )
}

/// Creates configuration that retains all framework defaults.
pub fn new() -> BindingPolicyConfig {
  BindingPolicyConfig(None, None, None, None, None, None)
}

/// Converts configured callbacks to JavaScript functions without creating policies.
pub fn to_js_config(config: BindingPolicyConfig) -> Dynamic {
  let object = unsafe.empty_object()
  let callbacks = [
    #("htmlPolicy", config.html_policy),
    #("urlPolicy", config.url_policy),
    #("mediaUrlPolicy", config.media_url_policy),
    #("resourceUrlPolicy", config.resource_url_policy),
    #("scriptPolicy", config.script_policy),
    #("scriptUrlPolicy", config.script_url_policy),
  ]
  set_callbacks(object, callbacks)
}

fn set_callbacks(
  object: Dynamic,
  callbacks: List(#(String, Option(BindingPolicy))),
) -> Dynamic {
  case callbacks {
    [] -> object
    [#(key, callback), ..rest] -> {
      case callback {
        Some(policy) -> unsafe.set_property(object, key, unsafe.coerce(policy))
        None -> object
      }
      set_callbacks(object, rest)
    }
  }
}
