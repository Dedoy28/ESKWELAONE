import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // This rule is for your API (HTTP) requests
      '/api': {
        target: 'http://127.0.0.1:8000', 
        changeOrigin: true,
        secure: false,
      },
      
      // ⭐️ --- ADD THIS RULE FOR WEBSOCKETS --- ⭐️
      // This says "any request that starts with /ws"...
      '/ws': {
        // ...should be proxied to your ASGI server (ws://)
        target: 'ws://127.0.0.1:8000', 
        ws: true, // This is the most important part!
      },
      // ⭐️ --- END OF NEW RULE --- ⭐️
    },
  },
  plugins: [
    react(), 
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), 
    },
  },
});