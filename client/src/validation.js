// Règles de validation du formulaire de commande : fonctions pures, testables avec Node.
export const regles = {
  nom: (v) => (v.trim().length < 2 ? "Écris ton nom." : ""),
  tel: (v) =>
    /^(\+?237)?6\d{8}$/.test(v.replace(/[\s.-]/g, ""))
      ? ""
      : "Numéro attendu : 9 chiffres commençant par 6.",
  quartier: (v) => (v.trim().length < 2 ? "Indique ton quartier." : ""),
};

// Renvoie { champ: "message" } pour les champs en erreur, objet vide si tout est valide
export function valider(valeurs) {
  const erreurs = {};
  for (const [champ, regle] of Object.entries(regles)) {
    const message = regle(valeurs[champ] ?? "");
    if (message) erreurs[champ] = message;
  }
  return erreurs;
}
