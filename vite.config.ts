import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://localhost:8000" },
    // The Python side, the trained model and test output never load the watcher (torch alone is
    // tens of thousands of files).
    watch: { ignored: ["**/.venv/**", "**/models/**", "**/server/**", "**/artifacts/**"] },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { "/api": "http://localhost:8000" },
  },
});
