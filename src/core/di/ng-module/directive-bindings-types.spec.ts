import { NgModule } from "./ng-module.ts";

interface User {
  id: number;
  name: string;
}

class UserEditor {
  user!: User;
  count = 0;
  onSave!: (locals: { user: User }) => Promise<boolean>;
  onCancel?: () => void;
  readUser!: () => User;
  empty: null = null;
}

const module = new NgModule("directive-binding-types", []);

function registerOpaqueFactories(
  eventFactory: ng.DirectiveFactory,
  directives: Record<string, ng.DirectiveFactory>,
) {
  module.directive("ngInput", eventFactory);
  for (const name of Object.keys(directives)) {
    module.directive(name, directives[name]);
  }
}
void registerOpaqueFactories;

module.directive("userEditor", () => ({
  controller: UserEditor,
  scope: {},
  bindToController: { user: "<sourceUser", count: "=?", onSave: "&save" },
  view: ({ controller }) => {
    const user: User = controller.user;
    const saved: Promise<boolean> = controller.onSave({ user });
    void saved;
    // @ts-expect-error callback locals retain their declared type
    controller.onSave({ user: 42 });
    return user.name;
  },
}));

// @ts-expect-error bound properties must exist on the controller
module.directive("misspelledBinding", () => ({
  controller: UserEditor,
  bindToController: {
    usr: "<",
  },
}));

// @ts-expect-error callback bindings require callable controller properties
module.directive("nonCallableCallback", () => ({
  controller: UserEditor,
  bindToController: {
    count: "&",
  },
}));

module.directive("annotatedController", () => ({
  controller: ["users", UserEditor],
  bindToController: { user: "<", onCancel: " \t&? cancel " },
}));

module.directive("annotatedFactory", [
  "users",
  (_users: unknown) => ({
    controller: UserEditor,
    bindToController: { user: "<", onSave: "&" },
  }),
]);

const typedDirective: ng.Directive<UserEditor> = {
  controller: UserEditor,
  bindToController: {
    // @ts-expect-error explicitly typed definitions reject callback bindings to numbers
    count: "&",
  },
};
void typedDirective;

module.directive("scopeBindings", () => ({
  controller: UserEditor,
  scope: { arbitraryScopeProperty: "<" },
  bindToController: false,
}));

module.directive("boundScope", () => ({
  controller: UserEditor,
  scope: { user: "<", count: "=", onSave: "&" },
  bindToController: true,
}));

// @ts-expect-error bindToController: true checks the scope binding names
module.directive("boundScopeTypo", () => ({
  controller: UserEditor,
  scope: { usr: "<" },
  bindToController: true,
}));

// @ts-expect-error bindToController: true checks scope callback properties
module.directive("boundScopeCallback", () => ({
  controller: UserEditor,
  scope: { count: "&" },
  bindToController: true,
}));

const storedOptions = {
  controller: UserEditor,
  bindToController: { user: "<", onSave: "&" },
};
module.directive("storedOptions", () => storedOptions);

const storedTrueOptions = {
  controller: UserEditor,
  bindToController: true,
  scope: { user: "<", onSave: "&" },
};
module.directive("storedTrueOptions", () => storedTrueOptions);

const typedOptions: ng.Directive<UserEditor> = {
  controller: UserEditor,
  bindToController: { user: "<", onSave: "&" },
};
module.directive("typedOptions", () => typedOptions);

const typedFactory: ng.DirectiveFactoryFn<UserEditor> = () => typedOptions;
module.directive("typedFactory", typedFactory);
const annotatedFactory: ng.AnnotatedDirectiveFactory<UserEditor> = [
  "users",
  typedFactory,
];
module.directive("storedAnnotatedFactory", annotatedFactory);
const publicFactory: ng.DirectiveFactory<UserEditor> = annotatedFactory;
module.directive("publicFactory", publicFactory);

module.directive<UserEditor>("explicitNamedController", () => ({
  controller: "UserEditor",
  bindToController: { user: "<", onSave: "&" },
}));

// @ts-expect-error explicit types check named controller binding properties
module.directive<UserEditor>("explicitTypo", () => ({
  controller: "UserEditor",
  bindToController: { usr: "<" },
}));

// @ts-expect-error explicit types check scope bindings forwarded to named controllers
module.directive<UserEditor>("explicitScopeTypo", () => ({
  controller: "UserEditor",
  bindToController: true,
  scope: { usr: "<" },
}));

module.directive("independentScopeBindings", () => ({
  controller: UserEditor,
  bindToController: { user: "<", readUser: "=", onSave: "<" },
  scope: { independentScopeProperty: "&" },
}));

module.directive("objectControllerFactory", () => ({
  controller: () => ({ user: {} as User, onSave: () => true }),
  bindToController: { user: "<", onSave: "&" },
  view: ({ controller }) => controller.user.name,
}));

// @ts-expect-error returned controller objects also supply binding names
module.directive("objectControllerTypo", () => ({
  controller: () => ({ user: {} as User }),
  bindToController: { usr: "<" },
}));

module.directive("annotatedTypo", [
  "users",
  // @ts-expect-error annotated directive factories also check binding properties
  () => ({
    controller: ["users", UserEditor],
    bindToController: { usr: "<" },
  }),
]);

// @ts-expect-error extra binding names are rejected alongside valid ones
module.directive("mixedBindingTypo", () => ({
  controller: UserEditor,
  bindToController: { user: "<", usr: "<" },
}));

// @ts-expect-error extra scope binding names are rejected alongside valid ones
module.directive("mixedScopeTypo", () => ({
  controller: UserEditor,
  bindToController: true,
  scope: { user: "<", usr: "<" },
}));

// @ts-expect-error optional markers, whitespace, and aliases still require callable callbacks
module.directive("nonCallableOptionalCallback", () => ({
  controller: UserEditor,
  bindToController: { user: " \t&? saveUser " },
}));

// @ts-expect-error null properties are not callable callbacks
module.directive("nullCallback", () => ({
  controller: UserEditor,
  bindToController: { empty: "&" },
}));

const possibleCallbackMode = "<" as "<" | "&";
// @ts-expect-error every possible callback mode requires a callable property
module.directive("possibleNonCallableCallback", () => ({
  controller: UserEditor,
  bindToController: { count: possibleCallbackMode },
}));

const storedTypo = {
  controller: UserEditor,
  bindToController: { usr: "<" },
};
// @ts-expect-error stored definitions still check binding names
module.directive("storedTypo", () => storedTypo);

const storedCallback = {
  controller: UserEditor,
  bindToController: { count: "&" },
} as const;
// @ts-expect-error stored literal binding declarations still check callbacks
module.directive("storedCallback", () => storedCallback);

const storedScopeCallback = {
  controller: UserEditor,
  bindToController: true,
  scope: { count: "&" },
} as const;
// @ts-expect-error stored literal scope callbacks are checked
module.directive("storedScopeCallback", () => storedScopeCallback);

module.directive("untypedNamedController", () => ({
  controller: "UserEditor",
  bindToController: { user: "<", onSave: "&" },
}));

module.directive("linkOnly", () => (scope: ng.Scope, element: HTMLElement) => {
  scope.watch("user", () => {});
  element.textContent = "Ready";
});
