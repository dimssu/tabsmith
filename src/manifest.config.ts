import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Tabsmith",
  description:
    "Smart, private tab grouping, reminders, and contextual notes — fully on-device.",
  version: "0.1.0",
  minimum_chrome_version: "116",
  action: {
    default_popup: "src/popup/index.html",
    default_title: "Tabsmith",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: [
    "tabs",
    "tabGroups",
    "alarms",
    "notifications",
    "storage",
    "sidePanel",
    "scripting",
  ],
  host_permissions: ["<all_urls>"],
  icons: {
    16: "src/assets/icon-16.png",
    32: "src/assets/icon-32.png",
    48: "src/assets/icon-48.png",
    128: "src/assets/icon-128.png",
  },
});
