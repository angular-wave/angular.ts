import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option, None, Some}

pub type SameSite {
  Lax
  Strict
  NonePolicy
}

pub opaque type CookieOptions {
  CookieOptions(
    path: Option(String),
    domain: Option(String),
    expires: Option(String),
    secure: Option(Bool),
    same_site: Option(SameSite),
  )
}

pub opaque type CookieStoreOptions {
  CookieStoreOptions(cookie: Option(CookieOptions))
}

pub fn same_site_name(same_site: SameSite) -> String {
  case same_site {
    Lax -> "Lax"
    Strict -> "Strict"
    NonePolicy -> "None"
  }
}

pub fn options() -> CookieOptions {
  CookieOptions(
    path: None,
    domain: None,
    expires: None,
    secure: None,
    same_site: None,
  )
}

pub fn with_path(options: CookieOptions, path: String) -> CookieOptions {
  CookieOptions(..options, path: Some(path))
}

pub fn with_domain(options: CookieOptions, domain: String) -> CookieOptions {
  CookieOptions(..options, domain: Some(domain))
}

pub fn with_expires(options: CookieOptions, expires: String) -> CookieOptions {
  CookieOptions(..options, expires: Some(expires))
}

pub fn with_secure(options: CookieOptions, secure: Bool) -> CookieOptions {
  CookieOptions(..options, secure: Some(secure))
}

pub fn with_same_site(
  options: CookieOptions,
  same_site: SameSite,
) -> CookieOptions {
  CookieOptions(..options, same_site: Some(same_site))
}

pub fn store_options() -> CookieStoreOptions {
  CookieStoreOptions(cookie: None)
}

pub fn with_cookie_options(
  _store_options: CookieStoreOptions,
  cookie_options: CookieOptions,
) -> CookieStoreOptions {
  CookieStoreOptions(cookie: Some(cookie_options))
}

pub fn to_js_options(options: CookieOptions) -> Dynamic {
  let object = unsafe.empty_object()

  case options.path {
    Some(path) -> unsafe.set_string(object, "path", path)
    None -> object
  }

  case options.domain {
    Some(domain) -> unsafe.set_string(object, "domain", domain)
    None -> object
  }

  case options.expires {
    Some(expires) -> unsafe.set_string(object, "expires", expires)
    None -> object
  }

  case options.secure {
    Some(secure) -> unsafe.set_bool(object, "secure", secure)
    None -> object
  }

  case options.same_site {
    Some(same_site) ->
      unsafe.set_string(object, "samesite", same_site_name(same_site))
    None -> object
  }
}

pub fn to_js_store_options(options: CookieStoreOptions) -> Dynamic {
  let object = unsafe.empty_object()

  case options.cookie {
    Some(cookie) -> unsafe.set_property(object, "cookie", to_js_options(cookie))
    None -> object
  }
}
