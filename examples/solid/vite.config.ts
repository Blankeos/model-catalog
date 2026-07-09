import { fileURLToPath, URL } from "node:url"
import solid from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [solid(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 7000,
  },
  resolve: {
    alias: {
      "model-catalog": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
    },
  },
})
