/// <reference types="jasmine" />
import type { Scope } from "../../core/scope/scope.ts";
import type { EventBusListener } from "./event-bus.ts";
import { EventBus } from "./event-bus.ts";

// Compile-time fixtures: this file is checked by tsc, not imported by a browser runner.
declare function typeFixture<T>(): T;

interface CounterContext {
  count: number;
  label: string;
}

describe("$eventBus types", () => {
  it("typechecks unbound and context-bound listeners", () => {
    const eventBus = typeFixture<EventBus>();
    const context: CounterContext = { count: 0, label: "cart" };
    const scope = typeFixture<Scope>();

    eventBus.subscribe("cart:item-added", (...args) => {
      const values: unknown[] = args;

      void values;
    });

    eventBus.subscribe(
      "cart:item-added",
      function () {
        this.count += 1;
        const label: string = this.label;

        void label;
      },
      context,
    );

    eventBus.subscribeOnce(
      "cart:item-added",
      function () {
        this.count += 1;
      },
      context,
    );

    eventBus.unsubscribe(
      "cart:item-added",
      function () {
        this.count += 1;
      },
      context,
    );

    eventBus.subscribe(
      "scope:changed",
      function () {
        this.on("$destroy", () => undefined);
      },
      scope,
    );

    const listener: EventBusListener<CounterContext> = function () {
      this.count += 1;
    };

    eventBus.subscribe("cart:item-added", listener, context);
    eventBus.subscribeOnce("cart:item-added", listener, context);

    // @ts-expect-error context-bound listener rejects missing context fields.
    eventBus.subscribe("cart:item-added", listener, { count: 0 });
    // @ts-expect-error listener expects CounterContext, not Scope.
    eventBus.subscribe("cart:item-added", listener, scope);
    eventBus.subscribe(
      "cart:item-added",
      function () {
        // @ts-expect-error context-bound this rejects missing properties.
        void this.missing;
      },
      context,
    );

    expect(context.count).toBe(0);
  });
});
