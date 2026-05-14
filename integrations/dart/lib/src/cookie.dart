/// Supported same site values.
enum SameSite {
  /// Invokes lax.
  lax('Lax'),

  /// Invokes strict.
  strict('Strict'),

  /// Invokes none.
  none('None');

  const SameSite(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Represents cookie options.
final class CookieOptions {
  /// Creates a cookie options.
  const CookieOptions({
    this.path,
    this.domain,
    this.expires,
    this.secure,
    this.sameSite,
  });

  /// The path.
  final String? path;

  /// The domain.
  final String? domain;

  /// The expires.
  final Object? expires;

  /// The secure.
  final bool? secure;

  /// The same site.
  final SameSite? sameSite;
}

/// Represents cookie store options.
final class CookieStoreOptions {
  /// Creates a cookie store options.
  const CookieStoreOptions({
    this.serialize,
    this.deserialize,
    this.cookie,
  });

  /// Invokes function.
  final String Function(Object? value)? serialize;

  /// Callback for function.
  final Object? Function(String text)? deserialize;

  /// The cookie.
  final CookieOptions? cookie;
}
