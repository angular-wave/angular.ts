import 'cookie.dart';

/// Serialized key/value storage backend.
abstract interface class StorageBackend {
  /// The get.
  String? get(String key);

  /// The set.
  void set(String key, String value);

  /// The remove.
  void remove(String key);
}

/// Minimal Web Storage compatible interface.
abstract interface class StorageLike {
  /// The get item.
  String? getItem(String key);

  /// The set item.
  void setItem(String key, String value);

  /// The remove item.
  void removeItem(String key);
}

/// Represents persistent store config.
final class PersistentStoreConfig {
  /// Creates a persistent store config.
  const PersistentStoreConfig({
    this.backend,
    this.serialize,
    this.deserialize,
    this.cookie,
  });

  /// The backend.
  final StorageLike? backend;

  /// Invokes function.
  final String Function(Object? value)? serialize;

  /// Callback for function.
  final Object? Function(String value)? deserialize;

  /// The cookie.
  final CookieOptions? cookie;
}
