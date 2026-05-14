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

const angularTsRuntimeCompatibilityRules = {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unnecessary-condition": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/prefer-nullish-coalescing": "off",
  "@typescript-eslint/restrict-plus-operands": "off",
  "@typescript-eslint/restrict-template-expressions": "off",
  "@typescript-eslint/unbound-method": "off",
  "@typescript-eslint/no-floating-promises": [
    "error",
    { ignoreIIFE: true, ignoreVoid: true },
  ],
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/no-non-null-assertion": "error",

  // TypeScript-aware replacements for core rules covered by the presets.
  "no-empty-function": "off",
  "no-shadow": "off",
  "no-unused-vars": "off",
  "no-useless-constructor": "off",

  // The source uses TypeScript files with runtime ESM .js specifiers.
  "import/no-unresolved": "off",
  "import/no-duplicates": "error",
  "import/no-named-as-default": "error",
  "import/no-named-as-default-member": "error",

  "promise/always-return": ["error", { ignoreLastCallback: true }],
  "promise/catch-or-return": ["error", { allowThen: true }],
  "promise/no-callback-in-promise": "error",
  "promise/no-nesting": "error",
  "promise/valid-params": "error",
};

export default defineConfig([
  {
    ignores: ["**/*.{js,mjs,cjs}", "**/*.spec.ts", "**/*.test.ts"],
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
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      local: {
        rules: {
          "type-declaration-padding": typeDeclarationPaddingRule,
        },
      },
    },
    rules: {
      ...angularTsRuntimeCompatibilityRules,
      "local/type-declaration-padding": "error",
    },
  },
  {
    files: ["./src/namespace.ts"],
    rules: {
      // Public declaration entrypoint emitted to @types/namespace.d.ts for JSDoc and global ng users.
      "@typescript-eslint/no-namespace": "off",
    },
  },
  eslintPluginPrettierRecommended,
]);
