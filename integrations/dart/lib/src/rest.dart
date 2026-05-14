import 'http.dart';

/// Supported rest cache strategy values.
enum RestCacheStrategy {
  /// Invokes cache first.
  cacheFirst('cache-first'),

  /// Invokes network first.
  networkFirst('network-first'),

  /// Invokes stale while revalidate.
  staleWhileRevalidate('stale-while-revalidate');

  const RestCacheStrategy(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Signature for entity factory.
typedef EntityFactory<T> = T Function(Object? data);

/// Signature for entity class.
typedef EntityClass<T> = EntityFactory<T>;

/// Signature for rest factory.
typedef RestFactory = RestService<T, ID> Function<T, ID>(
  String baseUrl, [
  EntityClass<T>? entityClass,
  RestOptions? options,
]);

/// Represents rest definition.
final class RestDefinition<T> {
  /// Creates a rest definition.
  const RestDefinition({
    required this.name,
    required this.url,
    this.entityFactory,
    this.options = const RestOptions(),
  });

  /// The name.
  final String name;

  /// The url.
  final String url;

  /// The entity factory.
  final EntityFactory<T>? entityFactory;

  /// The options.
  final RestOptions options;
}

/// Represents rest request.
final class RestRequest {
  /// Creates a rest request.
  const RestRequest({
    required this.method,
    required this.url,
    this.collectionUrl,
    this.id,
    this.data,
    this.params,
    this.options,
  });

  /// The method.
  final HttpMethod method;

  /// The url.
  final String url;

  /// The collection url.
  final String? collectionUrl;

  /// The id.
  final Object? id;

  /// The data.
  final Object? data;

  /// The params.
  final Map<String, Object?>? params;

  /// The options.
  final Map<String, Object?>? options;
}

/// Represents rest response.
final class RestResponse<T> {
  /// Creates a rest response.
  const RestResponse({
    required this.data,
    this.source,
    this.stale = false,
  });

  /// The data.
  final T data;

  /// The source.
  final RestResponseSource? source;

  /// The stale.
  final bool stale;
}

/// Supported rest response source values.
enum RestResponseSource {
  /// Invokes network.
  network('network'),

  /// Invokes cache.
  cache('cache');

  const RestResponseSource(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Backend used to execute AngularTS REST requests.
abstract interface class RestBackend {
  /// Executes a REST request.
  Future<RestResponse<T>> request<T>(RestRequest request);
}

/// Cache store used by a cached REST backend.
abstract interface class RestCacheStore {
  /// Reads a cached response by key.
  Future<RestResponse<T>?> get<T>(String key);

  /// Stores a cached response by key.
  Future<void> set<T>(String key, RestResponse<T> response);

  /// The delete.
  Future<void> delete(String key);

  /// The delete prefix.
  Future<void> deletePrefix(String prefix);
}

/// Represents rest revalidate event.
final class RestRevalidateEvent<T> {
  /// Creates a rest revalidate event.
  const RestRevalidateEvent({
    required this.key,
    required this.request,
    required this.response,
  });

  /// The key.
  final String key;

  /// The request.
  final RestRequest request;

  /// The response.
  final RestResponse<T> response;
}

/// Represents cached rest backend options.
final class CachedRestBackendOptions {
  /// Creates a cached rest backend options.
  const CachedRestBackendOptions({
    required this.network,
    required this.cache,
    required this.strategy,
    this.onRevalidate,
  });

  /// The network.
  final RestBackend network;

  /// The cache.
  final RestCacheStore cache;

  /// The strategy.
  final RestCacheStrategy strategy;

  /// Callback for function.
  final void Function(RestRevalidateEvent<Object?> event)? onRevalidate;
}

/// Represents rest options.
final class RestOptions {
  /// Creates a rest options.
  const RestOptions({this.backend, this.extra = const {}});

  /// The backend.
  final RestBackend? backend;

  /// The extra.
  final Map<String, Object?> extra;
}

/// Runtime interface for rest service.
abstract interface class RestService<T, ID> {
  /// The build url.
  String buildUrl(String template, Map<String, Object?> params);

  /// The list.
  Future<List<T>> list([Map<String, Object?>? params]);

  /// The get.
  Future<Object?> get(ID id, [Map<String, Object?>? params]);

  /// The create.
  Future<Object?> create(T item);

  /// The update.
  Future<Object?> update(ID id, Partial<T> item);

  /// The delete.
  Future<bool> delete(ID id);
}

/// Signature for partial.
typedef Partial<T> = Object;
