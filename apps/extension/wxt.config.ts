import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    host_permissions: ["<all_urls>"],
    permissions: ["activeTab", "cookies", "storage", "tabs"],
    icons: {
      16: "logo.png",
      24: "logo.png",
      48: "logo.png",
      96: "logo.png",
      128: "logo.png",
    },
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
