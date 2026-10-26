import type { FormController } from "../form/form.ts";
import type { NgModelController } from "./model.ts";

// Compile-time contracts; runtime behavior is exercised in model.spec.ts.
function numberControl(control: NgModelController<number, string>) {
  control.setViewValue("42");
  const model: number | undefined = control.modelValue;
  const view: string | undefined = control.viewValue;
  control.parsers.push((value) => (value === "" ? undefined : Number(value)));
  control.formatters.push((value) => value?.toFixed(2) ?? "");
  control.validators.positive = (value, text) =>
    (value ?? 0) > 0 && text !== "";
  control.asyncValidators.remote = (value, text, { signal }) => {
    const numeric: number | undefined = value;
    const original: string | undefined = text;
    void numeric;
    void original;
    return fetch("/validate", { signal });
  };
  // @ts-expect-error view updates must use the declared view domain.
  control.setViewValue(42);
  // @ts-expect-error parsers must return a model value or undefined.
  control.parsers.push((value) => value);
  // @ts-expect-error formatters must return the view domain.
  control.formatters.push((value) => value);
  // @ts-expect-error validators receive the numeric model domain.
  control.validators.invalid = (value: string) => value.length > 0;
  // @ts-expect-error async validators must return a thenable.
  control.asyncValidators.invalid = () => true;
  void model;
  void view;
}
function heterogeneousForm(
  form: FormController,
  number: NgModelController<number, string>,
  date: NgModelController<Date, string>,
) {
  form.addControl(number);
  form.addControl(date);
  form.setNativeValidity(true, number);
  form.removeControl(date);
}
void heterogeneousForm;
void numberControl;
