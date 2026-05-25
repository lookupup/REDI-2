import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    define: {
      __GA4_MEASUREMENT_ID__: JSON.stringify(env.VITE_GA4_MEASUREMENT_ID || env.GA4_MEASUREMENT_ID || "")
    },
    server: {
      host: "127.0.0.1",
      port: 5173
    },
    preview: {
      host: "127.0.0.1",
      port: 4173
    }
  };
});
