/// Callable AngularTS filter implementation.
typedef FilterFn = Object? Function(Object? input, [List<Object?> args]);

/// Factory that creates an AngularTS filter implementation.
typedef FilterFactory = FilterFn Function();

/// Built-in date filter format names.
enum DateFilterFormat {
  /// Invokes short.
  short('short'),

  /// Invokes medium.
  medium('medium'),

  /// Invokes long.
  long('long'),

  /// Invokes full.
  full('full'),

  /// Invokes short date.
  shortDate('shortDate'),

  /// Invokes medium date.
  mediumDate('mediumDate'),

  /// Invokes long date.
  longDate('longDate'),

  /// Invokes full date.
  fullDate('fullDate'),

  /// Invokes short time.
  shortTime('shortTime'),

  /// Invokes medium time.
  mediumTime('mediumTime'),

  /// Invokes long time.
  longTime('longTime'),

  /// Invokes full time.
  fullTime('fullTime');

  const DateFilterFormat(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Options passed to the date filter.
final class DateFilterOptions {
  /// Creates a date filter options.
  const DateFilterOptions({
    this.locale,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// Raw `Intl.DateTimeFormatOptions` values not modeled by this facade yet.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
      };
}

/// Options passed to the number filter.
final class NumberFilterOptions {
  /// Creates a number filter options.
  const NumberFilterOptions({
    this.locale,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// Raw `Intl.NumberFormatOptions` values not modeled by this facade yet.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
      };
}

/// Options passed to the currency filter.
final class CurrencyFilterOptions {
  /// Creates a currency filter options.
  const CurrencyFilterOptions({
    this.locale,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// Raw `Intl.NumberFormatOptions` values except `currency` and `style`.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
      };
}

/// Options passed to the relative-time filter.
final class RelativeTimeFilterOptions {
  /// Creates a relative time filter options.
  const RelativeTimeFilterOptions({
    this.locale,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// Raw `Intl.RelativeTimeFormatOptions` values not modeled by this facade yet.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
      };
}

/// Key/value item emitted when filtering object entries.
final class EntryFilterItem<TKey, TValue> {
  /// Creates a entry filter item.
  const EntryFilterItem({
    required this.key,
    required this.value,
  });

  /// The key.
  final TKey key;

  /// Registers an AngularTS value.
  final TValue value;
}
