import test from "node:test";
import assert from "node:assert/strict";
import { scopeSymbolsAtOffset } from "../templates/scopeSymbols";
import { TypeScriptExpressionService } from "../templates/typescriptExpressions";

const declarations = `
  interface User {
    name: string;
  }

  function save(user: User, force?: boolean): boolean {
    return Boolean(force || user.name);
  }
`;

test("provides TypeScript hover data for AngularTS expression properties", () => {
  const expression = "user.name";
  const service = new TypeScriptExpressionService(expression, {
    declarations,
    locals: [{ name: "user", type: "User" }],
  });

  const info = service.quickInfo(expression.indexOf("name"));

  assert.match(info?.display ?? "", /\(property\) User\.name: string/);
  assert.equal(info?.start, expression.indexOf("name"));
  assert.equal(info?.end, expression.length);
});

test("provides TypeScript signature help for AngularTS expression calls", () => {
  const expression = "save(user, )";
  const service = new TypeScriptExpressionService(expression, {
    declarations,
    locals: [{ name: "user", type: "User" }],
  });

  const signature = service.signatureHelp(expression.indexOf(", ") + 2);

  assert.equal(signature?.signature, "save(user: User, force?: boolean): boolean");
  assert.equal(signature?.activeParameter, 1);
});

test("provides TypeScript definitions from AngularTS expressions", () => {
  const expression = "save(user)";
  const service = new TypeScriptExpressionService(expression, {
    declarations,
    locals: [{ name: "user", type: "User" }],
  });

  const definitions = service.definitions(expression.indexOf("save"));

  assert.equal(definitions.length, 1);
});

test("uses inferred controller alias locals for AngularTS expressions", () => {
  const template = `
    <section ng-controller="DemoController as vm">
      <button ng-click="vm.save(vm.user)">Save</button>
    </section>
  `;
  const expression = "vm.save(vm.user)";
  const service = new TypeScriptExpressionService(expression, {
    declarations: `
      interface User { name: string }
      class DemoController {
        user!: User;
        save(user: User): boolean {
          return Boolean(user.name);
        }
      }
    `,
    locals: scopeSymbolsAtOffset(template, template.indexOf("vm.save")),
  });

  const info = service.quickInfo(expression.indexOf("save"));

  assert.match(
    info?.display ?? "",
    /\(method\) DemoController\.save\(user: User\): boolean/,
  );
});

test("uses inferred ng-repeat locals for AngularTS expressions", () => {
  const template = `
    <ul>
      <li ng-repeat="user in users">
        {{ user.name }}
      </li>
    </ul>
  `;
  const expression = "user.name";
  const service = new TypeScriptExpressionService(expression, {
    declarations: "interface User { name: string }",
    locals: [
      { name: "users", type: "User[]" },
      ...scopeSymbolsAtOffset(template, template.indexOf("user.name")),
    ],
  });

  const info = service.quickInfo(expression.indexOf("name"));

  assert.match(info?.display ?? "", /\(property\) User\.name: string/);
});

test("extracts string-literal unions from AngularTS expressions", () => {
  const expression = "$ctrl.route";
  const service = new TypeScriptExpressionService(expression, {
    declarations: `
      class DemoController {
        route: "admin.profile" | "admin.roles" = "admin.profile";
      }
    `,
    locals: [{ name: "$ctrl", type: "DemoController" }],
  });

  assert.deepEqual(service.stringLiteralUnion(expression.indexOf("route"))?.values, [
    "admin.profile",
    "admin.roles",
  ]);
});

test("checks AngularTS expression assignability", () => {
  const numberExpression = new TypeScriptExpressionService("$ctrl.user.id", {
    declarations: `
      class DemoController {
        user: { id: number; name: string } = { id: 1, name: "Ada" };
      }
    `,
    locals: [{ name: "$ctrl", type: "DemoController" }],
  });
  const stringExpression = new TypeScriptExpressionService("$ctrl.user.name", {
    declarations: `
      class DemoController {
        user: { id: number; name: string } = { id: 1, name: "Ada" };
      }
    `,
    locals: [{ name: "$ctrl", type: "DemoController" }],
  });

  assert.equal(numberExpression.isAssignableTo("number"), true);
  assert.equal(stringExpression.isAssignableTo("number"), false);
});

test("checks AngularTS resolve value assignability", () => {
  const matchingResolve = new TypeScriptExpressionService("loadUser", {
    declarations: `
      interface User { name: string }
      function loadUser(): Promise<User> {
        return Promise.resolve({ name: "Ada" });
      }
      class UserProfileController {
        user!: User;
      }
    `,
  });
  const mismatchedResolve = new TypeScriptExpressionService("loadUser", {
    declarations: `
      interface User { name: string }
      function loadUser(): string {
        return "wrong";
      }
      class UserProfileController {
        user!: User;
      }
    `,
  });

  assert.equal(
    matchingResolve.canUseType('UserProfileController["user"]'),
    true,
  );
  assert.equal(
    matchingResolve.isResolvedValueAssignableTo('UserProfileController["user"]'),
    true,
  );
  assert.equal(
    mismatchedResolve.isResolvedValueAssignableTo('UserProfileController["user"]'),
    false,
  );
});

test("uses inferred component controller locals for inline template expressions", () => {
  const source = `
    interface User { name: string }
    class UserCardController {
      user!: User;
    }
    angular.module("demo", []).component("userCard", {
      controller: UserCardController,
      template: \`<p>{{$ctrl.user.name}}</p>\`
    });
  `;
  const expression = "$ctrl.user.name";
  const service = new TypeScriptExpressionService(expression, {
    declarations: source,
    locals: scopeSymbolsAtOffset(source, source.indexOf("$ctrl.user")),
  });

  const info = service.quickInfo(expression.indexOf("name"));

  assert.match(info?.display ?? "", /\(property\) User\.name: string/);
});

test("uses inferred component binding types for inline template expressions", () => {
  const source = `
    class UserCardController {}
    angular.module("demo", []).component("userCard", {
      controller: UserCardController,
      bindings: {
        label: "@",
        onSelect: "&?"
      },
      template: \`<button ng-click="$ctrl.onSelect()">{{$ctrl.label}}</button>\`
    });
  `;
  const expression = "$ctrl.label";
  const service = new TypeScriptExpressionService(expression, {
    declarations: source,
    locals: scopeSymbolsAtOffset(source, source.indexOf("$ctrl.label")),
  });

  const info = service.quickInfo(expression.indexOf("label"));

  assert.match(info?.display ?? "", /\(property\) label: string/);
});

test("resolves inline template property definitions to component controller source", () => {
  const source = `
    interface User { name: string }
    class UserCardController {
      user!: User;
    }
    angular.module("demo", []).component("userCard", {
      controller: UserCardController,
      template: \`<p>{{$ctrl.user.name}}</p>\`
    });
  `;
  const expression = "$ctrl.user.name";
  const service = new TypeScriptExpressionService(expression, {
    declarations: source,
    locals: scopeSymbolsAtOffset(source, source.indexOf("$ctrl.user")),
  });

  const definitions = service.definitions(expression.indexOf("user"));

  assert.equal(definitions.length, 1);
  assert.equal(source.slice(definitions[0].start, definitions[0].end), "user");
});
