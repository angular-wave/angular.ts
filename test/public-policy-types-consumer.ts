import type {
  Policy,
  PolicyContext,
  PolicyDecision,
} from "@angular-wave/angular.ts";

type AuditContext = PolicyContext<"audit">;

const decision: PolicyDecision<"allow"> = {
  type: "allow",
};
const policy: Policy<AuditContext, "allow"> = (context) => ({
  ...decision,
  meta: context.meta,
});

void policy;

// Published form declarations retain their value domains after internal fields are stripped.
function typedFormControl(control: ng.NgModelController<number, string>) {
  control.setViewValue("24");
  control.parsers.push((text) => (text === "" ? undefined : Number(text)));
  control.formatters.push((value) => value?.toString() ?? "");
  control.asyncValidators.remote = (_model, _view, { signal }) =>
    fetch("/validate", { signal });
  const model: number | undefined = control.modelValue;
  // @ts-expect-error the published control rejects values outside its view domain.
  control.setViewValue(24);
  // @ts-expect-error the published parser must produce the model domain.
  control.parsers.push((text) => text);
  return model;
}

function templateConsumer(
  request: ng.TemplateRequestService,
  signal: AbortSignal,
) {
  const options: ng.TemplateRequestOptions = { signal };
  // @ts-expect-error cancellation options require a native AbortSignal.
  const invalid: ng.TemplateRequestOptions = { signal: Promise.resolve() };
  void invalid;
  return request("/panel", options);
}
void typedFormControl;
void templateConsumer;

function registerTypedControl(module: ng.NgModule) {
  module.directive("amount", () => ({
    require: "ngModel",
    link(
      _scope: ng.Scope,
      _element: HTMLElement,
      control: ng.NgModelController<number, string>,
    ) {
      control.parsers.push((text) => Number(text));
      control.formatters.push((value) => value?.toString() ?? "");
    },
  }));
}
void registerTypedControl;
