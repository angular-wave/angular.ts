import 'dart:js_interop';

/// Represents an AngularTS JavaScript facade.
base class AngularTsJsFacade {
  /// Creates an AngularTS JavaScript facade.
  const AngularTsJsFacade(this.raw);

  /// The raw JavaScript value.
  final JSObject raw;
}
