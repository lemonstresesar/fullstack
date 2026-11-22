import mysql from "mysql2/promise";

// Un POOL : quelques connexions ouvertes une fois et réutilisées par toutes les requêtes.
// Ouvrir une connexion par requête serait lent ; n'en ouvrir qu'une ferait faire la queue.
export function creerPool(config) {
  return mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  });
}
