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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxheXVzaCBnb3VyXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcY29kZXggaW4gdnNcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGF5dXNoIGdvdXJcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxjb2RleCBpbiB2c1xcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYXl1c2glMjBnb3VyL09uZURyaXZlL0Rlc2t0b3AvY29kZXglMjBpbiUyMHZzL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCh7XG4gICAgICBmYXN0UmVmcmVzaDogdHJ1ZSxcbiAgICAgIGpzeFJ1bnRpbWU6IFwiYXV0b21hdGljXCJcbiAgICB9KSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXCJmYXZpY29uLnN2Z1wiLCBcInJvYm90cy50eHRcIiwgXCJpY29ucy8qLnBuZ1wiXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6IFwiT3VyIFR1dGlvblwiLFxuICAgICAgICBzaG9ydF9uYW1lOiBcIk91clR1dGlvblwiLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJDbGFzc3Jvb20gYWRtaW4gZGFzaGJvYXJkIGFuZCBzdHVkZW50IHBvcnRhbFwiLFxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjZmY3YTU5XCIsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiI2ZmZmZmZlwiLFxuICAgICAgICBkaXNwbGF5OiBcInN0YW5kYWxvbmVcIixcbiAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXRcIixcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxuICAgICAgICBzdGFydF91cmw6IFwiL1wiLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHsgc3JjOiBcImljb25zL3B3YS0xOTIucG5nXCIsIHNpemVzOiBcIjE5MngxOTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9LFxuICAgICAgICAgIHsgc3JjOiBcImljb25zL3B3YS01MTIucG5nXCIsIHNpemVzOiBcIjUxMng1MTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9LFxuICAgICAgICAgIHsgc3JjOiBcImljb25zL3B3YS01MTItbWFza2FibGUucG5nXCIsIHNpemVzOiBcIjUxMng1MTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiwgcHVycG9zZTogXCJtYXNrYWJsZVwiIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxwbmcsc3ZnLHdvZmYyfVwiXVxuICAgICAgfSxcbiAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvKGFwaXxhdXRofG5vdGlmaWNhdGlvbnN8Y2hhdClcXC8vLFxuICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6IFwiYXBpLWNhY2hlXCIsIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMTAsIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTIwLCBtYXhBZ2VTZWNvbmRzOiA4NjQwMCB9IH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHVybFBhdHRlcm46IC9cXC8obXVzaWN0aGVtZXN8cHVibGljXFwvZm9udHN8YXZhdGFycylcXC8vLFxuICAgICAgICAgIGhhbmRsZXI6IFwiQ2FjaGVGaXJzdFwiLFxuICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiBcImFzc2V0LWNhY2hlXCIsIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAwLCBtYXhBZ2VTZWNvbmRzOiAzMCAqIDI0ICogNjAgKiA2MCB9IH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpwbmd8anBnfGpwZWd8c3ZnfHdlYnApJC8sXG4gICAgICAgICAgaGFuZGxlcjogXCJTdGFsZVdoaWxlUmV2YWxpZGF0ZVwiLFxuICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiBcImltYWdlLWNhY2hlXCIsIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMjAwLCBtYXhBZ2VTZWNvbmRzOiAzMCAqIDI0ICogNjAgKiA2MCB9IH1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzNcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6IFwiZXMyMDIwXCIsXG4gICAgbWluaWZ5OiBcImVzYnVpbGRcIixcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0XCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0LWRvbVwiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXItZG9tXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItcmVhY3RcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2ZpcmViYXNlXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItZmlyZWJhc2VcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2F4aW9zXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnRcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1uZXR3b3JrXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9nc2FwXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItYW5pbWF0aW9uXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZVxuICAgICAgfVxuICAgIH0sXG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICB0cmFuc2Zvcm1NaXhlZEVzTW9kdWxlczogdHJ1ZVxuICAgIH1cbiAgfSxcbiAgZXNidWlsZDoge1xuICAgIGRyb3A6IFtcImNvbnNvbGVcIiwgXCJkZWJ1Z2dlclwiXVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVgsU0FBUyxvQkFBb0I7QUFDOVksT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFB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
