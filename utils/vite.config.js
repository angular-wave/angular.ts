import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";
const coverageEnabled = process.env.PW_COVERAGE === "1";
const port = Number(process.env.PORT || 4000);
export default defineConfig({
  plugins: coverageEnabled
    ? [
        istanbul({
          include: ["src/**/*.js", "src/**/*.ts"],
          exclude: ["src/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.html"],
          extension: [".js", ".ts"],
          requireEnv: false,
          checkProd: false,
        }),
      ]
    : [],
  server: {
    port,
    strictPort: true,
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
