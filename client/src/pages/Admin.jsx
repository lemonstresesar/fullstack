import { useCallback, useEffect, useState } from "react";
import { appeler, ErreurApi } from "../api.js";
import { fcfa } from "../outils.js";

const CLE = "comptoir.admin.jeton"; // sessionStorage : effacé à la fermeture de l'onglet
const lireJeton = () => {
  try {
    return sessionStorage.getItem(CLE) ?? "";
  } catch {
    return "";
  }
};
// Quels boutons proposer selon le statut (le serveur applique de toute façon les mêmes règles)
const ACTIONS = {
  nouvelle: [["confirmee", "Confirmer"], ["annulee", "Annuler"]],
  confirmee: [["livree", "Marquer livrée"], ["annulee", "Annuler"]],
  livree: [],
  annulee: [],
};

function Connexion({ onConnecte }) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    try {
      const { jeton } = await appeler("/auth/connexion", { methode: "POST", corps: { email, mot_de_passe: motDePasse } });
      try {
        sessionStorage.setItem(CLE, jeton);
      } catch {
        /* stockage indisponible : la session durera tant que la page reste ouverte */
      }
      onConnecte(jeton);
    } catch (e2) {
      setErreur(e2 instanceof ErreurApi ? e2.message : "Le serveur ne répond pas.");
    }
  }
  return (
    <section className="page">
      <h1>Espace boutique</h1>
      <form onSubmit={envoyer}>
        <div className="champ">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="champ">
          <label htmlFor="mdp">Mot de passe</label>
          <input id="mdp" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" />
        </div>
        {erreur && (
          <p className="erreur erreur--serveur" role="alert">
            {erreur}
          </p>
        )}
        <button className="btn btn--large" type="submit">
          Se connecter
        </button>
      </form>
    </section>
  );
}

export default function Admin() {
  const [jeton, setJeton] = useState(lireJeton);
  const [commandes, setCommandes] = useState([]);
  const [statut, setStatut] = useState("");
  const [message, setMessage] = useState("");

  const deconnecter = useCallback(() => {
    try {
      sessionStorage.removeItem(CLE);
    } catch {
      /* rien à faire */
    }
    setJeton("");
    setCommandes([]);
  }, []);

  useEffect(() => {
    if (!jeton) return;
    const controle = new AbortController();
    appeler(`/commandes${statut ? `?statut=${statut}` : ""}`, { jeton, signal: controle.signal })
      .then(setCommandes)
      .catch((e) => {
        if (e.name === "AbortError") return;
        if (e instanceof ErreurApi && e.statut === 401) deconnecter(); // jeton expiré : retour à la connexion
        else setMessage(e instanceof ErreurApi ? e.message : "Le serveur ne répond pas.");
      });
    return () => controle.abort();
  }, [jeton, statut, deconnecter]);

  async function changer(id, nouveau) {
    setMessage("");
    try {
      const maj = await appeler(`/commandes/${id}/statut`, { methode: "PATCH", corps: { statut: nouveau }, jeton });
      setCommandes((liste) => liste.map((c) => (c.id === id ? maj : c))); // on remplace la commande modifiée
    } catch (e) {
      setMessage(e instanceof ErreurApi ? e.message : "Le serveur ne répond pas.");
    }
  }

  if (!jeton) return <Connexion onConnecte={setJeton} />;
  return (
    <section className="page admin">
      <h1>Commandes</h1>
      <div className="barre-outils">
        <div className="champ">
          <label htmlFor="filtre">Statut</label>
          <select id="filtre" value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Toutes</option>
            <option value="nouvelle">Nouvelles</option>
            <option value="confirmee">Confirmées</option>
            <option value="livree">Livrées</option>
            <option value="annulee">Annulées</option>
          </select>
        </div>
        <button type="button" className="chip" onClick={deconnecter}>
          Se déconnecter
        </button>
      </div>
      {message && (
        <p className="erreur erreur--serveur" role="alert">
          {message}
        </p>
      )}
      {commandes.length === 0 && <p className="etat">Aucune commande.</p>}
      <ul className="commandes">
        {commandes.map((c) => (
          <li key={c.id} className="commande" data-statut={c.statut}>
            <header>
              <h2>Commande n° {c.id}</h2>
              <span className="statut">{c.statut}</span>
            </header>
            <p>
              {c.nom_client} · <a href={`tel:+237${c.telephone}`}>{c.telephone}</a> · {c.quartier}
            </p>
            <ul>
              {c.lignes.map((l) => (
                <li key={l.produit_id}>
                  {l.quantite} × {l.nom_produit} ({fcfa(l.prix_unitaire_fcfa)})
                </li>
              ))}
            </ul>
            <p className="total">
              Total <strong>{fcfa(c.total_fcfa)}</strong>
            </p>
            <div className="actions-commande">
              {ACTIONS[c.statut].map(([valeur, libelle]) => (
                <button key={valeur} type="button" className="chip" onClick={() => changer(c.id, valeur)}>
                  {libelle}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
