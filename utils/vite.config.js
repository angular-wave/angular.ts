import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";
import { fileURLToPath } from "node:url";

const coverageEnabled = process.env.PW_COVERAGE === "1";
const port = Number(process.env.PORT || 4000);
const sourcePackageAliases = [
  {
    find: /^@angular-wave\/angular\.ts\/services\/wasm$/,
    replacement: fileURLToPath(
      new URL("../src/services/wasm/index.ts", import.meta.url),
    ),
  },
  {
    find: /^@angular-wave\/angular\.ts\/runtime\/wasm$/,
    replacement: fileURLToPath(
      new URL("../src/runtime/wasm.ts", import.meta.url),
    ),
  },
  {
    find: /^@angular-wave\/angular\.ts$/,
    replacement: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
  },
];
const wasmWorkerIsolation = {
  name: "wasm-worker-isolation",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url?.startsWith("/concepts/wasm-worker")) {
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      }

      next();
    });
  },
};
export default defineConfig({
  resolve: {
    alias: sourcePackageAliases,
  },
  plugins: [
    ...(coverageEnabled
      ? [
          istanbul({
            include: ["src/**/*.js", "src/**/*.ts"],
            exclude: ["src/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.html"],
            extension: [".js", ".ts"],
            requireEnv: false,
            checkProd: false,
          }),
        ]
      : []),
    wasmWorkerIsolation,
  ],
  server: {
    port,
    strictPort: true,
    watch: {
      ignored: [
        "**/.coverage/**",
        "**/coverage/**",
        "**/concepts/unity-fps/unity-project/Library/**",
        "**/docs/**",
        "**/integrations/**",
        "**/tools/vscode/.vscode-test/**",
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000/",
        changeOrigin: true,
      },
      "/mock": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mock/, ""),
      },
    },
  },
});
