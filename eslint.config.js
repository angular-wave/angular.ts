import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  {
    files: ["./src/**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      // ===== Code style =====
      indent: ["error", 2],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "comma-dangle": ["error", "never"],
      "comma-spacing": ["error", { before: false, after: true }],
      "space-before-function-paren": ["error", "always"],
      "space-in-parens": ["error", "never"],
      "space-infix-ops": "error",
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "arrow-spacing": ["error", { before: true, after: true }],
      "block-spacing": "error",
      "brace-style": ["error", "1tbs", { allowSingleLine: false }],
      "max-len": [
        "error",
        { code: 100, ignoreComments: false, ignoreStrings: false },
      ],

      // ===== Best practices =====
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-console": ["error"],
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-duplicate-imports": "error",
      "no-unused-vars": [
        "error",
        { args: "after-used", ignoreRestSiblings: false },
      ],
      "no-implicit-globals": "error",
      "no-magic-numbers": [
        "warn",
        { ignore: [0, 1, -1], ignoreArrayIndexes: true, enforceConst: true },
      ],
      "no-empty-function": "error",
      "no-fallthrough": "error",
      "no-invalid-this": "error",
      "no-return-assign": "error",
      "no-self-assign": "error",
      "no-self-compare": "error",
      "no-shadow": "error",
      "no-useless-catch": "error",
      "no-useless-return": "error",

      // ===== Modern JS =====
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "prefer-exponentiation-operator": "error",
      "prefer-destructuring": ["error", { object: true, array: false }],
      "object-shorthand": ["error", "always"],
      "arrow-body-style": ["error", "as-needed"],
      "no-useless-constructor": "error",

      // ===== Readability & organization =====
      "newline-per-chained-call": ["error", { ignoreChainWithDepth: 1 }],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        { blankLine: "always", prev: "*", next: "if" },
        { blankLine: "always", prev: "*", next: "for" },
        { blankLine: "always", prev: "*", next: "while" },
        { blankLine: "always", prev: "*", next: "try" },
      ],
      "lines-between-class-members": [
        "error",
        "always",
        { exceptAfterSingleLine: true },
      ],
      "max-classes-per-file": ["error", 1],
      "consistent-return": "error",
      "dot-notation": "error",
      "id-length": ["warn", { min: 2, exceptions: ["i", "j"] }],
      "sort-imports": [
        "error",
        {
          ignoreCase: false,
          ignoreDeclarationSort: false,
          memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
        },
      ],
      "newline-before-return": "error",

      // ===== Security & safety =====
      "no-prototype-builtins": "error",
      "no-new-object": "error",
      "no-new-func": "error",
      "no-with": "error",
    },
    ignores: ["**/*.spec.js", "**/*.test.js"],
  },
  eslintPluginPrettierRecommended,
]);
