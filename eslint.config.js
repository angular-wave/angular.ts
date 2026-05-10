import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

const sharedLanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  globals: {
    ...globals.browser,
    ...globals.es2021,
  },
};

const typeDeclarationNodeTypes = new Set([
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSEnumDeclaration",
]);

function unwrapTypeDeclaration(statement) {
  if (
    statement.type === "ExportNamedDeclaration" ||
    statement.type === "ExportDefaultDeclaration"
  ) {
    return statement.declaration
      ? unwrapTypeDeclaration(statement.declaration)
      : null;
  }

  return typeDeclarationNodeTypes.has(statement.type) ? statement : null;
}

const typeDeclarationPaddingRule = {
  meta: {
    type: "layout",
    fixable: "whitespace",
    schema: [],
    messages: {
      missingBlankLine: "Expected a blank line between type declarations.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function checkBody(body) {
      let previousTypeDeclaration = null;

      for (const statement of body) {
        const currentTypeDeclaration = unwrapTypeDeclaration(statement);

        if (!currentTypeDeclaration) {
          previousTypeDeclaration = null;
          continue;
        }

        if (previousTypeDeclaration) {
          const leadingComments = sourceCode.getCommentsBefore(statement);
          const anchor = leadingComments[0] ?? statement;
          const lineGap =
            anchor.loc.start.line - previousTypeDeclaration.loc.end.line;

          if (lineGap < 2) {
            context.report({
              node: statement,
              messageId: "missingBlankLine",
              fix(fixer) {
                return fixer.insertTextBeforeRange(
                  [anchor.range[0], anchor.range[0]],
                  "\n",
                );
              },
            });
          }
        }

        previousTypeDeclaration = currentTypeDeclaration;
      }
    }

    return {
      Program(node) {
        checkBody(node.body);
      },
      TSModuleBlock(node) {
        checkBody(node.body);
      },
    };
  },
};

const strictRules = {
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
    {
      ignore: [0, 1, -1, 2, -2, 3, 4, 5, 16, 10, 100, 200, 300, 400, 1000],
      ignoreArrayIndexes: true,
      enforceConst: true,
    },
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
  "max-classes-per-file": ["error", 3],
  "consistent-return": "error",
  "dot-notation": "error",
  "id-length": [
    "warn",
    {
      min: 2,
      exceptions: [
        "i",
        "j",
        "l", // loops
        "x",
        "y", // anonymous fn params
        "k",
        "v", // key-vals
        "a",
        "b", // comparators
        "_",
        "__", // ignored
      ],
    },
  ],
  "sort-imports": [
    "error",
    {
      ignoreCase: false,
      ignoreDeclarationSort: true,
      ignoreMemberSort: true,
      memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
    },
  ],
  "newline-before-return": "error",

  // ===== Security & safety =====
  "no-prototype-builtins": "error",
  "no-new-object": "error",
  "no-new-func": "error",
  "no-with": "error",
  "no-implied-eval": "error",
  "no-proto": "error",
  strict: ["error", "safe"],
  "no-octal": "error",
  "no-unneeded-ternary": "error",
};

const typeScriptStrictRules = {
  ...strictRules,
  "no-empty-function": "off",
  "no-shadow": "off",
  "no-unused-vars": "off",
  "no-useless-constructor": "off",
  "@typescript-eslint/no-empty-function": "error",
  "@typescript-eslint/no-shadow": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { args: "after-used", ignoreRestSiblings: false },
  ],
  "@typescript-eslint/no-useless-constructor": "error",
};

export default defineConfig([
  {
    files: ["./src/**/*.{ts,mts,cts,tsx}"],
    languageOptions: {
      ...sharedLanguageOptions,
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      local: {
        rules: {
          "type-declaration-padding": typeDeclarationPaddingRule,
        },
      },
    },
    rules: {
      ...typeScriptStrictRules,
      "local/type-declaration-padding": "error",
    },
    ignores: ["**/*.{js,mjs,cjs}"],
  },
  {
    files: ["./src/**/*.spec.ts", "./src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-useless-constructor": "off",
      eqeqeq: "off",
      "max-classes-per-file": "off",
      "id-length": "off",
      "no-console": "off",
      "no-eval": "off",
      "no-implicit-globals": "off",
      "no-invalid-this": "off",
      "no-magic-numbers": "off",
      "no-self-compare": "off",
      "object-shorthand": "off",
      "prefer-const": "off",
      "prefer-destructuring": "off",
    },
  },
  eslintPluginPrettierRecommended,
]);
