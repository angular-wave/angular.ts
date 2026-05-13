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
  "@typescript-eslint/no-base-to-string": "off",
  "@typescript-eslint/no-dynamic-delete": "off",
  "no-empty-function": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-invalid-void-type": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/no-namespace": "off",
  "@typescript-eslint/no-non-null-assertion": "off",
  "no-shadow": "off",
  "@typescript-eslint/no-unnecessary-condition": "off",
  "no-unused-vars": "off",
  "no-useless-constructor": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-declaration-merging": "off",
  "@typescript-eslint/no-unsafe-function-type": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-return": "off",
  "@typescript-eslint/prefer-nullish-coalescing": "off",
  "@typescript-eslint/prefer-promise-reject-errors": "off",
  "@typescript-eslint/restrict-plus-operands": "off",
  "@typescript-eslint/restrict-template-expressions": "off",
  "@typescript-eslint/unbound-method": "off",
  "@typescript-eslint/no-empty-function": "error",
  "@typescript-eslint/no-shadow": "error",
  "@typescript-eslint/no-this-alias": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { args: "after-used", ignoreRestSiblings: false },
  ],
  "@typescript-eslint/no-useless-constructor": "error",
  "@typescript-eslint/no-floating-promises": [
    "error",
    { ignoreIIFE: true, ignoreVoid: true },
  ],
  "@typescript-eslint/no-redundant-type-constituents": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
  "@typescript-eslint/no-unnecessary-type-parameters": "error",
  "@typescript-eslint/no-unnecessary-type-conversion": "error",
  "@typescript-eslint/prefer-optional-chain": "error",
  "@typescript-eslint/require-await": "error",
  "@typescript-eslint/unified-signatures": "error",
  "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
};

export default defineConfig([
  {
    ignores: ["**/*.{js,mjs,cjs}", "**/*.spec.ts", "**/*.test.ts"],
  },
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
  },
  eslintPluginPrettierRecommended,
]);
