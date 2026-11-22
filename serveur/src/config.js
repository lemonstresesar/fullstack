// Toute la configuration vient de l'environnement : le code ne contient AUCUN secret.
export const configBase = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "comptoir",
  // Les bases hébergées (cloud) exigent en général une connexion chiffrée : DB_SSL=1
  ssl: process.env.DB_SSL === "1" ? { minVersion: "TLSv1.2" } : undefined,
};

// Le serveur REFUSE de démarrer sans clé solide : mieux vaut une panne claire qu'une faille silencieuse.
export function lireCleJeton() {
  const cle = process.env.JWT_SECRET;
  if (!cle || cle.length < 32) {
    throw new Error("JWT_SECRET manquant ou trop court (32 caractères minimum). Voir .env.example.");
  }
  return cle;
}
