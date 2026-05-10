import { defineAngularElement } from "../../runtime/web-component.ts";

/** @type {ng.AngularElementOptions<ng.Scope>} */
const ngMicroapp = {
  component: {
    inputs: {
      title: {
        type: (value) => JSON.parse(String(value)),
      },
    },
    scope: {
      greeting: "Hello world",
    },
    template: `
      <div>Hello: {{ title.name }} {{ greeting }}</div>
    `,
    connected({ dispatch, injector, scope }) {
      console.log("Microapp connected", { dispatch, injector, scope });
    },
  },
};

defineAngularElement("ng-microapp", ngMicroapp);
