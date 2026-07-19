import test from "node:test";
import assert from "node:assert/strict";
import {
  type ControllerAliasSymbol,
  scopeSymbolsAtOffset,
} from "../templates/scopeSymbols";

test("infers controller alias scope symbols at nested offsets", () => {
  const text = `
    <section ng-controller="DemoController as vm">
      <button ng-click="vm.save(vm.user)">Save</button>
    </section>
  `;
  const symbols = scopeSymbolsAtOffset(text, text.indexOf("vm.save"));

  assert.deepEqual(
    symbols
      .filter((symbol): symbol is ControllerAliasSymbol => symbol.kind === "controller")
      .map((symbol) => ({
        name: symbol.name,
        type: symbol.type,
        controller: symbol.controller,
      })),
    [
      {
        name: "vm",
        type: "DemoController",
        controller: "DemoController",
      },
    ],
  );
});

test("does not leak controller aliases after the controller element closes", () => {
  const text = `
    <section ng-controller="DemoController as vm">
      <button ng-click="vm.save()">Save</button>
    </section>
    <button ng-click="vm.save()">Outside</button>
  `;
  const symbols = scopeSymbolsAtOffset(text, text.lastIndexOf("vm.save"));

  assert.deepEqual(symbols, []);
});

test("infers ng-repeat item locals at nested offsets", () => {
  const text = `
    <ul>
      <li ng-repeat="user in users track by user.id">
        <button ng-click="select(user)">{{ user.name }}</button>
      </li>
    </ul>
  `;
  const symbols = scopeSymbolsAtOffset(text, text.indexOf("select"));

  assert.deepEqual(
    symbols.map((symbol) => ({
      kind: symbol.kind,
      name: symbol.name,
      type: symbol.type,
    })),
    [
      {
        kind: "repeat",
        name: "user",
        type: "__AngularTsRepeatItem<typeof users>",
      },
    ],
  );
});

test("infers component controller locals inside inline templates", () => {
  const source = `
    class UserCardController {}
    angular.module("demo", []).component("userCard", {
      controller: UserCardController,
      template: \`<p>{{$ctrl.user.name}}</p>\`
    });
  `;
  const symbols = scopeSymbolsAtOffset(source, source.indexOf("$ctrl.user"));

  assert.deepEqual(
    symbols
      .filter((symbol): symbol is ControllerAliasSymbol => symbol.kind === "controller")
      .map((symbol) => ({
        name: symbol.name,
        type: symbol.type,
        controller: symbol.controller,
      })),
    [
      {
        name: "$ctrl",
        type: "UserCardController",
        controller: "UserCardController",
      },
    ],
  );
});

test("uses explicit component controllerAs aliases inside inline templates", () => {
  const source = `
    class UserCardController {}
    angular.module("demo", []).component("userCard", {
      controller: UserCardController,
      controllerAs: "card",
      template: \`<p>{{card.user.name}}</p>\`
    });
  `;
  const symbols = scopeSymbolsAtOffset(source, source.indexOf("card.user"));

  assert.deepEqual(
    symbols
      .filter((symbol): symbol is ControllerAliasSymbol => symbol.kind === "controller")
      .map((symbol) => symbol.name),
    ["card"],
  );
});

test("augments inline component controller locals with binding types", () => {
  const source = `
    class UserCardController {}
    angular.module("demo", []).component("userCard", {
      controller: UserCardController,
      bindings: {
        label: "@",
        user: "<",
        onSelect: "&?"
      },
      template: \`<button ng-click="$ctrl.onSelect({ user: $ctrl.user })">{{$ctrl.label}}</button>\`
    });
  `;
  const symbols = scopeSymbolsAtOffset(source, source.indexOf("$ctrl.label"));

  assert.deepEqual(
    symbols
      .filter((symbol): symbol is ControllerAliasSymbol => symbol.kind === "controller")
      .map((symbol) => symbol.type),
    [
      "UserCardController & { label: string; user: unknown; onSelect?: (locals?: Record<string, unknown>) => unknown }",
    ],
  );
});
