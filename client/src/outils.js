// outils.js : des fonctions pures, exportées pour être réutilisées.

export const fcfa = (n) => n.toLocaleString("fr-FR").replace(/ /g, " ") + " FCFA";

export function parCategorie(produits, categorie) {
  return produits.filter((p) => p.categorie === categorie);
}

export function enStock(produits) {
  return produits.filter((p) => p.stock > 0);
}

export function trierParPrix(produits, sens = "croissant") {
  const copie = [...produits]; // on ne modifie pas le tableau d'origine
  copie.sort((a, b) => a.prix_fcfa - b.prix_fcfa);
  return sens === "croissant" ? copie : copie.reverse();
}

export function totalPanier(panier) {
  return panier.reduce((somme, ligne) => somme + ligne.prix_fcfa * ligne.quantite, 0);
}

export function grouperParCategorie(produits) {
  const groupes = {};
  for (const p of produits) {
    (groupes[p.categorie] ??= []).push(p.nom);
  }
  return groupes;
}
