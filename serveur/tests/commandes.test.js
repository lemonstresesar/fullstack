// Vraie base MariaDB séparée (« comptoir_cmd_test »), recréée à chaque lancement.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { configBase } from "../src/config.js";
import { creerPool } from "../src/db.js";
import { initialiser } from "../src/initialiser.js";
import { createApp } from "../src/app.js";
import { creerDepotUtilisateurs } from "../src/depot_utilisateurs.js";
import { hacher } from "../src/auth/mots_de_passe.js";

process.env.BCRYPT_COUT = "4";
const CLE = "cle-de-test-0123456789-0123456789-0123456789";
const config = { ...configBase, database: "comptoir_cmd_test" };
let pool, serveur, base, admin, client;

const envoyer = (methode, chemin, corps, jeton, adr = () => base) =>
  fetch(adr() + chemin, {
    method: methode,
    headers: { "Content-Type": "application/json", ...(jeton && { Authorization: `Bearer ${jeton}` }) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
const stock = async (id) => (await pool.query("SELECT stock FROM produits WHERE id = ?", [id]))[0][0].stock;
const nbCommandes = async () => (await pool.query("SELECT COUNT(*) AS n FROM commandes"))[0][0].n;
const moi = { nom: "Aïcha", tel: "+237 699 00 00 00", quartier: "Bonapriso" };

before(async () => {
  await initialiser(config, { reinitialiser: true });
  pool = creerPool(config);
  serveur = createApp({ pool, cleJeton: CLE, silencieux: true, tentatives: 100, limiteCommandes: 100 }).listen(0);
  base = `http://localhost:${serveur.address().port}/api`;
  await creerDepotUtilisateurs(pool).creer({ nom: "Admin", email: "admin@test.example", empreinte: await hacher("mot-de-passe-admin-1"), role: "admin" });
  admin = (await (await envoyer("POST", "/auth/connexion", { email: "admin@test.example", mot_de_passe: "mot-de-passe-admin-1" })).json()).jeton;
  await envoyer("POST", "/auth/inscription", { nom: "Client", email: "client@test.example", mot_de_passe: "mot-de-passe-client-1" });
  client = (await (await envoyer("POST", "/auth/connexion", { email: "client@test.example", mot_de_passe: "mot-de-passe-client-1" })).json()).jeton;
});
after(async () => {
  serveur.close();
  await pool.end();
});

test("commande valide : 201, total calculé par la BASE, téléphone normalisé, stock décrémenté", async () => {
  // produit 4 : Miel 4 500 FCFA (stock 20) ; produit 5 : Café 3 000 FCFA (stock 1)
  const r = await envoyer("POST", "/commandes", { client: moi, lignes: [{ id: 4, quantite: 2 }, { id: 5, quantite: 1 }] });
  assert.equal(r.status, 201);
  const c = await r.json();
  assert.equal(c.total_fcfa, 12000); // 2 × 4 500 + 1 × 3 000
  assert.equal(c.statut, "nouvelle");
  assert.equal(c.telephone, "699000000");
  assert.deepEqual(c.lignes.map((l) => [l.nom_produit, l.prix_unitaire_fcfa, l.quantite]),
    [["Miel de Dschang 500 g", 4500, 2], ["Café de Foumban 250 g", 3000, 1]]);
  assert.equal(await stock(4), 18);
  assert.equal(await stock(5), 0);
});

test("un prix envoyé par le client est ignoré", async () => {
  const r = await envoyer("POST", "/commandes", { client: moi, lignes: [{ id: 3, quantite: 2, prix_fcfa: 1 }], total_fcfa: 1 });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).total_fcfa, 3000); // 2 × 1 500, pas 1
});

test("stock insuffisant : 409 et RIEN n'est enregistré (transaction annulée)", async () => {
  const avant = { commandes: await nbCommandes(), miel: await stock(4) };
  // Le miel est disponible, le café (stock 0) ne l'est plus : la commande entière doit échouer
  const r = await envoyer("POST", "/commandes", { client: moi, lignes: [{ id: 4, quantite: 1 }, { id: 5, quantite: 1 }] });
  assert.equal(r.status, 409);
  assert.match((await r.json()).details["lignes.5"][0], /0 en stock/);
  assert.equal(await nbCommandes(), avant.commandes);
  assert.equal(await stock(4), avant.miel); // le miel n'a pas été retiré malgré sa disponibilité
});

test("entrées invalides : produit inconnu, panier vide, doublon, quantité, téléphone", async () => {
  const essai = (corps) => envoyer("POST", "/commandes", corps);
  assert.equal((await essai({ client: moi, lignes: [{ id: 999, quantite: 1 }] })).status, 400);
  assert.equal((await essai({ client: moi, lignes: [] })).status, 400);
  assert.equal((await essai({ client: moi, lignes: [{ id: 1, quantite: 1 }, { id: 1, quantite: 2 }] })).status, 400);
  assert.equal((await essai({ client: moi, lignes: [{ id: 1, quantite: 0 }] })).status, 400);
  assert.equal((await essai({ client: moi, lignes: [{ id: 1, quantite: 21 }] })).status, 400);
  const tel = await essai({ client: { ...moi, tel: "12345" }, lignes: [{ id: 1, quantite: 1 }] });
  assert.deepEqual(Object.keys((await tel.json()).details), ["client.tel"]);
});

test("concurrence : 8 clients veulent les 3 derniers articles, exactement 3 réussissent", async () => {
  await pool.query("UPDATE produits SET stock = 3 WHERE id = 6");
  const reponses = await Promise.all(
    Array.from({ length: 8 }, () => envoyer("POST", "/commandes", { client: moi, lignes: [{ id: 6, quantite: 1 }] })),
  );
  const codes = reponses.map((r) => r.status).sort();
  assert.deepEqual(codes, [201, 201, 201, 409, 409, 409, 409, 409]);
  assert.equal(await stock(6), 0); // jamais négatif, jamais « 2 clients pour le même article »
});

test("consultation : réservée à l'admin (401, 403, 200) ; filtre par statut", async () => {
  assert.equal((await envoyer("GET", "/commandes")).status, 401);
  assert.equal((await envoyer("GET", "/commandes", undefined, client)).status, 403);
  const liste = await (await envoyer("GET", "/commandes", undefined, admin)).json();
  assert.ok(liste.length >= 5 && liste[0].lignes.length >= 1);
  assert.ok(liste[0].id > liste[liste.length - 1].id); // la plus récente d'abord
  assert.equal((await (await envoyer("GET", "/commandes?statut=livree", undefined, admin)).json()).length, 0);
  assert.equal((await envoyer("GET", "/commandes/1", undefined, admin)).status, 404); // pas de lecture individuelle publique
});

test("statuts : transitions permises, annulation qui remet le stock, états finaux", async () => {
  const id = (await (await envoyer("POST", "/commandes", { client: moi, lignes: [{ id: 2, quantite: 2 }] })).json()).id;
  assert.equal(await stock(2), 3); // 5 - 2
  const patch = (n, statut, jeton = admin) => envoyer("PATCH", `/commandes/${n}/statut`, { statut }, jeton);
  assert.equal((await patch(id, "confirmee", client)).status, 403);
  assert.equal((await (await patch(id, "confirmee")).json()).statut, "confirmee");
  assert.equal((await patch(id, "nouvelle")).status, 400); // « nouvelle » n'est pas un statut à demander
  assert.equal((await patch(999, "livree")).status, 404);
  assert.equal((await patch(id, "annulee")).status, 200);
  assert.equal(await stock(2), 5); // les 2 articles sont revenus
  assert.equal((await patch(id, "livree")).status, 409); // une commande annulée est finie
  assert.equal((await patch(id, "annulee")).status, 409); // et ne remet pas le stock deux fois
  assert.equal(await stock(2), 5);
});

test("limite : la 3e commande de la même adresse est refusée (429)", async () => {
  const limite = createApp({ pool, cleJeton: CLE, silencieux: true, limiteCommandes: 2 }).listen(0);
  const adr = () => `http://localhost:${limite.address().port}/api`;
  try {
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await envoyer("POST", "/commandes", { client: moi, lignes: [{ id: 3, quantite: 1 }] }, undefined, adr)).status);
    assert.deepEqual(codes, [201, 201, 429]);
  } finally {
    limite.close();
  }
});
