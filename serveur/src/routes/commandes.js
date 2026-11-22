import express from "express";
import rateLimit from "express-rate-limit";
import { ErreurHttp } from "../erreurs.js";
import { exiger, schemaCommande, schemaStatut } from "../schemas.js";
import { exigerConnexion, exigerRole } from "../auth/middlewares.js";

const STATUTS = ["nouvelle", "confirmee", "livree", "annulee"];

export function routeurCommandes({ depot, cleJeton, limiteCommandes = 20 }) {
  const r = express.Router();
  const admin = [exigerConnexion(cleJeton), exigerRole("admin")];
  const limiteur = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: limiteCommandes,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erreur: "Trop de commandes depuis cette adresse. Réessaie plus tard." }),
  });

  // PUBLIC : un client commande sans compte. Il n'envoie que des identifiants et des quantités.
  r.post("/", limiteur, async (req, res) => {
    const id = await depot.creer(exiger(schemaCommande, req.body));
    res.status(201).location(`/api/commandes/${id}`).json(await depot.trouver(id));
  });

  // Aucun « GET /commandes/:id » public : les numéros se devinent (1, 2, 3…) et on lirait les commandes des autres.
  r.get("/", ...admin, async (req, res) => {
    const statut = STATUTS.includes(req.query.statut) ? req.query.statut : undefined;
    res.json(await depot.lister({ statut }));
  });

  r.patch("/:id/statut", ...admin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ErreurHttp(400, "L'identifiant doit être un entier positif.");
    const { statut } = exiger(schemaStatut, req.body);
    res.json(await depot.changerStatut(id, statut));
  });

  return r;
}
