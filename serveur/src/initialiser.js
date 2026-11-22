// Crée la base, la table et les données de départ : « npm run db:init ».
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { configBase } from "./config.js";

const lire = (nom) => readFile(new URL(`../${nom}`, import.meta.url), "utf8");

export async function initialiser(config, { donnees = true, reinitialiser = false } = {}) {
  // Un NOM de base ne peut pas être un paramètre « ? » : on le contrôle donc nous-mêmes
  if (!/^[a-z0-9_]{1,40}$/i.test(config.database)) throw new Error("Nom de base invalide.");
  const { database, ...connexion } = config;
  const cx = await mysql.createConnection({ ...connexion, multipleStatements: true });
  try {
    await cx.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await cx.query(`USE \`${database}\``);
    if (reinitialiser) await cx.query("DROP TABLE IF EXISTS commande_lignes, commandes, produits, utilisateurs");
    await cx.query(await lire("schema.sql"));
    if (donnees) await cx.query(await lire("donnees.sql"));
  } finally {
    await cx.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await initialiser(configBase, { reinitialiser: process.argv.includes("--reset") });
  console.log(`Base « ${configBase.database} » prête.`);
}
