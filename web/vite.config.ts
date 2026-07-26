import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  server: { port: 3000 },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    // Nitro is what produces the standalone Node bundle in `.output/`. We
    // only enable it during the production build because mounting Nitro
    // for `vitest` swaps the test runtime for h3 and breaks setup files.
    mode === "production"
      ? nitroV2Plugin({
          preset: "node-server",
          routeRules: {
            "/images/cards/**": {
              headers: {
                "cache-control":
                  "public, max-age=604800, stale-while-revalidate=2592000",
              },
            },
          },
        })
      : null,
    viteReact(),
  ],
}));
