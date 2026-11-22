import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" : chemins relatifs. En développement, les appels « /api » sont envoyés au serveur Express (port 3000) :
// la page et l'API ont la MÊME origine pour le navigateur, donc aucun réglage CORS n'est nécessaire.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { proxy: { "/api": "http://localhost:3000" } },
});
