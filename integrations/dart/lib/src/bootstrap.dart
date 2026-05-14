/// AngularTS bootstrap configuration.
final class BootstrapConfig {
  /// Creates a bootstrap config.
  const BootstrapConfig({this.strictDi = false});

  /// The strict di.
  final bool strictDi;

  /// The to map.
  Map<String, Object?> toMap() => {'strictDi': strictDi};
}
