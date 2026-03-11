import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";
const coverageEnabled = process.env.PW_COVERAGE === "1";
export default defineConfig({
  plugins: coverageEnabled
    ? [
        istanbul({
          include: ["src/**/*.js", "src/**/*.ts"],
          exclude: ["src/**/*.spec.js", "src/**/*.test.js", "src/**/*.html"],
          extension: [".js", ".ts"],
          requireEnv: false,
          checkProd: false,
        }),
      ]
    : [],
  server: {
    port: 4000,
    strictPort: true,
    proxy: {
      "/mock": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mock/, ""),
      },
    },
  },
});
