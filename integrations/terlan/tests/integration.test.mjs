import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { generateBindings } from "../tool/bindings.mjs";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const runtimeRoot = path.resolve(
  process.env.ANGULAR_RUNTIME_ROOT || path.join(packageRoot, "../.."),
);
const compiler = process.env.TERLC || "terlc";
const workspace = mkdtempSync(path.join(tmpdir(), "angular-terlan-test-"));
const bindings = path.join(workspace, "bindings");
const compiled = path.join(workspace, "compiled");

before(() => {
  const inputs = generateBindings({ compiler, runtimeRoot, output: bindings });
  const runtime = JSON.parse(
    readFileSync(path.join(runtimeRoot, "package.json"), "utf8"),
  );
  assert.equal(inputs.source_package.version, runtime.version);
  const manifest = JSON.parse(
    readFileSync(
      path.join(bindings, "std/js/manifests/std_js_bindings.json"),
      "utf8",
    ),
  );
  for (const input of inputs.inputs) {
    assert.equal(
      input.sha256,
      createHash("sha256")
        .update(readFileSync(path.join(runtimeRoot, input.path)))
        .digest("hex"),
    );
  }
  for (const name of ["OnInit", "OnDestroy"]) {
    const module = manifest.outputs.find(
      (entry) => entry.module === `terlan.angular.interfaces.${name}`,
    );
    assert.ok(module, `missing ${name} binding`);
    assert.ok(
      module.members.some(
        (member) => member.name === "with_members" && member.kind === "mixin",
      ),
    );
  }
  assert.ok(
    !manifest.outputs.some((entry) => entry.module === "terlan.angular.Ng"),
    "bindings must come from declarations",
  );
  const consumer = path.join(workspace, "consumer");
  mkdirSync(path.join(consumer, "src/probe"), { recursive: true });
  writeFileSync(
    path.join(consumer, "terlan.toml"),
    `[package]\nname = "probe"\nversion = "0.1.0"\n[build]\nsource_roots = ["src"]\nartifact = "library"\n[dependencies]\nangular = { path = ${JSON.stringify(packageRoot)} }\n`,
  );
  writeFileSync(
    path.join(consumer, "src/probe/Controller.terl"),
    "module probe.Controller.\nimport terlan.angular.Lifecycle.\npub attach[Controller](controller: Controller, initialize: () -> Unit, destroy: () -> Unit): Controller ->\n    Lifecycle.attach(controller, initialize, destroy).\n",
  );
  for (const input of [".", "src/probe/Controller.terl"]) {
    const result = spawnSync(
      compiler,
      [
        "build",
        input,
        "--target",
        "js.shared",
        "--out-dir",
        compiled,
        "--cache-dir",
        path.join(workspace, "cache"),
        "--declarations",
      ],
      {
        cwd: consumer,
        env: {
          ...process.env,
          TERLAN_JS_BINDING_MANIFESTS: path.join(
            bindings,
            "std/js/manifests/std_js_bindings.json",
          ),
        },
        encoding: "utf8",
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }
  const source = readFileSync(
    path.join(compiled, "js/modules/probe/Controller.js"),
    "utf8",
  );
  assert.match(source, /export function attach/);
});

after(() => rmSync(workspace, { recursive: true, force: true }));

const html = `<!doctype html><html><body><div id="app"><terlan-probe></terlan-probe></div>
<script type="module">
import { angular } from '/runtime/angular-ts.esm.js';
import { attach } from '/compiled/js/modules/probe/Controller.js';
const events = [];
const controller = { label: 'Terlan lifecycle works' };
const configured = attach(controller, () => events.push('init'), () => events.push('destroy'));
if (configured !== controller) throw new Error('controller identity changed');
const app = angular.createModule ? angular.createModule('terlanProbeApp', []) : angular.module('terlanProbeApp', []);
app.component('terlanProbe', { template: '<p>{{$ctrl.label}}</p>', controller: function () { return configured; } });
const injector = angular.bootstrap(document.getElementById('app'), [app.name]);
window.probe = { events, destroy() {
  const scope = injector.get('$rootScope');
  if (scope.destroy) scope.destroy(); else scope.$destroy();
} };
</script></body></html>`;

for (const [name, browserType] of Object.entries({
  chromium,
  firefox,
  webkit,
})) {
  test(
    `compiled Terlan lifecycle runs through Angular in ${name}`,
    { timeout: 90000 },
    async () => {
      const browser = await browserType.launch({ headless: true });
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("http://terlan.test/**", async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname === "/")
            return route.fulfill({ contentType: "text/html", body: html });
          const root = url.pathname.startsWith("/runtime/")
            ? path.join(runtimeRoot, "dist")
            : compiled;
          const relative = decodeURIComponent(
            url.pathname.replace(/^\/(?:runtime|compiled)\//, ""),
          );
          const file = path.resolve(root, relative);
          if (!file.startsWith(`${root}${path.sep}`))
            return route.abort("blockedbyclient");
          await route.fulfill({ path: file });
        });
        await page.goto("http://terlan.test/");
        await page.waitForFunction(() => window.probe !== undefined, {
          timeout: 15000,
        });
        assert.equal(
          await page.locator("terlan-probe p").textContent(),
          "Terlan lifecycle works",
        );
        assert.deepEqual(await page.evaluate(() => window.probe.events), [
          "init",
        ]);
        await page.evaluate(() => window.probe.destroy());
        assert.deepEqual(await page.evaluate(() => window.probe.events), [
          "init",
          "destroy",
        ]);
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    },
  );
}
