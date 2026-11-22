// Crée (ou signale) le compte administrateur : « npm run admin:creer ».
// Il n'existe AUCUNE route publique pour devenir administrateur : on le fait ici, sur le serveur.
import { configBase } from "./config.js";
import { creerPool } from "./db.js";
import { creerDepotUtilisateurs } from "./depot_utilisateurs.js";
import { hacher } from "./auth/mots_de_passe.js";

const email = process.env.ADMIN_EMAIL;
const motDePasse = process.env.ADMIN_MOT_DE_PASSE;
if (!email || !motDePasse || motDePasse.length < 10) {
  console.error("ADMIN_EMAIL et ADMIN_MOT_DE_PASSE (10 caractères minimum) sont requis dans .env.");
  process.exit(1);
}
const pool = creerPool(configBase);
const utilisateurs = creerDepotUtilisateurs(pool);
if (await utilisateurs.parEmail(email.toLowerCase())) {
  console.log("Cet administrateur existe déjà.");
} else {
  await utilisateurs.creer({ nom: "Administrateur", email: email.toLowerCase(), empreinte: await hacher(motDePasse), role: "admin" });
  console.log(`Administrateur créé : ${email}`);
}
await pool.end();
