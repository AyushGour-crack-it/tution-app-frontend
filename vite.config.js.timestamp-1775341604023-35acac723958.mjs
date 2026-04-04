// vite.config.js
import { defineConfig } from "file:///C:/Users/ayush%20gour/OneDrive/Desktop/codex%20in%20vs/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ayush%20gour/OneDrive/Desktop/codex%20in%20vs/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/ayush%20gour/OneDrive/Desktop/codex%20in%20vs/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      jsxRuntime: "automatic"
    }),
    VitePWA({
      registerType: "prompt",
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
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        // Don't cache the custom service worker
        globIgnores: ["sw.js"],
        runtimeCaching: [
          {
            urlPattern: /\/(api|auth|notifications|chat)\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 120, maxAgeSeconds: 86400 }
            }
          },
          {
            urlPattern: /\/(musicthemes|public\/fonts|avatars)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "asset-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      },
      // Disable auto service worker generation since we have custom one
      disable: false,
      selfDestroying: false
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
          return void 0;
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
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxheXVzaCBnb3VyXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcY29kZXggaW4gdnNcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGF5dXNoIGdvdXJcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxjb2RleCBpbiB2c1xcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYXl1c2glMjBnb3VyL09uZURyaXZlL0Rlc2t0b3AvY29kZXglMjBpbiUyMHZzL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCh7XG4gICAgICBmYXN0UmVmcmVzaDogdHJ1ZSxcbiAgICAgIGpzeFJ1bnRpbWU6IFwiYXV0b21hdGljXCJcbiAgICB9KSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJwcm9tcHRcIixcbiAgICAgIGluY2x1ZGVBc3NldHM6IFtcImZhdmljb24uc3ZnXCIsIFwicm9ib3RzLnR4dFwiLCBcImljb25zLyoucG5nXCJdLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogXCJPdXIgVHV0aW9uXCIsXG4gICAgICAgIHNob3J0X25hbWU6IFwiT3VyVHV0aW9uXCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkNsYXNzcm9vbSBhZG1pbiBkYXNoYm9hcmQgYW5kIHN0dWRlbnQgcG9ydGFsXCIsXG4gICAgICAgIHRoZW1lX2NvbG9yOiBcIiNmZjdhNTlcIixcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogXCIjZmZmZmZmXCIsXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxuICAgICAgICBvcmllbnRhdGlvbjogXCJwb3J0cmFpdFwiLFxuICAgICAgICBzY29wZTogXCIvXCIsXG4gICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6IFwiaWNvbnMvcHdhLTE5Mi5wbmdcIiwgc2l6ZXM6IFwiMTkyeDE5MlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiIH0sXG4gICAgICAgICAgeyBzcmM6IFwiaWNvbnMvcHdhLTUxMi5wbmdcIiwgc2l6ZXM6IFwiNTEyeDUxMlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiIH0sXG4gICAgICAgICAgeyBzcmM6IFwiaWNvbnMvcHdhLTUxMi1tYXNrYWJsZS5wbmdcIiwgc2l6ZXM6IFwiNTEyeDUxMlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiLCBwdXJwb3NlOiBcIm1hc2thYmxlXCIgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLHBuZyxzdmcsd29mZjJ9XCJdLFxuICAgICAgICAvLyBEb24ndCBjYWNoZSB0aGUgY3VzdG9tIHNlcnZpY2Ugd29ya2VyXG4gICAgICAgIGdsb2JJZ25vcmVzOiBbXCJzdy5qc1wiXSxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvKGFwaXxhdXRofG5vdGlmaWNhdGlvbnN8Y2hhdClcXC8vLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJOZXR3b3JrRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImFwaS1jYWNoZVwiLFxuICAgICAgICAgICAgICBuZXR3b3JrVGltZW91dFNlY29uZHM6IDEwLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEyMCwgbWF4QWdlU2Vjb25kczogODY0MDAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLyhtdXNpY3RoZW1lc3xwdWJsaWNcXC9mb250c3xhdmF0YXJzKVxcLy8sXG4gICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImFzc2V0LWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAwLCBtYXhBZ2VTZWNvbmRzOiAzMCAqIDI0ICogNjAgKiA2MCB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKD86cG5nfGpwZ3xqcGVnfHN2Z3x3ZWJwKSQvLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJTdGFsZVdoaWxlUmV2YWxpZGF0ZVwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiaW1hZ2UtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAyMDAsIG1heEFnZVNlY29uZHM6IDMwICogMjQgKiA2MCAqIDYwIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICAvLyBEaXNhYmxlIGF1dG8gc2VydmljZSB3b3JrZXIgZ2VuZXJhdGlvbiBzaW5jZSB3ZSBoYXZlIGN1c3RvbSBvbmVcbiAgICAgIGRpc2FibGU6IGZhbHNlLFxuICAgICAgc2VsZkRlc3Ryb3lpbmc6IGZhbHNlXG4gICAgfSlcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3M1xuICB9LFxuICBidWlsZDoge1xuICAgIHRhcmdldDogXCJlczIwMjBcIixcbiAgICBtaW5pZnk6IFwiZXNidWlsZFwiLFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvcmVhY3RcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvcmVhY3QtZG9tXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0LXJvdXRlci1kb21cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1yZWFjdFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvZmlyZWJhc2VcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1maXJlYmFzZVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvYXhpb3NcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudFwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW5ldHdvcmtcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2dzYXBcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1hbmltYXRpb25cIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlXG4gICAgICB9XG4gICAgfSxcbiAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgIHRyYW5zZm9ybU1peGVkRXNNb2R1bGVzOiB0cnVlXG4gICAgfVxuICB9LFxuICBlc2J1aWxkOiB7XG4gICAgZHJvcDogW1wiY29uc29sZVwiLCBcImRlYnVnZ2VyXCJdXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpWCxTQUFTLG9CQUFvQjtBQUM5WSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxNQUNKLGFBQWE7QUFBQSxNQUNiLFlBQVk7QUFBQSxJQUNkLENBQUM7QUFBQSxJQUNELFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLGNBQWMsYUFBYTtBQUFBLE1BQzFELFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxVQUNMLEVBQUUsS0FBSyxxQkFBcUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQ2hFLEVBQUUsS0FBSyxxQkFBcUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQ2hFLEVBQUUsS0FBSyw4QkFBOEIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLFdBQVc7QUFBQSxRQUNoRztBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQyxrQ0FBa0M7QUFBQTtBQUFBLFFBRWpELGFBQWEsQ0FBQyxPQUFPO0FBQUEsUUFDckIsZ0JBQWdCO0FBQUEsVUFDZDtBQUFBLFlBQ0UsWUFBWTtBQUFBLFlBQ1osU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ1AsV0FBVztBQUFBLGNBQ1gsdUJBQXVCO0FBQUEsY0FDdkIsWUFBWSxFQUFFLFlBQVksS0FBSyxlQUFlLE1BQU07QUFBQSxZQUN0RDtBQUFBLFVBQ0Y7QUFBQSxVQUNBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZLEVBQUUsWUFBWSxLQUFLLGVBQWUsS0FBSyxLQUFLLEtBQUssR0FBRztBQUFBLFlBQ2xFO0FBQUEsVUFDRjtBQUFBLFVBQ0E7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVksRUFBRSxZQUFZLEtBQUssZUFBZSxLQUFLLEtBQUssS0FBSyxHQUFHO0FBQUEsWUFDbEU7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQTtBQUFBLE1BRUEsU0FBUztBQUFBLE1BQ1QsZ0JBQWdCO0FBQUEsSUFDbEIsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUyxvQkFBb0IsS0FBSyxHQUFHLFNBQVMsd0JBQXdCLEtBQUssR0FBRyxTQUFTLCtCQUErQixHQUFHO0FBQzlILG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLHVCQUF1QixHQUFHO0FBQ3hDLG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLG9CQUFvQixLQUFLLEdBQUcsU0FBUywrQkFBK0IsR0FBRztBQUNyRixtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxtQkFBbUIsR0FBRztBQUNwQyxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLE1BQ2pCO0FBQUEsSUFDRjtBQUFBLElBQ0EsaUJBQWlCO0FBQUEsTUFDZix5QkFBeUI7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU0sQ0FBQyxXQUFXLFVBQVU7QUFBQSxFQUM5QjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
