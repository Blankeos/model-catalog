import { fileURLToPath, URL } from "node:url"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 7000,
  },
  resolve: {
    alias: {
      "model-catalog": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
    },
  },
})
