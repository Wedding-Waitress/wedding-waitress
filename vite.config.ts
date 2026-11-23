import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    // Generated QA artifacts include browser profiles with OS-locked files.
    // Watching those files can crash the dev server during a browser session.
    watch: { ignored: ['**/artifacts/**'], awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } },
  },
  // Scan only the app entry; generated review HTML under work/ is not application input.
  optimizeDeps: { entries: ['index.html'] },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // Force a single React instance across all dependencies
      react: path.resolve(import.meta.dirname, "./node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "./node_modules/react-dom"),
    },
    // Prevent duplicate React copies (fixes "Cannot read properties of null (reading 'useEffect')")
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|webp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
}));
