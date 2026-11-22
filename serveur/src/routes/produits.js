import express from "express";
import { ErreurHttp } from "../erreurs.js";
import { exiger, schemaProduit } from "../schemas.js";
import { exigerConnexion, exigerRole } from "../auth/middlewares.js";

function lireId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ErreurHttp(400, "L'identifiant doit être un entier positif.");
  return id;
}

export function routeurProduits(depot, cleJeton) {
  const r = express.Router();
  const admin = [exigerConnexion(cleJeton), exigerRole("admin")]; // lecture publique, écriture réservée

  r.get("/", async (req, res) => {
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const { lignes, total } = await depot.lister({
      categorie: req.query.categorie ? String(req.query.categorie) : undefined,
      q: req.query.q ? String(req.query.q) : undefined,
      limite,
      decalage: (page - 1) * limite,
    });
    res.set("X-Total-Count", String(total)).json(lignes);
  });

  r.get("/:id", async (req, res) => {
    const produit = await depot.trouver(lireId(req));
    if (!produit) throw new ErreurHttp(404, "Produit introuvable.");
    res.json(produit);
  });

  r.post("/", ...admin, async (req, res) => {
    const id = await depot.creer(exiger(schemaProduit, req.body));
    res.status(201).location(`/api/produits/${id}`).json(await depot.trouver(id));
  });

  r.put("/:id", ...admin, async (req, res) => {
    const id = lireId(req);
    if ((await depot.modifier(id, exiger(schemaProduit, req.body))) === 0) throw new ErreurHttp(404, "Produit introuvable.");
    res.json(await depot.trouver(id));
  });

  r.delete("/:id", ...admin, async (req, res) => {
    if ((await depot.supprimer(lireId(req))) === 0) throw new ErreurHttp(404, "Produit introuvable.");
    res.status(204).end();
  });

  return r;
}
