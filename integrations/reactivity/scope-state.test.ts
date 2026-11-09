import { expect, test } from "@playwright/test";

interface Todo {
  title: string;
  done: boolean;
}

interface ScopeStateHarness {
  scope: {
    task: Todo;
    watch(expression: string, listener: (value: unknown) => void): unknown;
    destroy(): void;
  };
  compile(template: string): (scope: unknown) => Element;
  original: Todo;
  previous: Todo;
  changes: unknown[];
  replace: (scope: unknown) => void;
  stateHandle: (scope: unknown) => unknown;
}

type TestWindow = Window & { scopeStateTest: ScopeStateHarness };

const fixtures = [
  {
    language: "Scala",
    url: "/integrations/scala/test/scope_state/target/scala-3.3.3/angular-ts-scala-scope-state-tests-fastopt/main.js",
    create: "createTodo",
    replace: "replaceTodo",
    stateHandle: "stateHandle",
  },
  {
    language: "Gleam",
    url: "/integrations/gleam/build/dev/javascript/angular_ts/scope_state_test.mjs",
    create: "create_todo",
    replace: "replace_todo",
    stateHandle: "state_handle",
  },
];

for (const fixture of fixtures) {
  test.describe(fixture.language, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/integrations/reactivity/scope-state.html");
      await page.waitForFunction(() => "scopeStateTest" in window);
      await page.evaluate(async (fixture) => {
        const compiled = await import(fixture.url);
        const harness = (window as TestWindow).scopeStateTest;
        harness.original = compiled[fixture.create]();
        harness.scope.task = harness.original;
        harness.previous = harness.scope.task;
        harness.replace = compiled[fixture.replace];
        harness.stateHandle = compiled[fixture.stateHandle];
        harness.scope.watch("task.done", (value) => {
          harness.changes.push(value);
        });
        document.getElementById("app")!.append(
          harness.compile("<output>{{task.title}}:{{task.done}}</output>")(
            harness.scope,
          ),
        );
      }, fixture);
      await expect(page.locator("output")).toHaveText("Immutable todo:false");
    });

    test("typed state is the live scope, not a snapshot", async ({ page }) => {
      expect(
        await page.evaluate(() => {
          const harness = (window as TestWindow).scopeStateTest;
          return harness.stateHandle(harness.scope) === harness.scope;
        }),
      ).toBe(true);
    });

    test("compiled immutable replacement updates bindings and observers", async ({
      page,
    }) => {
      await page.evaluate(() => {
        const harness = (window as TestWindow).scopeStateTest;
        harness.changes.length = 0;
        harness.replace(harness.scope);
      });
      await expect(page.locator("output")).toHaveText("Immutable todo:true");
      expect(
        await page.evaluate(() => {
          const harness = (window as TestWindow).scopeStateTest;
          return {
            originalDone: harness.original.done,
            replaced: harness.scope.task !== harness.previous,
            changes: harness.changes,
          };
        }),
      ).toEqual({ originalDone: false, replaced: true, changes: [true] });
    });

    test("reassigning the same instance does not notify observers", async ({
      page,
    }) => {
      expect(
        await page.evaluate(async () => {
          const harness = (window as TestWindow).scopeStateTest;
          harness.changes.length = 0;
          const current = harness.scope.task;
          harness.scope.task = current;
          await new Promise((resolve) => setTimeout(resolve, 0));
          return harness.changes;
        }),
      ).toEqual([]);
    });
  });
}

test("Scala getter-only fields reject in-place mutation", async ({ page }) => {
  await page.goto("/integrations/reactivity/scope-state.html");
  await page.waitForFunction(() => "scopeStateTest" in window);
  const rejected = await page.evaluate(async (fixture) => {
    const compiled = await import(fixture.url);
    const harness = (window as TestWindow).scopeStateTest;
    harness.scope.task = compiled[fixture.create]();
    try {
      harness.scope.task.done = true;
      return false;
    } catch (error) {
      return error instanceof TypeError && harness.scope.task.done === false;
    }
  }, fixtures[0]);
  expect(rejected).toBe(true);
});
