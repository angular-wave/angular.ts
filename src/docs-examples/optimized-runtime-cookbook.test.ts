import { expect, test, type APIRequestContext } from "@playwright/test";
import type { AngularRuntime } from "../angular-runtime.ts";

const RECIPE = "/docs/content/docs/cookbook/optimized-runtime-build.md";
const RUNNER = "/docs/static/examples/cookbook/optimized-runtime-runner.html";

async function snippets(
  request: APIRequestContext,
): Promise<Map<string, string[]>> {
  const response = await request.get(RECIPE);
  expect(response.ok()).toBe(true);
  const markdown = await response.text();
  const result = new Map<string, string[]>();

  for (const match of markdown.matchAll(/```(\w+)\n([\s\S]*?)```/gu)) {
    const [, language, source] = match;
    result.set(language, [...(result.get(language) ?? []), source]);
  }

  return result;
}

test("optimized runtime recipe boots its exact composition", async ({
  page,
  request,
}) => {
  const example = await snippets(request);
  const source = example.get("ts")?.[0];
  const html = example.get("html")?.[0];
  if (!source || !html) throw new Error("Missing runtime recipe snippets");

  await page.goto(RUNNER);
  const runtime = await page.evaluateHandle(
    async ({ source, html }) => {
      document.body.innerHTML = html;
      const origin = location.origin;
      const executable = source
        .replace(
          "@angular-wave/angular.ts/runtime",
          `${origin}/src/runtime/index.ts`,
        )
        .replace(
          "@angular-wave/angular.ts/directive/controller",
          `${origin}/src/directive/controller/controller.ts`,
        )
        .replace(
          "@angular-wave/angular.ts/directive/events",
          `${origin}/src/directive/events/events.ts`,
        );
      const url = URL.createObjectURL(
        new Blob([executable], { type: "text/javascript" }),
      );

      try {
        const runtime: { angular: AngularRuntime } = await import(url);
        return runtime.angular;
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { source, html },
  );

  await expect(page.locator("strong")).toHaveText("0");
  await page.getByRole("button", { name: "Increase" }).click();
  await expect(page.locator("strong")).toHaveText("1");
  const hasHttp = await runtime.evaluate((angular) => {
    const root = document.querySelector("section");
    if (!root) throw new Error("Missing runtime recipe root");
    const injector = angular.getInjector(root);
    const result = injector.has("$http");
    angular._composition.destroy();
    return result;
  });
  await runtime.dispose();
  expect(hasHttp).toBe(false);
});

test("optimized runtime recipe keeps production property names", async ({
  request,
}) => {
  const source = (await snippets(request)).get("js")?.[0];
  if (!source) throw new Error("Missing production config snippet");
  const executable = source
    .replace("import { defineConfig } from 'vite';", "")
    .replace("export default defineConfig(", "return defineConfig(");
  const config: unknown = Function(
    "defineConfig",
    executable,
  )((value: unknown) => value);

  expect(config).toMatchObject({
    build: {
      target: "es2022",
      minify: "esbuild",
      sourcemap: "hidden",
      rollupOptions: {
        input: "src/runtime.ts",
        output: { entryFileNames: expect.stringContaining("[hash]") },
      },
    },
  });
});
