import { defineConfig } from "vite";

// GitHub Pages 项目站部署在 https://<user>.github.io/fiti/
// 本地 dev 与 build --base=./ 由 BASE 环境变量覆盖
export default defineConfig(() => ({
  // 相对路径，适配任意部署位置（Pages 子路径 / 自有服务器 / 本地 preview 均可）
  base: process.env.BASE ?? "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    target: "es2019",
  },
  server: {
    host: true,
    port: 5173,
  },
}));
