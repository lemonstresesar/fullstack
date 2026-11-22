import express from "express";
import cors from "cors";
import helmet from "helmet";
import { journal } from "./journal.js";
import { ErreurHttp } from "./erreurs.js";
import { creerDepot } from "./depot.js";
import { creerDepotUtilisateurs } from "./depot_utilisateurs.js";
import { creerDepotCommandes } from "./depot_commandes.js";
import { routeurProduits } from "./routes/produits.js";
import { routeurAuth } from "./routes/auth.js";
import { routeurCommandes } from "./routes/commandes.js";

export function createApp({ pool, cleJeton, origines = [], silencieux = false, tentatives = 10, limiteCommandes = 20, confianceProxy = 0, dossierClient }) {
  const app = express();
  app.set("trust proxy", confianceProxy); // derrière un hébergeur : 1, pour que la limite compte la vraie IP du client
  if (!silencieux) app.use(journal);
  app.use(helmet()); // en-têtes de sécurité : nosniff, pas de X-Powered-By, etc.
  app.use(cors({ origin: origines, exposedHeaders: ["X-Total-Count", "Location"] }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/sante", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ serveur: "ok", base: "ok" });
  });
  app.use("/api/auth", routeurAuth({ utilisateurs: creerDepotUtilisateurs(pool), cleJeton, tentatives }));
  app.use("/api/produits", routeurProduits(creerDepot(pool), cleJeton));
  app.use("/api/commandes", routeurCommandes({ depot: creerDepotCommandes(pool), cleJeton, limiteCommandes }));

  app.use("/api", (req, res) => res.status(404).json({ erreur: "Route inconnue." }));

  // Le site React construit (client/dist) est servi par le MÊME serveur : même adresse, donc aucun CORS en production
  if (dossierClient) app.use(express.static(dossierClient));
  app.use((req, res) => res.status(404).type("text").send("Page introuvable."));

  app.use((erreur, req, res, next) => {
    if (erreur.type === "entity.parse.failed") erreur = new ErreurHttp(400, "JSON invalide.");
    if (erreur.code === "ER_DUP_ENTRY") erreur = new ErreurHttp(409, "Cette valeur existe déjà.");
    const statut = erreur.statut ?? 500;
    if (statut === 500) console.error(erreur);
    res.status(statut).json({
      erreur: statut === 500 ? "Erreur interne du serveur." : erreur.message,
      ...(erreur.details && { details: erreur.details }),
    });
  });
  return app;
}
