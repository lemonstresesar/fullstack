import express from "express";
import rateLimit from "express-rate-limit";
import { ErreurHttp } from "../erreurs.js";
import { exiger, schemaConnexion, schemaInscription } from "../schemas.js";
import { comparer, EMPREINTE_LEURRE, hacher } from "../auth/mots_de_passe.js";
import { signer } from "../auth/jetons.js";
import { exigerConnexion } from "../auth/middlewares.js";

export function routeurAuth({ utilisateurs, cleJeton, tentatives = 10 }) {
  const r = express.Router();

  // Limite les essais : sans elle, un robot peut tester des milliers de mots de passe par minute
  const limiteur = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: tentatives,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erreur: "Trop de tentatives. Réessaie dans quelques minutes." }),
  });

  r.post("/inscription", limiteur, async (req, res) => {
    const { nom, email, mot_de_passe } = exiger(schemaInscription, req.body);
    // Le rôle n'est PAS lu dans la requête : une inscription crée toujours un « client »
    const id = await utilisateurs.creer({ nom, email, empreinte: await hacher(mot_de_passe) });
    res.status(201).json(await utilisateurs.parId(id));
  });

  r.post("/connexion", limiteur, async (req, res) => {
    const { email, mot_de_passe } = exiger(schemaConnexion, req.body);
    const utilisateur = await utilisateurs.parEmail(email);
    // On compare TOUJOURS (avec le leurre si le compte n'existe pas) et on répond TOUJOURS pareil
    const bon = await comparer(mot_de_passe, utilisateur?.mot_de_passe_hash ?? EMPREINTE_LEURRE);
    if (!utilisateur || !bon) throw new ErreurHttp(401, "E-mail ou mot de passe incorrect.");
    const { mot_de_passe_hash, ...visible } = utilisateur; // on retire l'empreinte de la réponse
    res.json({ jeton: signer(utilisateur, cleJeton), utilisateur: visible });
  });

  r.get("/moi", exigerConnexion(cleJeton), async (req, res) => {
    const u = await utilisateurs.parId(req.utilisateur.id);
    if (!u) throw new ErreurHttp(401, "Compte inexistant.");
    res.json(u);
  });

  return r;
}
