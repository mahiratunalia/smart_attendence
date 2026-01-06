import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: "public",
  assetsInclude: ["**/*.ico", "**/*.png", "**/*.svg"],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
  },
  plugins: [react(), componentTagger()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
