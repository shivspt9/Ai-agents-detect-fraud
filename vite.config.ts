import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Radix and the React runtime change far less often than app code, so
        // splitting them keeps rebuilds cheap to cache. Recharts is not listed
        // here on purpose: it is lazy-loaded with the Analytics tab, and naming
        // it as a manual chunk would pull it back into the initial graph.
        manualChunks: {
          radix: ["@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-tabs", "@radix-ui/react-dialog"],
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
        },
      },
    },
  },
});
