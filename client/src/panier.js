// panier.js : logique pure du panier, sans DOM. Le panier ne mémorise que { id, quantite } :
// les prix viennent TOUJOURS du catalogue, jamais du stockage (que l'utilisateur peut modifier).

export function ajouter(panier, id, stock) {
  const ligne = panier.find((l) => l.id === id);
  if (!ligne) return stock > 0 ? [...panier, { id, quantite: 1 }] : panier;
  return changer(panier, id, +1, stock);
}

export function changer(panier, id, delta, stock) {
  return panier
    .map((l) => (l.id === id ? { ...l, quantite: Math.min(l.quantite + delta, stock) } : l))
    .filter((l) => l.quantite > 0);
}

export const retirer = (panier, id) => panier.filter((l) => l.id !== id);

// Associe chaque ligne à son produit ; ignore les identifiants devenus inconnus
export function lignes(panier, produits) {
  return panier.flatMap((l) => {
    const p = produits.find((x) => x.id === l.id);
    if (!p) return [];
    const quantite = Math.min(l.quantite, p.stock);
    return quantite > 0 ? [{ ...p, quantite, sousTotal: p.prix_fcfa * quantite }] : [];
  });
}

export const total = (lg) => lg.reduce((somme, l) => somme + l.sousTotal, 0);
export const nombre = (panier) => panier.reduce((somme, l) => somme + l.quantite, 0);

export function messageWhatsApp(lg, client, formater) {
  const detail = lg.map((l) => `- ${l.quantite} x ${l.nom} : ${formater(l.sousTotal)}`);
  return [
    "Bonjour, je souhaite commander :",
    ...detail,
    `Total : ${formater(total(lg))}`,
    `Nom : ${client.nom}`,
    `Téléphone : ${client.tel}`,
    `Quartier de livraison : ${client.quartier}`,
  ].join("\n");
}
