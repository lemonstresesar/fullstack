import { useState } from "react";
import { Link } from "react-router-dom";
import { appeler, ErreurApi } from "../api.js";
import { useCatalogue } from "../CatalogueContext.jsx";
import { usePanier } from "../PanierContext.jsx";
import { fcfa } from "../outils.js";
import { messageWhatsApp } from "../panier.js";
import { valider } from "../validation.js";

const NUMERO_BOUTIQUE = "237600000000"; // numéro FICTIF : à remplacer

export default function Panier() {
  const { lignes, total, changer, vider } = usePanier();
  const { recharger } = useCatalogue();
  const [client, setClient] = useState({ nom: "", tel: "", quartier: "" });
  const [erreurs, setErreurs] = useState({});
  const [probleme, setProbleme] = useState(""); // erreur venue du SERVEUR (stock, panne…)
  const [envoi, setEnvoi] = useState(false); // une commande est en cours d'envoi
  const [confirmation, setConfirmation] = useState(null); // { id, total, lienWhatsApp }

  const saisir = (e) => setClient({ ...client, [e.target.name]: e.target.value });

  async function commander(e) {
    e.preventDefault();
    const trouvees = valider(client); // 1. le confort : contrôle immédiat dans la page
    setErreurs(trouvees);
    setProbleme("");
    if (Object.keys(trouvees).length) {
      document.getElementById(Object.keys(trouvees)[0])?.focus();
      return;
    }
    setEnvoi(true);
    try {
      // 2. la vraie règle : le SERVEUR revalide, calcule le total et retire le stock
      const commande = await appeler("/commandes", {
        methode: "POST",
        // On n'envoie que des identifiants et des quantités : jamais un prix
        corps: { client, lignes: lignes.map((l) => ({ id: l.id, quantite: l.quantite })) },
      });
      const message = `Commande n° ${commande.id} enregistrée.\n` + messageWhatsApp(lignes, client, fcfa);
      setConfirmation({
        id: commande.id,
        total: commande.total_fcfa,
        lienWhatsApp: `https://wa.me/${NUMERO_BOUTIQUE}?text=${encodeURIComponent(message)}`,
      });
      vider();
      setClient({ nom: "", tel: "", quartier: "" });
    } catch (erreur) {
      if (erreur instanceof ErreurApi && erreur.statut === 409) recharger(); // le stock a changé : on se remet à jour
      const detail = erreur instanceof ErreurApi ? Object.values(erreur.details ?? {}).flat().join(" ") : "";
      setProbleme(
        erreur instanceof ErreurApi
          ? `${erreur.message} ${detail}`.trim()
          : "Le serveur ne répond pas. Vérifie ta connexion et réessaie.",
      );
    } finally {
      setEnvoi(false); // dans tous les cas, le bouton redevient utilisable
    }
  }

  if (lignes.length === 0) {
    return (
      <section className="page">
        <h1>Mon panier</h1>
        {confirmation ? (
          <div className="confirmation" role="status">
            <p>
              <strong>Commande n° {confirmation.id} enregistrée.</strong> Total : {fcfa(confirmation.total)}. La boutique
              te contactera pour la livraison.
            </p>
            <p>
              <a className="btn" href={confirmation.lienWhatsApp} target="_blank" rel="noopener noreferrer">
                Prévenir la boutique sur WhatsApp
              </a>
            </p>
          </div>
        ) : (
          <p className="etat" role="status">
            Ton panier est vide.
          </p>
        )}
        <p>
          <Link to="/">Voir le catalogue</Link>
        </p>
      </section>
    );
  }
  return (
    <section className="page">
      <h1>Mon panier</h1>
      <ul className="lignes">
        {lignes.map((l) => (
          <li key={l.id} className="ligne">
            <div className="mini" style={{ "--t": l.teinte }} />
            <div>
              <h3>{l.nom}</h3>
              <small>{fcfa(l.prix_fcfa)}</small>
              <div className="quantite">
                <button type="button" aria-label={`Retirer un ${l.nom}`} onClick={() => changer(l.id, -1)}>
                  −
                </button>
                <span aria-label="Quantité">{l.quantite}</span>
                <button type="button" aria-label={`Ajouter un ${l.nom}`} onClick={() => changer(l.id, +1)}>
                  +
                </button>
              </div>
            </div>
            <strong>{fcfa(l.sousTotal)}</strong>
          </li>
        ))}
      </ul>
      <p className="total">
        Total <strong>{fcfa(total)}</strong>
      </p>

      <form onSubmit={commander} noValidate>
        {[
          ["nom", "Nom", "name"],
          ["tel", "Téléphone", "tel"],
          ["quartier", "Quartier de livraison", "off"],
        ].map(([champ, libelle, auto]) => (
          <div className="champ" key={champ}>
            <label htmlFor={champ}>{libelle}</label>
            <input
              id={champ}
              name={champ}
              value={client[champ]}
              onChange={saisir}
              autoComplete={auto}
              aria-invalid={Boolean(erreurs[champ])}
              aria-describedby={`${champ}-erreur`}
            />
            <p className="erreur" id={`${champ}-erreur`}>
              {erreurs[champ]}
            </p>
          </div>
        ))}
        {probleme && (
          <p className="erreur erreur--serveur" role="alert">
            {probleme}
          </p>
        )}
        <button className="btn btn--large" type="submit" disabled={envoi}>
          {envoi ? "Envoi en cours…" : "Passer la commande"}
        </button>
      </form>
    </section>
  );
}
