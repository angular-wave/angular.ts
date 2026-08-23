import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const contentRoot = join("docs", "content");
const learningRoots = [
  "docs/get-started",
  "docs/guides",
  "docs/views",
  "docs/migration",
  "docs/integrations",
  "docs/reference",
  "docs/cookbook",
];
const requiredPages = [
  "docs/get-started/web-basics.md",
  "docs/get-started/first-application.md",
  "docs/get-started/how-angular-works.md",
  "docs/get-started/learning-paths.md",
  "docs/concepts/glossary.md",
  "docs/guides/troubleshooting.md",
  "docs/guides/server-first.md",
  "docs/views/choose.md",
  "docs/migration/from-angularjs.md",
  "docs/integrations/choosing.md",
  "docs/integrations/closure.md",
  "docs/integrations/clojurescript.md",
  "docs/integrations/java-j2cl.md",
  "docs/integrations/kotlin.md",
  "docs/integrations/scala.md",
  "docs/integrations/dart.md",
  "docs/integrations/gleam.md",
  "docs/integrations/wasm-assemblyscript.md",
  "docs/integrations/wasm-c.md",
  "docs/integrations/wasm-cpp.md",
  "docs/integrations/wasm-csharp.md",
  "docs/integrations/wasm-go.md",
  "docs/integrations/wasm-rust.md",
  "docs/integrations/wasm-zig.md",
  "docs/reference/using-reference.md",
  "docs/cookbook/measure-before-optimizing.md",
  "docs/cookbook/style-guide.md",
  "docs/cookbook/best-practices.md",
];
const tutorialPages = new Set([
  "docs/get-started/web-basics.md",
  "docs/get-started/first-application.md",
  "docs/get-started/how-angular-works.md",
  "docs/get-started/learning-paths.md",
]);
const failures = [];
let learningPageCount = 0;
let checkedLinkCount = 0;
const sectionNavigation = [
  ["get-started", "Get started", 10],
  ["tutorial", "Tutorial", 20],
  ["concepts", "Core concepts", 30],
  ["guides", "Task guides", 40],
  ["views", "View guides", 50],
  ["directives", "Directive guides", 60],
  ["services", "Service guides", 70],
  ["decisions", "Decision guides", 80],
  ["cookbook", "Cookbook", 90],
  ["routing", "Routing", 100],
  ["animations", "Animations", 110],
  ["reference", "Reference", 120],
  ["directive", "Directive reference", 130],
  ["service", "Service reference", 140],
  ["filter", "Filters", 150],
  ["values", "Values", 160],
  ["integrations", "Integrations", 170],
  ["migration", "Migration", 180],
  ["provider", "Legacy provider migration", 190],
];

for (const [section, expectedTitle, expectedWeight] of sectionNavigation) {
  const page = join(contentRoot, "docs", section, "_index.md");
  const text = readFileSync(page, "utf8");
  const frontMatter = text.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
  const title = frontMatterValue(frontMatter, "title");
  const weight = Number(frontMatterValue(frontMatter, "weight"));

  if (title !== expectedTitle) {
    failures.push(
      `docs/${section}/_index.md: menu title must be '${expectedTitle}'`,
    );
  }
  if (weight !== expectedWeight) {
    failures.push(
      `docs/${section}/_index.md: menu weight must be ${expectedWeight}`,
    );
  }
}

const hugoConfig = readFileSync(join("docs", "hugo.yaml"), "utf8");
if (!hugoConfig.includes("name: 'TypeScript API'")) {
  failures.push("docs/hugo.yaml: main API menu must be named 'TypeScript API'");
}

const alphabeticalMenuSections = new Set(["directive", "service", "values"]);
for (const entry of readdirSync(join(contentRoot, "docs"))) {
  const section = join(contentRoot, "docs", entry);
  if (!statSync(section).isDirectory()) continue;

  const weights = new Map();
  for (const name of readdirSync(section)) {
    const file = join(section, name);
    if (
      name === "_index.md" ||
      !name.endsWith(".md") ||
      !statSync(file).isFile()
    ) {
      continue;
    }

    const text = readFileSync(file, "utf8");
    const frontMatter = text.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
    const title = frontMatterValue(frontMatter, "title");
    const weight = frontMatterValue(frontMatter, "weight");
    const page = relative(contentRoot, file);

    if (!title) failures.push(`${page}: menu page must have a title`);
    if (!weight && !alphabeticalMenuSections.has(entry)) {
      failures.push(`${page}: ordered menu page must have a numeric weight`);
      continue;
    }
    if (!weight) continue;
    if (!/^\d+$/u.test(weight)) {
      failures.push(`${page}: menu weight must be numeric`);
      continue;
    }

    const previous = weights.get(weight);
    if (previous) {
      failures.push(
        `docs/${entry}: duplicate menu weight ${weight} in ${previous} and ${name}`,
      );
    } else {
      weights.set(weight, name);
    }
  }
}

for (const page of requiredPages) {
  if (!existsSync(join(contentRoot, page)))
    failures.push(`${page}: missing required page`);
}

for (const root of learningRoots) {
  for (const file of walkFiles(join(contentRoot, root))) {
    const text = readFileSync(file, "utf8");
    const page = relative(contentRoot, file);
    learningPageCount++;

    const frontMatter = text.match(/^---\n([\s\S]*?)\n---/u)?.[1];
    if (!frontMatter) failures.push(`${page}: missing YAML front matter`);
    if (!/^title:\s*.+$/mu.test(frontMatter ?? ""))
      failures.push(`${page}: missing title`);
    if (!/^description:\s*.+$/mu.test(frontMatter ?? ""))
      failures.push(`${page}: missing one-line description`);

    if (tutorialPages.has(page)) {
      if (!/^## (What you will learn|What you will build)$/mu.test(text)) {
        failures.push(
          `${page}: tutorial must state what the reader will learn or build`,
        );
      }
      if (!/^## Before you start$/mu.test(text))
        failures.push(`${page}: tutorial must state prerequisites`);
      if (!/^## Next step$/mu.test(text))
        failures.push(`${page}: tutorial must end with a next step`);
    }

    for (const match of text.matchAll(/\{\{< relref "([^"]+)" >\}\}/gu)) {
      checkedLinkCount++;
      const target = match[1].replace(/^\//u, "").replace(/#.*$/u, "");
      if (!pageExists(target))
        failures.push(`${page}: relref target '${match[1]}' does not exist`);
    }
  }
}

for (const file of walkFiles(contentRoot)) {
  const text = readFileSync(file, "utf8");
  let fence;

  for (const [index, line] of text.split(/\r?\n/gu).entries()) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
    if (!marker) {
      if (fence && line.trim()) fence.hasContent = true;
      continue;
    }

    if (!fence) {
      fence = { marker: marker[0], line: index + 1, hasContent: false };
    } else if (marker[0] === fence.marker) {
      if (!fence.hasContent) {
        failures.push(
          `${relative(contentRoot, file)}:${fence.line}: empty code block`,
        );
      }
      fence = undefined;
    }
  }
}

if (failures.length) {
  console.error("Beginner documentation requirements failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `${learningPageCount} learning pages and ${checkedLinkCount} internal links satisfy the beginner documentation contract.`,
);
console.log(
  `${sectionNavigation.length} documentation sections follow the canonical menu order.`,
);
console.log(
  "Sibling documentation menus use stable weights or an explicit alphabetical reference order.",
);

function frontMatterValue(frontMatter, key) {
  const value = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, "mu"))?.[1];
  return value?.trim().replace(/^(['"])(.*)\1$/u, "$2");
}

function pageExists(target) {
  const base = join(contentRoot, target);
  return existsSync(`${base}.md`) || existsSync(join(base, "_index.md"));
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((entry) => {
    const file = join(root, entry);
    return statSync(file).isDirectory()
      ? walkFiles(file)
      : file.endsWith(".md")
        ? [file]
        : [];
  });
}
