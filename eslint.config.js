import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import promisePlugin from "eslint-plugin-promise";
import tseslint from "typescript-eslint";

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
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
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
