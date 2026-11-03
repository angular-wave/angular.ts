import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importRecommended from "eslint-plugin-import-x/config/flat/recommended";
import importTypeScript from "eslint-plugin-import-x/config/flat/typescript";
import { meta as importMeta } from "eslint-plugin-import-x/meta";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import promisePlugin from "eslint-plugin-promise";
import tseslint from "typescript-eslint";

// Use public rule subpaths so unused rules cannot load removed Minimatch APIs.
const importRules = Object.fromEntries(
  await Promise.all(
    Object.keys(importRecommended.rules).map(async (name) => {
      const ruleName = name.slice("import-x/".length);
      const { default: rule } = await import(
        `eslint-plugin-import-x/rules/${ruleName}`
      );
      return [ruleName, rule];
    }),
  ),
);

const sharedLanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  globals: {
    ...globals.browser,
    ...globals.es2021,
  },
};

export default defineConfig([
  {
    ignores: [
      "integrations/**",
      "**/*.{js,mjs,cjs}",
      "**/*.d.ts",
      "**/*.spec.ts",
      "**/*.test.ts",
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
  },
  js.configs.recommended,
  {
    ...importRecommended,
    plugins: { "import-x": { meta: importMeta, rules: importRules } },
  },
  {
    ...importTypeScript,
    settings: {
      ...importTypeScript.settings,
      "import-x/resolver": { node: { extensions: [".js", ".ts", ".d.ts"] } },
    },
  },
  promisePlugin.configs["flat/recommended"],
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeCheckedOnly,
  {
    files: ["./src/**/*.{ts,mts,cts,tsx}"],
    languageOptions: {
      ...sharedLanguageOptions,
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslintPluginPrettierRecommended,
]);
