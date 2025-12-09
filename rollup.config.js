import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import versionInjector from "rollup-plugin-version-injector";
import cssnano from "cssnano";
import postcss from "postcss";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

const baseInput = "src/index.js";

function cssMinifyPlugin() {
  return {
    name: "css-minify",
    async writeBundle() {
      const srcPath = path.resolve(__dirname, "css/angular.css");
      const destDir = path.resolve(__dirname, "dist");
      const css = readFileSync(srcPath, "utf-8");

      const result = await postcss([cssnano()]).process(css, {
        from: srcPath,
        to: path.join(destDir, "angular.css"),
      });

      writeFileSync(path.join(destDir, "angular.css"), result.css);
    },
  };
}

const basePlugins = [resolve(), commonjs(), versionInjector()];

export default [
  // ---- Minified UMD ----
  {
    input: baseInput,
    output: [
      {
        name: "angular",
        file: pkg.browser.replace(/\.js$/, ".min.js"),
        format: "umd",
        sourcemap: true,
        plugins: [
          terser({
            compress: {
              passes: 3,
              keep_fnames: false,
            },
            mangle: {
              toplevel: true,
              properties: {
                regex: /^_/,
                keep_quoted: false,
              },
            },
          }),
        ],
      },
      {
        name: "angular",
        file: pkg.browser,
        format: "umd",
      },
    ],
    plugins: [...basePlugins],
  },

  // ---- ES Module ----
  {
    input: baseInput,
    external: ["ms"],
    output: [{ file: pkg.module, format: "es" }],
    plugins: [...basePlugins, cssMinifyPlugin()],
  },
];
