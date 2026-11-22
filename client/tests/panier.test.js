import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ajouter,
  changer,
  retirer,
  lignes,
  total,
  nombre,
  messageWhatsApp,
} from "../src/panier.js";
import { fcfa } from "../src/outils.js";

const produits = JSON.parse(
  readFileSync(new URL("./catalogue.json", import.meta.url)),
);
const cafe = produits.find((p) => p.id === 5); // stock : 1
const pagne = produits.find((p) => p.id === 1); // stock : 10
const rupture = produits.find((p) => p.id === 8); // stock : 0

test("ajouter crée puis incrémente, sans modifier l'original", () => {
  const vide = [];
  const un = ajouter(vide, 1, pagne.stock);
  assert.deepEqual(un, [{ id: 1, quantite: 1 }]);
  assert.deepEqual(vide, []);
  assert.equal(ajouter(un, 1, pagne.stock)[0].quantite, 2);
});

test("on ne dépasse jamais le stock et on n'ajoute pas une rupture", () => {
  let p = ajouter([], 5, cafe.stock);
  p = ajouter(p, 5, cafe.stock);
  assert.equal(p[0].quantite, 1);
  assert.deepEqual(ajouter([], 8, rupture.stock), []);
});

test("changer à zéro retire la ligne ; retirer supprime", () => {
  assert.deepEqual(changer([{ id: 1, quantite: 1 }], 1, -1, 10), []);
  assert.deepEqual(
    retirer(
      [
        { id: 1, quantite: 2 },
        { id: 2, quantite: 1 },
      ],
      1,
    ),
    [{ id: 2, quantite: 1 }],
  );
});

test("les prix viennent du catalogue : un panier trafiqué ne change rien", () => {
  const trafique = [
    { id: 1, quantite: 2, prix_fcfa: 1 },
    { id: 999, quantite: 5 },
  ];
  const lg = lignes(trafique, produits);
  assert.equal(lg.length, 1);
  assert.equal(total(lg), 24000);
  assert.equal(nombre(trafique), 7);
});

test("une quantité stockée trop grande est ramenée au stock réel", () => {
  assert.equal(lignes([{ id: 5, quantite: 50 }], produits)[0].quantite, 1);
});

test("le message WhatsApp liste les lignes et le total", () => {
  const lg = lignes(
    [
      { id: 1, quantite: 2 },
      { id: 3, quantite: 1 },
    ],
    produits,
  );
  const msg = messageWhatsApp(lg, { nom: "Aïcha", tel: "699000000", quartier: "Bonapriso" }, fcfa);
  assert.match(msg, /2 x Pagne wax 6 yards : 24 000 FCFA/);
  assert.match(msg, /Total : 25 500 FCFA/);
  assert.match(msg, /Quartier de livraison : Bonapriso/);
});
