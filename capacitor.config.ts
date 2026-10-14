import type { CapacitorConfig } from "@capacitor/cli";

// La app Android abre la web publicada en Vercel: cada actualización de la web llega sola a la app,
// sin tener que publicar un APK nuevo. "movil/www" solo se muestra si no hay conexión.
const config: CapacitorConfig = {
  appId: "pe.unamanito.app",
  appName: "Una Manito",
  webDir: "movil/www",
  server: {
    url: "https://unamanito.vercel.app",
    cleartext: false,
    errorPath: "index.html",
  },
  android: { backgroundColor: "#0b6ef0" },
};

export default config;
