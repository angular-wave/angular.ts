import { NgModule } from "./ng-module.ts";
import type { ComponentDefinition } from "../../../interface.ts";

interface User {
  id: number;
  name: string;
}

class UserCard {
  user!: User;
  count = 0;
  label = "";
  onSave!: (locals: { user: User }) => Promise<boolean>;
  onCancel?: () => void;
  readUser!: () => User;
  empty: null = null;
}

const module = new NgModule("component-binding-types", []);

module.component("userCard", {
  controller: UserCard,
  bindings: {
    user: "< sourceUser",
    count: "=?sourceCount",
    label: "@?heading",
    onSave: "&saveUser",
    onCancel: " \t&? cancelUser ",
    readUser: "<",
  },
  view: ({ controller }) => {
    const user: User = controller.user;
    const saved: Promise<boolean> = controller.onSave({ user });
    void saved;
    // @ts-expect-error callback locals retain the controller's declared shape
    controller.onSave({ user: 42 });
    // @ts-expect-error two-way bindings retain their declared property type
    controller.count = "many";
    return user.name;
  },
});

module.component("misspelledBinding", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error binding names must exist on the inferred controller
    usr: "<",
  },
});

module.component("nonCallableCallback", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error expression callbacks require a callable property
    user: "&",
  },
});

module.component("nonCallableOptionalCallback", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error whitespace, optional markers, and aliases do not bypass callback checking
    count: " \t&? updateCount ",
  },
});

module.component("emptyCallback", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error null is not a callable callback
    empty: "&",
  },
});

const possibleCallbackMode = "&" as "<" | "&";
module.component("possibleNonCallableCallback", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error every possible callback mode requires a callable property
    count: possibleCallbackMode,
  },
});

module.component("annotatedController", {
  controller: ["users", UserCard],
  bindings: { user: "<", onSave: "&" },
});

module.component("annotatedControllerTypo", {
  controller: ["users", UserCard],
  bindings: {
    // @ts-expect-error annotated controllers also infer binding names
    usr: "<",
  },
});

module.component("controllerFactory", {
  controller: () => ({
    user: {} as User,
    onSave: (_locals: { user: User }) => true,
  }),
  bindings: { user: "<", onSave: "&" },
  view: ({ controller }) => controller.user.name,
});

module.component("controllerFactoryTypo", {
  controller: () => ({ user: {} as User }),
  bindings: {
    // @ts-expect-error returned controller objects supply binding names
    usr: "<",
  },
});

const storedOptions = {
  controller: UserCard,
  bindings: { user: "<", onSave: "&" },
};
module.component("storedOptions", storedOptions);

const literalOptions = {
  controller: UserCard,
  bindings: { user: "&" },
} as const;
// @ts-expect-error stored literal callback declarations are checked
module.component("invalidStoredOptions", literalOptions);

const typedOptions: ComponentDefinition<UserCard> = {
  controller: UserCard,
  bindings: {
    // @ts-expect-error explicit definition types also check binding names
    usr: "<",
  },
};
void typedOptions;

module.component<UserCard>("namedTypedController", {
  controller: "UserCard",
  bindings: { user: "<", onSave: "&" },
});

module.component<UserCard>("explicitControllerTypo", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error explicit controller types also reject misspelled bindings
    usr: "<",
  },
});

module.component<UserCard>("explicitControllerCallback", {
  controller: UserCard,
  bindings: {
    // @ts-expect-error explicit controller types reject non-callable callbacks
    count: "&",
  },
});

const invalidTypedCallback: ComponentDefinition<UserCard> = {
  controller: UserCard,
  bindings: {
    // @ts-expect-error typed component definitions also check callback properties
    user: "&?onSave",
  },
};
void invalidTypedCallback;

module.component<UserCard>("spacedExplicitBindings", {
  controller: "UserCard",
  bindings: { user: " \t< sourceUser ", onSave: " \t&? saveUser " },
});

// @ts-expect-error inferred bindings must preserve the mutually exclusive rendering options
module.component("invalidRenderingOptions", {
  controller: UserCard,
  bindings: { user: "<" },
  view: ({ controller }: { controller: UserCard }) => controller.user.name,
  template: "<strong>{{ $ctrl.user.name }}</strong>",
});

const constructor: ng.ControllerConstructor<UserCard> = UserCard;
void constructor;

module.component("untypedNamedController", {
  controller: "UserCard",
  bindings: { user: "<", onSave: "&" },
});
module.component("implicitController", {
  bindings: { count: "<", onSave: "&" },
  template: "<strong>{{ $ctrl.count }}</strong>",
});

module.component("functionInputAndTwoWayBinding", {
  controller: UserCard,
  bindings: { readUser: "=", onSave: "<" },
});
