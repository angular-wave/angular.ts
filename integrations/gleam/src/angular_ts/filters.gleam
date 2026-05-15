import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option, None, Some}

pub type DateFilterFormat {
  Short
  Medium
  Long
  Full
  ShortDate
  MediumDate
  LongDate
  FullDate
  ShortTime
  MediumTime
  LongTime
  FullTime
}

pub opaque type DateFilterOptions {
  DateFilterOptions(locale: Option(String), intl: Dynamic)
}

pub opaque type NumberFilterOptions {
  NumberFilterOptions(locale: Option(String), intl: Dynamic)
}

pub opaque type CurrencyFilterOptions {
  CurrencyFilterOptions(locale: Option(String), intl: Dynamic)
}

pub opaque type RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(locale: Option(String), intl: Dynamic)
}

pub type EntryFilterItem(key, value) {
  EntryFilterItem(key: key, value: value)
}

pub fn date_format_name(format: DateFilterFormat) -> String {
  case format {
    Short -> "short"
    Medium -> "medium"
    Long -> "long"
    Full -> "full"
    ShortDate -> "shortDate"
    MediumDate -> "mediumDate"
    LongDate -> "longDate"
    FullDate -> "fullDate"
    ShortTime -> "shortTime"
    MediumTime -> "mediumTime"
    LongTime -> "longTime"
    FullTime -> "fullTime"
  }
}

pub fn date_options() -> DateFilterOptions {
  DateFilterOptions(locale: None, intl: unsafe.empty_object())
}

pub fn date_options_with_locale(
  options: DateFilterOptions,
  locale: String,
) -> DateFilterOptions {
  DateFilterOptions(..options, locale: Some(locale))
}

pub fn date_options_with_intl(
  options: DateFilterOptions,
  intl: Dynamic,
) -> DateFilterOptions {
  DateFilterOptions(..options, intl: intl)
}

pub fn number_options() -> NumberFilterOptions {
  NumberFilterOptions(locale: None, intl: unsafe.empty_object())
}

pub fn number_options_with_locale(
  options: NumberFilterOptions,
  locale: String,
) -> NumberFilterOptions {
  NumberFilterOptions(..options, locale: Some(locale))
}

pub fn number_options_with_intl(
  options: NumberFilterOptions,
  intl: Dynamic,
) -> NumberFilterOptions {
  NumberFilterOptions(..options, intl: intl)
}

pub fn currency_options() -> CurrencyFilterOptions {
  CurrencyFilterOptions(locale: None, intl: unsafe.empty_object())
}

pub fn currency_options_with_locale(
  options: CurrencyFilterOptions,
  locale: String,
) -> CurrencyFilterOptions {
  CurrencyFilterOptions(..options, locale: Some(locale))
}

pub fn currency_options_with_intl(
  options: CurrencyFilterOptions,
  intl: Dynamic,
) -> CurrencyFilterOptions {
  CurrencyFilterOptions(..options, intl: intl)
}

pub fn relative_time_options() -> RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(locale: None, intl: unsafe.empty_object())
}

pub fn relative_time_options_with_locale(
  options: RelativeTimeFilterOptions,
  locale: String,
) -> RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(..options, locale: Some(locale))
}

pub fn relative_time_options_with_intl(
  options: RelativeTimeFilterOptions,
  intl: Dynamic,
) -> RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(..options, intl: intl)
}

pub fn to_js_date_options(options: DateFilterOptions) -> Dynamic {
  merge_locale(options.intl, options.locale)
}

pub fn to_js_number_options(options: NumberFilterOptions) -> Dynamic {
  merge_locale(options.intl, options.locale)
}

pub fn to_js_currency_options(options: CurrencyFilterOptions) -> Dynamic {
  merge_locale(options.intl, options.locale)
}

pub fn to_js_relative_time_options(
  options: RelativeTimeFilterOptions,
) -> Dynamic {
  merge_locale(options.intl, options.locale)
}

fn merge_locale(intl: Dynamic, locale: Option(String)) -> Dynamic {
  case locale {
    Some(locale) -> unsafe.set_string(intl, "locale", locale)
    None -> intl
  }
}
