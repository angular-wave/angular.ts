import * as path from "node:path";
import { camelToKebab, kebabToCamel } from "../catalog/names";

export interface ComponentGeneratorOptions {
  componentName: string;
  moduleName: string;
  directory: string;
  language: "ts" | "js";
  template: "external" | "inline";
  includeCss: boolean;
  includeTest: boolean;
}

export interface GeneratedComponentFile {
  path: string;
  content: string;
}

export function generateComponentFiles(
  options: ComponentGeneratorOptions,
): GeneratedComponentFile[] {
  const names = componentNames(options.componentName);
  const files: GeneratedComponentFile[] = [];
  const sourceExtension = options.language === "ts" ? "ts" : "js";
  const componentPath = path.join(
    options.directory,
    `${names.kebab}.component.${sourceExtension}`,
  );

  files.push({
    path: componentPath,
    content: componentSource(options, names),
  });

  if (options.template === "external") {
    files.push({
      path: path.join(options.directory, `${names.kebab}.html`),
      content: `<section class="${names.kebab}">\n</section>\n`,
    });
  }

  if (options.includeCss) {
    files.push({
      path: path.join(options.directory, `${names.kebab}.css`),
      content: `.${names.kebab} {\n  display: block;\n}\n`,
    });
  }

  if (options.includeTest) {
    files.push({
      path: path.join(
        options.directory,
        `${names.kebab}.component.spec.${sourceExtension}`,
      ),
      content: componentTestSource(options, names),
    });
  }

  return files;
}

export function componentNames(input: string): {
  camel: string;
  kebab: string;
  pascal: string;
} {
  const trimmed = input.trim();
  const camel = /^[a-z][A-Za-z0-9]*$/.test(trimmed)
    ? trimmed
    : kebabToCamel(camelToKebab(trimmed).replace(/[^a-zA-Z0-9-]/g, "-"));
  const kebab = camelToKebab(camel);
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);

  return { camel, kebab, pascal };
}

export function inferModuleName(sourceText: string): string | undefined {
  const match = /\bangular\.module\(\s*(['"`])([^'"`]+)\1/.exec(sourceText);
  return match?.[2];
}

function componentSource(
  options: ComponentGeneratorOptions,
  names: ReturnType<typeof componentNames>,
): string {
  const controllerName = `${names.pascal}Controller`;
  const templateLine =
    options.template === "external"
      ? `  templateUrl: "./${names.kebab}.html",`
      : "  template: `<section></section>`,";

  if (options.language === "ts") {
    return `class ${controllerName} {\n}\n\nangular.module("${options.moduleName}").component("${names.camel}", {\n${templateLine}\n  bindings: {},\n  controller: ${controllerName},\n});\n`;
  }

  return `function ${controllerName}() {\n}\n\nangular.module("${options.moduleName}").component("${names.camel}", {\n${templateLine}\n  bindings: {},\n  controller: ${controllerName},\n});\n`;
}

function componentTestSource(
  options: ComponentGeneratorOptions,
  names: ReturnType<typeof componentNames>,
): string {
  const importPath = `./${names.kebab}.component`;
  if (options.language === "ts") {
    return `import "${importPath}";\n\ndescribe("${names.camel}", () => {\n  it("registers the component", () => {\n    expect(true).toBe(true);\n  });\n});\n`;
  }

  return `import "${importPath}";\n\ndescribe("${names.camel}", function() {\n  it("registers the component", function() {\n    expect(true).toBe(true);\n  });\n});\n`;
}
