import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      jsxRuntime: "automatic"
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt", "icons/*.png"],
      manifest: {
        name: "Our Tution",
        short_name: "OurTution",
        description: "Classroom admin dashboard and student portal",
        theme_color: "#ff7a59",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"]
      },
      runtimeCaching: [
        {
          urlPattern: /\/(api|auth|notifications|chat)\//,
          handler: "NetworkFirst",
          options: { cacheName: "api-cache", networkTimeoutSeconds: 10, expiration: { maxEntries: 120, maxAgeSeconds: 86400 } }
        },
        {
          urlPattern: /\/(musicthemes|public\/fonts|avatars)\//,
          handler: "CacheFirst",
          options: { cacheName: "asset-cache", expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 } }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "image-cache", expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 } }
        }
      ]
    })
  ],
  server: {
    port: 5173
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("node_modules/axios") || id.includes("node_modules/socket.io-client")) {
            return "vendor-network";
          }
          if (id.includes("node_modules/gsap")) {
            return "vendor-animation";
          }
          return undefined;
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  esbuild: {
    drop: ["console", "debugger"]
  }
});
