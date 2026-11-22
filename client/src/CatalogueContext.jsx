import { createContext, useContext, useEffect, useState } from "react";
import { appeler } from "./api.js";

// Le catalogue est chargé UNE fois, au sommet de l'application, puis lu par toutes les pages.
// Seule la source change depuis le chapitre 19 : un appel à l'API au lieu d'un fichier.
const CatalogueContext = createContext(null);

export function CatalogueProvider({ children }) {
  const [etat, setEtat] = useState({ statut: "chargement", produits: [], erreur: null });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    // Premier chargement : écran « Chargement ». Rechargement : on garde l'affichage actuel (pas de clignotement)
    setEtat((e) => (e.produits.length ? e : { statut: "chargement", produits: [], erreur: null }));
    // Les produits viennent maintenant de l'API (et donc de la base), plus d'un fichier JSON
    appeler("/produits?limite=100", { signal: controle.signal })
      .then((produits) => setEtat({ statut: "ok", produits, erreur: null }))
      .catch((e) => {
        if (e.name !== "AbortError")
          setEtat((avant) => (avant.produits.length ? avant : { statut: "erreur", produits: [], erreur: e.message }));
      });
    return () => controle.abort();
  }, [essai]);

  const valeur = { ...etat, recharger: () => setEssai((n) => n + 1) };
  return <CatalogueContext.Provider value={valeur}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue() {
  const valeur = useContext(CatalogueContext);
  if (!valeur) throw new Error("useCatalogue doit être utilisé dans <CatalogueProvider>");
  return valeur;
}
