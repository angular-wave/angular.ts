import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}

pub opaque type DateFilterOptions {
  DateFilterOptions(intl: Dynamic)
}

pub opaque type NumberFilterOptions {
  NumberFilterOptions(intl: Dynamic)
}

pub opaque type CurrencyFilterOptions {
  CurrencyFilterOptions(intl: Dynamic)
}

pub opaque type RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(intl: Dynamic)
}

pub type EntryFilterItem(key, value) {
  EntryFilterItem(key: key, value: value)
}

pub type DateFormat {
  MediumDate
}

pub fn date_format_name(format: DateFormat) -> String {
  case format {
    MediumDate -> "mediumDate"
  }
}

pub fn date_options() -> DateFilterOptions {
  DateFilterOptions(intl: unsafe.empty_object())
}

pub fn date_options_with_intl(
  _options: DateFilterOptions,
  intl: Dynamic,
) -> DateFilterOptions {
  DateFilterOptions(intl: intl)
}

pub fn number_options() -> NumberFilterOptions {
  NumberFilterOptions(intl: unsafe.empty_object())
}

pub fn number_options_with_intl(
  _options: NumberFilterOptions,
  intl: Dynamic,
) -> NumberFilterOptions {
  NumberFilterOptions(intl: intl)
}

pub fn currency_options() -> CurrencyFilterOptions {
  CurrencyFilterOptions(intl: unsafe.empty_object())
}

pub fn currency_options_with_intl(
  _options: CurrencyFilterOptions,
  intl: Dynamic,
) -> CurrencyFilterOptions {
  CurrencyFilterOptions(intl: intl)
}

pub fn relative_time_options() -> RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(intl: unsafe.empty_object())
}

pub fn relative_time_options_with_intl(
  _options: RelativeTimeFilterOptions,
  intl: Dynamic,
) -> RelativeTimeFilterOptions {
  RelativeTimeFilterOptions(intl: intl)
}

pub fn to_js_date_options(options: DateFilterOptions) -> Dynamic {
  options.intl
}

pub fn to_js_number_options(options: NumberFilterOptions) -> Dynamic {
  options.intl
}

pub fn to_js_currency_options(options: CurrencyFilterOptions) -> Dynamic {
  options.intl
}

pub fn to_js_relative_time_options(
  options: RelativeTimeFilterOptions,
) -> Dynamic {
  options.intl
}
