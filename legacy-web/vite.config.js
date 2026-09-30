import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "PixelPatch",
        short_name: "PixelPatch",
        start_url: "/",
        display: "standalone",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        description: "Repair service platform for electronic devices. Find trusted technicians near you. Have trouble with your gadgets? PixelPatch connects you with skilled professionals and helps you troubleshoot with our state of the art chatbot for quick and reliable repairs.",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
})
