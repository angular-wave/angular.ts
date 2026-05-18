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
    this.calendar,
    this.dateStyle,
    this.day,
    this.dayPeriod,
    this.era,
    this.formatMatcher,
    this.fractionalSecondDigits,
    this.hour,
    this.hour12,
    this.hourCycle,
    this.localeMatcher,
    this.minute,
    this.month,
    this.numberingSystem,
    this.second,
    this.timeStyle,
    this.timeZone,
    this.timeZoneName,
    this.weekday,
    this.year,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// The calendar.
  final String? calendar;

  /// The date style.
  final String? dateStyle;

  /// The day.
  final String? day;

  /// The day period.
  final String? dayPeriod;

  /// The era.
  final String? era;

  /// The format matcher.
  final String? formatMatcher;

  /// The fractional second digits.
  final int? fractionalSecondDigits;

  /// The hour.
  final String? hour;

  /// The hour12.
  final bool? hour12;

  /// The hour cycle.
  final String? hourCycle;

  /// The locale matcher.
  final String? localeMatcher;

  /// The minute.
  final String? minute;

  /// The month.
  final String? month;

  /// The numbering system.
  final String? numberingSystem;

  /// The second.
  final String? second;

  /// The time style.
  final String? timeStyle;

  /// The time zone.
  final String? timeZone;

  /// The time zone name.
  final String? timeZoneName;

  /// The weekday.
  final String? weekday;

  /// The year.
  final String? year;

  /// Raw `Intl.DateTimeFormatOptions` values not modeled by this facade yet.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
        if (calendar != null) 'calendar': calendar,
        if (dateStyle != null) 'dateStyle': dateStyle,
        if (day != null) 'day': day,
        if (dayPeriod != null) 'dayPeriod': dayPeriod,
        if (era != null) 'era': era,
        if (formatMatcher != null) 'formatMatcher': formatMatcher,
        if (fractionalSecondDigits != null)
          'fractionalSecondDigits': fractionalSecondDigits,
        if (hour != null) 'hour': hour,
        if (hour12 != null) 'hour12': hour12,
        if (hourCycle != null) 'hourCycle': hourCycle,
        if (localeMatcher != null) 'localeMatcher': localeMatcher,
        if (minute != null) 'minute': minute,
        if (month != null) 'month': month,
        if (numberingSystem != null) 'numberingSystem': numberingSystem,
        if (second != null) 'second': second,
        if (timeStyle != null) 'timeStyle': timeStyle,
        if (timeZone != null) 'timeZone': timeZone,
        if (timeZoneName != null) 'timeZoneName': timeZoneName,
        if (weekday != null) 'weekday': weekday,
        if (year != null) 'year': year,
      };
}

/// Options passed to the number filter.
final class NumberFilterOptions {
  /// Creates a number filter options.
  const NumberFilterOptions({
    this.locale,
    this.compactDisplay,
    this.currency,
    this.currencyDisplay,
    this.currencySign,
    this.localeMatcher,
    this.maximumFractionDigits,
    this.maximumSignificantDigits,
    this.minimumFractionDigits,
    this.minimumIntegerDigits,
    this.minimumSignificantDigits,
    this.notation,
    this.numberingSystem,
    this.roundingIncrement,
    this.roundingMode,
    this.roundingPriority,
    this.signDisplay,
    this.style,
    this.trailingZeroDisplay,
    this.unit,
    this.unitDisplay,
    this.useGrouping,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// The compact display.
  final String? compactDisplay;

  /// The currency.
  final String? currency;

  /// The currency display.
  final String? currencyDisplay;

  /// The currency sign.
  final String? currencySign;

  /// The locale matcher.
  final String? localeMatcher;

  /// The maximum fraction digits.
  final int? maximumFractionDigits;

  /// The maximum significant digits.
  final int? maximumSignificantDigits;

  /// The minimum fraction digits.
  final int? minimumFractionDigits;

  /// The minimum integer digits.
  final int? minimumIntegerDigits;

  /// The minimum significant digits.
  final int? minimumSignificantDigits;

  /// The notation.
  final String? notation;

  /// The numbering system.
  final String? numberingSystem;

  /// The rounding increment.
  final int? roundingIncrement;

  /// The rounding mode.
  final String? roundingMode;

  /// The rounding priority.
  final String? roundingPriority;

  /// The sign display.
  final String? signDisplay;

  /// The style.
  final String? style;

  /// The trailing zero display.
  final String? trailingZeroDisplay;

  /// The unit.
  final String? unit;

  /// The unit display.
  final String? unitDisplay;

  /// The use grouping.
  final Object? useGrouping;

  /// Raw `Intl.NumberFormatOptions` values not modeled by this facade yet.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
        if (compactDisplay != null) 'compactDisplay': compactDisplay,
        if (currency != null) 'currency': currency,
        if (currencyDisplay != null) 'currencyDisplay': currencyDisplay,
        if (currencySign != null) 'currencySign': currencySign,
        if (localeMatcher != null) 'localeMatcher': localeMatcher,
        if (maximumFractionDigits != null)
          'maximumFractionDigits': maximumFractionDigits,
        if (maximumSignificantDigits != null)
          'maximumSignificantDigits': maximumSignificantDigits,
        if (minimumFractionDigits != null)
          'minimumFractionDigits': minimumFractionDigits,
        if (minimumIntegerDigits != null)
          'minimumIntegerDigits': minimumIntegerDigits,
        if (minimumSignificantDigits != null)
          'minimumSignificantDigits': minimumSignificantDigits,
        if (notation != null) 'notation': notation,
        if (numberingSystem != null) 'numberingSystem': numberingSystem,
        if (roundingIncrement != null) 'roundingIncrement': roundingIncrement,
        if (roundingMode != null) 'roundingMode': roundingMode,
        if (roundingPriority != null) 'roundingPriority': roundingPriority,
        if (signDisplay != null) 'signDisplay': signDisplay,
        if (style != null) 'style': style,
        if (trailingZeroDisplay != null)
          'trailingZeroDisplay': trailingZeroDisplay,
        if (unit != null) 'unit': unit,
        if (unitDisplay != null) 'unitDisplay': unitDisplay,
        if (useGrouping != null) 'useGrouping': useGrouping,
      };
}

/// Options passed to the currency filter.
final class CurrencyFilterOptions {
  /// Creates a currency filter options.
  const CurrencyFilterOptions({
    this.locale,
    this.compactDisplay,
    this.currencyDisplay,
    this.currencySign,
    this.localeMatcher,
    this.maximumFractionDigits,
    this.maximumSignificantDigits,
    this.minimumFractionDigits,
    this.minimumIntegerDigits,
    this.minimumSignificantDigits,
    this.notation,
    this.numberingSystem,
    this.roundingIncrement,
    this.roundingMode,
    this.roundingPriority,
    this.signDisplay,
    this.trailingZeroDisplay,
    this.unit,
    this.unitDisplay,
    this.useGrouping,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// The compact display.
  final String? compactDisplay;

  /// The currency display.
  final String? currencyDisplay;

  /// The currency sign.
  final String? currencySign;

  /// The locale matcher.
  final String? localeMatcher;

  /// The maximum fraction digits.
  final int? maximumFractionDigits;

  /// The maximum significant digits.
  final int? maximumSignificantDigits;

  /// The minimum fraction digits.
  final int? minimumFractionDigits;

  /// The minimum integer digits.
  final int? minimumIntegerDigits;

  /// The minimum significant digits.
  final int? minimumSignificantDigits;

  /// The notation.
  final String? notation;

  /// The numbering system.
  final String? numberingSystem;

  /// The rounding increment.
  final int? roundingIncrement;

  /// The rounding mode.
  final String? roundingMode;

  /// The rounding priority.
  final String? roundingPriority;

  /// The sign display.
  final String? signDisplay;

  /// The trailing zero display.
  final String? trailingZeroDisplay;

  /// The unit.
  final String? unit;

  /// The unit display.
  final String? unitDisplay;

  /// The use grouping.
  final Object? useGrouping;

  /// Raw `Intl.NumberFormatOptions` values except `currency` and `style`.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
        if (compactDisplay != null) 'compactDisplay': compactDisplay,
        if (currencyDisplay != null) 'currencyDisplay': currencyDisplay,
        if (currencySign != null) 'currencySign': currencySign,
        if (localeMatcher != null) 'localeMatcher': localeMatcher,
        if (maximumFractionDigits != null)
          'maximumFractionDigits': maximumFractionDigits,
        if (maximumSignificantDigits != null)
          'maximumSignificantDigits': maximumSignificantDigits,
        if (minimumFractionDigits != null)
          'minimumFractionDigits': minimumFractionDigits,
        if (minimumIntegerDigits != null)
          'minimumIntegerDigits': minimumIntegerDigits,
        if (minimumSignificantDigits != null)
          'minimumSignificantDigits': minimumSignificantDigits,
        if (notation != null) 'notation': notation,
        if (numberingSystem != null) 'numberingSystem': numberingSystem,
        if (roundingIncrement != null) 'roundingIncrement': roundingIncrement,
        if (roundingMode != null) 'roundingMode': roundingMode,
        if (roundingPriority != null) 'roundingPriority': roundingPriority,
        if (signDisplay != null) 'signDisplay': signDisplay,
        if (trailingZeroDisplay != null)
          'trailingZeroDisplay': trailingZeroDisplay,
        if (unit != null) 'unit': unit,
        if (unitDisplay != null) 'unitDisplay': unitDisplay,
        if (useGrouping != null) 'useGrouping': useGrouping,
      };
}

/// Options passed to the relative-time filter.
final class RelativeTimeFilterOptions {
  /// Creates a relative time filter options.
  const RelativeTimeFilterOptions({
    this.locale,
    this.localeMatcher,
    this.numeric,
    this.style,
    this.intl = const {},
  });

  /// The locale.
  final String? locale;

  /// The locale matcher.
  final String? localeMatcher;

  /// The numeric.
  final String? numeric;

  /// The style.
  final String? style;

  /// Raw `Intl.RelativeTimeFormatOptions` values not modeled by this facade yet.
  final Map<String, Object?> intl;

  /// The to map.
  Map<String, Object?> toMap() => {
        ...intl,
        if (locale != null) 'locale': locale,
        if (localeMatcher != null) 'localeMatcher': localeMatcher,
        if (numeric != null) 'numeric': numeric,
        if (style != null) 'style': style,
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
