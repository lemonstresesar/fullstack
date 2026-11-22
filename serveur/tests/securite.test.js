// Vraie base MariaDB séparée (« comptoir_secu25_test »), recréée à chaque lancement.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { configBase, lireCleJeton } from "../src/config.js";
import { creerPool } from "../src/db.js";
import { initialiser } from "../src/initialiser.js";
import { createApp } from "../src/app.js";
import { creerDepotUtilisateurs } from "../src/depot_utilisateurs.js";
import { hacher } from "../src/auth/mots_de_passe.js";

process.env.BCRYPT_COUT = "4"; // hachage rapide pour les tests SEULEMENT (en production : 12)
const CLE = "cle-de-test-0123456789-0123456789-0123456789";
const config = { ...configBase, database: "comptoir_secu25_test" };
let pool, serveur, base, adminJeton;

before(async () => {
  await initialiser(config, { reinitialiser: true });
  pool = creerPool(config);
  serveur = createApp({ pool, cleJeton: CLE, silencieux: true, tentatives: 100 }).listen(0);
  base = `http://localhost:${serveur.address().port}/api`;
  await creerDepotUtilisateurs(pool).creer({
    nom: "Admin", email: "admin@test.example", empreinte: await hacher("mot-de-passe-admin-1"), role: "admin",
  });
  adminJeton = (await (await envoyer("POST", "/auth/connexion", { email: "admin@test.example", mot_de_passe: "mot-de-passe-admin-1" })).json()).jeton;
});
after(async () => {
  serveur.close();
  await pool.end();
});

const envoyer = (methode, chemin, corps, jeton, adresse = () => base) =>
  fetch(adresse() + chemin, {
    method: methode,
    headers: { "Content-Type": "application/json", ...(jeton && { Authorization: `Bearer ${jeton}` }) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
const aicha = { nom: "Aïcha", email: "Aicha@Exemple.com ", mot_de_passe: "un-mot-de-passe-solide" };
const produit = { nom: "Gingembre", categorie: "Épicerie", prix_fcfa: 1800 };

test("inscription : 201, e-mail normalisé, aucune empreinte renvoyée, rôle toujours « client »", async () => {
  const r = await envoyer("POST", "/auth/inscription", { ...aicha, role: "admin", id: 999 });
  assert.equal(r.status, 201);
  const u = await r.json();
  assert.equal(u.email, "aicha@exemple.com");
  assert.equal(u.role, "client"); // « role: admin » envoyé par le client est ignoré
  assert.notEqual(u.id, 999);
  assert.ok(!JSON.stringify(u).includes("hash") && !JSON.stringify(u).includes("mot_de_passe"));
  const [[ligne]] = await pool.query("SELECT mot_de_passe_hash FROM utilisateurs WHERE id = ?", [u.id]);
  assert.match(ligne.mot_de_passe_hash, /^\$2[aby]\$04\$/); // une empreinte bcrypt, pas le mot de passe
  assert.ok(!ligne.mot_de_passe_hash.includes(aicha.mot_de_passe));
});

test("inscription : mot de passe faible, e-mail invalide, doublon", async () => {
  const faible = await envoyer("POST", "/auth/inscription", { nom: "Bob", email: "bob@x.com", mot_de_passe: "court" });
  assert.equal(faible.status, 400);
  assert.ok((await faible.json()).details.mot_de_passe);
  const mauvais = await envoyer("POST", "/auth/inscription", { nom: "Bob", email: "pas-un-email", mot_de_passe: "un-mot-de-passe-solide" });
  assert.deepEqual(Object.keys((await mauvais.json()).details), ["email"]);
  assert.equal((await envoyer("POST", "/auth/inscription", aicha)).status, 409);
});

test("connexion : jeton lisible mais signé ; mêmes réponses pour « mauvais mot de passe » et « compte inconnu »", async () => {
  const ok = await envoyer("POST", "/auth/connexion", { email: "AICHA@exemple.com", mot_de_passe: aicha.mot_de_passe });
  assert.equal(ok.status, 200);
  const { jeton, utilisateur } = await ok.json();
  assert.equal(utilisateur.email, "aicha@exemple.com");
  const charge = JSON.parse(Buffer.from(jeton.split(".")[1], "base64url"));
  assert.deepEqual(Object.keys(charge).sort(), ["exp", "iat", "role", "sub"]); // pas de mot de passe dedans
  assert.ok(charge.exp - charge.iat <= 2 * 3600);

  const a = await envoyer("POST", "/auth/connexion", { email: "aicha@exemple.com", mot_de_passe: "mauvais-mot-de-passe" });
  const b = await envoyer("POST", "/auth/connexion", { email: "inconnu@exemple.com", mot_de_passe: "mauvais-mot-de-passe" });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(await a.json(), await b.json()); // l'attaquant ne peut pas deviner quels e-mails existent
});

test("jetons : valide accepté ; absent, trafiqué, expiré, sans signature refusés", async () => {
  const { jeton } = await (await envoyer("POST", "/auth/connexion", { email: "aicha@exemple.com", mot_de_passe: aicha.mot_de_passe })).json();
  const moi = await envoyer("GET", "/auth/moi", undefined, jeton);
  assert.equal(moi.status, 200);
  assert.equal((await moi.json()).email, "aicha@exemple.com");

  assert.equal((await envoyer("GET", "/auth/moi")).status, 401);
  const [en, charge, sig] = jeton.split(".");
  const promu = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(charge, "base64url")), role: "admin" })).toString("base64url");
  assert.equal((await envoyer("GET", "/auth/moi", undefined, `${en}.${promu}.${sig}`)).status, 401); // rôle modifié, signature périmée
  const expire = jwt.sign({ sub: "1", role: "admin" }, CLE, { expiresIn: -10 });
  assert.equal((await envoyer("GET", "/auth/moi", undefined, expire)).status, 401);
  const sansSignature = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from('{"sub":"1","role":"admin"}').toString("base64url")}.`;
  assert.equal((await envoyer("GET", "/auth/moi", undefined, sansSignature)).status, 401);
  const autreCle = jwt.sign({ sub: "1", role: "admin" }, "une-autre-cle-0123456789-0123456789-0123456789");
  assert.equal((await envoyer("GET", "/auth/moi", undefined, autreCle)).status, 401);
});

test("autorisations : lecture publique, écriture réservée à l'admin (401 puis 403 puis 201)", async () => {
  assert.equal((await envoyer("GET", "/produits")).status, 200);
  assert.equal((await envoyer("POST", "/produits", produit)).status, 401); // pas identifié
  const { jeton: client } = await (await envoyer("POST", "/auth/connexion", { email: "aicha@exemple.com", mot_de_passe: aicha.mot_de_passe })).json();
  assert.equal((await envoyer("POST", "/produits", produit, client)).status, 403); // identifié, pas admin

  const cree = await envoyer("POST", "/produits", { ...produit, id: 999, stock: 5 }, adminJeton);
  assert.equal(cree.status, 201);
  const p = await cree.json();
  assert.notEqual(p.id, 999); // l'« id » envoyé est ignoré
  assert.equal((await envoyer("PUT", `/produits/${p.id}`, { ...produit, prix_fcfa: 2000 }, client)).status, 403);
  assert.equal((await (await envoyer("PUT", `/produits/${p.id}`, { ...produit, prix_fcfa: 2000 }, adminJeton)).json()).prix_fcfa, 2000);
  assert.equal((await envoyer("DELETE", `/produits/${p.id}`, undefined, client)).status, 403);
  assert.equal((await envoyer("DELETE", `/produits/${p.id}`, undefined, adminJeton)).status, 204);
});

test("validation zod : un type faux est refusé avec un message par champ", async () => {
  const r = await envoyer("POST", "/produits", { nom: 42, categorie: "", prix_fcfa: "12000", stock: -1 }, adminJeton);
  assert.equal(r.status, 400);
  const { details } = await r.json();
  assert.deepEqual(Object.keys(details).sort(), ["categorie", "nom", "prix_fcfa", "stock"]);
  assert.equal(details.prix_fcfa[0], "Le prix : un nombre est attendu."); // « "12000" » (texte) n'est pas un nombre
});

test("limite d'essais : la 4e tentative de connexion est refusée (429)", async () => {
  const limite = createApp({ pool, cleJeton: CLE, silencieux: true, tentatives: 3 }).listen(0);
  const adr = () => `http://localhost:${limite.address().port}/api`;
  try {
    const codes = [];
    for (let i = 0; i < 4; i++) {
      codes.push((await envoyer("POST", "/auth/connexion", { email: "x@x.com", mot_de_passe: "essai-numero-" + i }, undefined, adr)).status);
    }
    assert.deepEqual(codes, [401, 401, 401, 429]);
  } finally {
    limite.close();
  }
});

test("en-têtes de sécurité (helmet) et configuration refusée si la clé est trop courte", async () => {
  const r = await fetch(`${base}/sante`);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null); // on ne dit pas « Express » aux curieux
  const avant = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "trop-court";
  assert.throws(() => lireCleJeton(), /JWT_SECRET/);
  process.env.JWT_SECRET = avant;
});
