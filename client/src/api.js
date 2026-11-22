// Tous les appels au serveur passent ici : une seule adresse de base, une seule gestion des erreurs.
export class ErreurApi extends Error {
  constructor(statut, message, details) {
    super(message);
    this.statut = statut;
    this.details = details; // { champ: ["message"] } quand le serveur détaille une validation
  }
}

export async function appeler(chemin, { methode = "GET", corps, jeton, signal } = {}) {
  const reponse = await fetch(`/api${chemin}`, {
    method: methode,
    signal,
    headers: {
      ...(corps && { "Content-Type": "application/json" }),
      ...(jeton && { Authorization: `Bearer ${jeton}` }),
    },
    body: corps && JSON.stringify(corps),
  });
  if (reponse.status === 204) return null;
  const donnees = await reponse.json().catch(() => ({})); // une panne peut renvoyer autre chose que du JSON
  if (!reponse.ok) throw new ErreurApi(reponse.status, donnees.erreur ?? `HTTP ${reponse.status}`, donnees.details);
  return donnees;
}
