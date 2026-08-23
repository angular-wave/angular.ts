import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const cookbook = join(root, "docs", "content", "docs", "cookbook");
const pages = [
  "inspect-running-application.md",
  "select-elements.md",
  "server-data.md",
  "update-dom.md",
  "replace-dom.md",
  "swap-server-html.md",
  "effects.md",
  "event-handling.md",
  "forms.md",
  "rest.md",
  "authentication.md",
  "caching.md",
  "routing.md",
  "advanced-viewport.md",
  "advanced-sse.md",
  "advanced-websocket.md",
  "optimized-runtime-build.md",
  "advanced-worker.md",
  "advanced-wasm.md",
  "inline-edit.md",
  "delete-row.md",
  "active-search.md",
  "dependent-selects.md",
  "infinite-scroll.md",
  "optimistic-update.md",
  "session-expiration.md",
  "cached-reference-data.md",
  "upload-cancel.md",
  "server-dialog.md",
  "htmx-patterns.md",
  "http-response-contracts.md",
  "accessible-requests.md",
  "secure-request.md",
  "progressive-enhancement.md",
  "debug-http-interaction.md",
  "control-repeat-requests.md",
  "server-validation.md",
  "csrf-protected-form.md",
  "confirm-delete.md",
  "edit-conflict.md",
  "retry-failed-read.md",
  "server-pagination.md",
  "download-file.md",
  "safe-html-fragment.md",
  "request-id.md",
  "ship-interaction.md",
  "rate-limit.md",
  "background-job.md",
  "idempotent-write.md",
  "multi-step-form.md",
  "bulk-action.md",
  "archive-restore.md",
  "permission-denied.md",
  "url-filter.md",
  "logout.md",
  "cross-origin-request.md",
  "unique-race.md",
  "money-values.md",
  "dates-time-zones.md",
  "opaque-identifiers.md",
  "conditional-cache.md",
  "maintenance-mode.md",
  "safe-redirect.md",
  "error-envelope.md",
  "content-negotiation.md",
  "rich-text.md",
  "content-security-policy.md",
  "session-cookie.md",
  "password-form.md",
  "secret-redaction.md",
  "focus-first-error.md",
  "empty-state.md",
  "focus-after-swap.md",
  "feature-flag.md",
  "audit-trail.md",
  "compatible-rollout.md",
  "framework-integration.md",
  "framework-event-bus.md",
  "framework-observe.md",
  "framework-model.md",
];
const finderPages = [
  "find-beginner-recipes.md",
  "find-form-recipes.md",
  "find-http-recipes.md",
  "find-dom-recipes.md",
  "find-security-recipes.md",
  "find-performance-recipes.md",
  "find-data-recipes.md",
  "find-navigation-recipes.md",
  "find-operations-recipes.md",
  "find-advanced-recipes.md",
];
const failures = [];
let snippetCount = 0;
const testFiles = new Set();
const index = readFileSync(join(cookbook, "_index.md"), "utf8");
const finderSources = new Map(
  finderPages.map((page) => [page, readFileSync(join(cookbook, page), "utf8")]),
);
const recipeMetadata = [];

for (const [finder, source] of finderSources) {
  const finderSlug = finder.replace(/\.md$/u, "");
  if (!index.includes(`(${finderSlug}/)`)) {
    failures.push(
      `docs/content/docs/cookbook/${finder}: finder is not linked from _index.md`,
    );
  }
  for (const match of source.matchAll(/\/docs\/cookbook\/([a-z0-9-]+)/gu)) {
    const target = `${match[1]}.md`;
    if (!pages.includes(target)) {
      failures.push(
        `docs/content/docs/cookbook/${finder}: unknown recipe '${target}'`,
      );
    }
  }
}

for (const page of pages) {
  const file = join(cookbook, page);
  const lines = readFileSync(file, "utf8").split(/\r?\n/gu);
  const source = lines.join("\n");
  const title = source.match(/^title:\s*(.+)$/mu)?.[1].trim();
  const description = source.match(/^description:\s*(.+)$/mu)?.[1].trim();
  const weight = source.match(/^weight:\s*(\d+)$/mu)?.[1];
  if (!title) failures.push(`${relative(root, file)}: recipe has no title`);
  if (!description)
    failures.push(`${relative(root, file)}: recipe has no description`);
  if (!weight)
    failures.push(`${relative(root, file)}: recipe has no numeric weight`);
  recipeMetadata.push({ page, title, description });
  const slug = page.replace(/\.md$/u, "");
  if (
    ![...finderSources.values()].some((finder) =>
      finder.includes(`/docs/cookbook/${slug}`),
    )
  ) {
    failures.push(
      `${relative(root, file)}: recipe is not included in a finder`,
    );
  }
  if (!lines.includes("## Problem")) {
    failures.push(`${relative(root, file)}: recipe has no Problem section`);
  }
  if (
    !index.includes(`/docs/cookbook/${slug}`) &&
    !index.includes(`(${slug}/)`)
  ) {
    failures.push(
      `${relative(root, file)}: recipe is not linked from _index.md`,
    );
  }
  if (!lines.includes("## Apply it now")) {
    failures.push(
      `${relative(root, file)}: progressive recipe has no Apply it now section`,
    );
  }
  if (!lines.includes("## Verify")) {
    failures.push(
      `${relative(root, file)}: progressive recipe has no Verify section`,
    );
  }
  for (const section of ["## Before you start", "## Failure path"]) {
    if (!lines.includes(section)) {
      failures.push(
        `${relative(root, file)}: progressive recipe has no ${section.slice(3)} section`,
      );
    }
  }
  let open = false;

  for (const [index, line] of lines.entries()) {
    if (!/^\s*```/u.test(line)) continue;
    if (open) {
      open = false;
      continue;
    }

    open = true;
    snippetCount++;
    let markerIndex = index - 1;
    while (markerIndex >= 0 && !lines[markerIndex].trim()) markerIndex--;
    const marker = lines[markerIndex]?.match(/^<!-- tested-by: (.+) -->$/u);
    if (!marker) {
      failures.push(
        `${relative(root, file)}:${index + 1}: snippet has no tested-by reference`,
      );
      continue;
    }

    for (const referenced of marker[1].split(",").map((item) => item.trim())) {
      const testFile = join(root, referenced);
      if (!/\.(?:spec|test)\.[cm]?[jt]s$/u.test(referenced)) {
        failures.push(
          `${relative(root, file)}:${markerIndex + 1}: '${referenced}' is not a test file`,
        );
        continue;
      }
      if (!existsSync(testFile)) {
        failures.push(
          `${relative(root, file)}:${markerIndex + 1}: test file '${referenced}' does not exist`,
        );
        continue;
      }
      const testSource = readFileSync(testFile, "utf8");
      if (!/\b(?:it|test)\s*\(/u.test(testSource)) {
        failures.push(
          `${relative(root, file)}:${markerIndex + 1}: '${referenced}' contains no test cases`,
        );
        continue;
      }
      if (
        referenced === "src/docs-examples/cookbook-patterns.test.ts" &&
        !testSource.includes(`"${page}"`)
      ) {
        failures.push(
          `${relative(root, file)}:${markerIndex + 1}: exact-source test does not include '${page}'`,
        );
        continue;
      }
      testFiles.add(referenced);
    }
  }
}

for (const field of ["title", "description"]) {
  const seen = new Map();
  for (const metadata of recipeMetadata) {
    const value = metadata[field];
    if (!value) continue;
    const previous = seen.get(value);
    if (previous) {
      failures.push(
        `duplicate recipe ${field} '${value}' in ${previous} and ${metadata.page}`,
      );
    } else {
      seen.set(value, metadata.page);
    }
  }
}

if (failures.length > 0) {
  console.error("Cookbook snippets must be backed by executable tests.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `${snippetCount} progressive cookbook snippets are backed by ${testFiles.size} executable test suites.`,
);
console.log(
  `${pages.length} recipes are categorized across ${finderPages.length} task-area finders.`,
);
