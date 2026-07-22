import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Empty plugins array for Cloudflare Pages AST parser compatibility
  plugins: [],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "cloudflare-pages",
  },
});

