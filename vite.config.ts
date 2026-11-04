import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { effect } from "svelte-effect-runtime/compiler";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [
    ...effect(),
    sveltekit({
      adapter: adapter({ pages: "dist", assets: "dist", strict: true }),
      appDir: "app",
      router: { type: "hash" },
      compilerOptions: {
        experimental: {
          async: true,
        },
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
