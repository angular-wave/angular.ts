// @ts-nocheck
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const RECIPE = new URL(
  "../../docs/content/docs/cookbook/optimized-runtime-build.md",
  import.meta.url,
);
const RUNNER = "/docs/static/examples/cookbook/optimized-runtime-runner.html";

async function snippets(): Promise<Map<string, string[]>> {
  const markdown = await readFile(RECIPE, "utf8");
  const result = new Map<string, string[]>();

  for (const match of markdown.matchAll(/```(\w+)\n([\s\S]*?)```/gu)) {
    const [, language, source] = match;
    result.set(language, [...(result.get(language) ?? []), source]);
  }

  return result;
}

test("optimized runtime recipe boots its exact composition", async ({
  page,
}) => {
  const example = await snippets();
  const source = example.get("ts")?.[0];
  const html = example.get("html")?.[0];
  expect(source).toBeDefined();
  expect(html).toBeDefined();

  await page.goto(RUNNER);
  await page.evaluate(
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
        const runtime = await import(url);
        globalThis.optimizedRuntime = runtime.angular;
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { source, html },
  );

  await expect(page.locator("strong")).toHaveText("0");
  await page.getByRole("button", { name: "Increase" }).click();
  await expect(page.locator("strong")).toHaveText("1");
  const hasHttp = await page.evaluate(() => {
    const angular = globalThis.optimizedRuntime;
    const injector = angular.getInjector(document.querySelector("section"));
    const result = injector.has("$http");
    angular._composition.destroy();
    return result;
  });
  expect(hasHttp).toBe(false);
});

test("optimized runtime recipe keeps production property names", async () => {
  const source = (await snippets()).get("js")?.[0];
  expect(source).toBeDefined();
  const executable = source
    .replace("import { defineConfig } from 'vite';", "")
    .replace("export default defineConfig(", "return defineConfig(");
  const config = Function("defineConfig", executable)((value) => value);

  expect(config.build).toMatchObject({
    target: "es2022",
    minify: "esbuild",
    sourcemap: "hidden",
  });
  expect(config.build.rollupOptions.input).toBe("src/runtime.ts");
  expect(config.build.rollupOptions.output.entryFileNames).toContain("[hash]");
});
