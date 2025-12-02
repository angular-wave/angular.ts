import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 4000,
    proxy: {
      "/mock": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mock/, ""),
      },
    },
  },
});
