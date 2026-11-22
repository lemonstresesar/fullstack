import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as P from "./panier.js"; // la logique du chapitre 13, réutilisée SANS changement
import { useCatalogue } from "./CatalogueContext.jsx";

const CLE = "comptoir.react.panier.v1";
const PanierContext = createContext(null);

function lire() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE));
    return Array.isArray(brut)
      ? brut.map((l) => ({ id: Number(l.id), quantite: Number(l.quantite) }))
      : [];
  } catch {
    return [];
  }
}

export function PanierProvider({ children }) {
  const { produits } = useCatalogue();
  const [panier, setPanier] = useState(lire); // lire est appelée UNE fois, au premier rendu

  useEffect(() => {
    try {
      localStorage.setItem(CLE, JSON.stringify(panier));
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [panier]);

  const lignes = useMemo(() => P.lignes(panier, produits), [panier, produits]);

  const valeur = useMemo(
    () => ({
      lignes,
      total: P.total(lignes),
      nombre: P.nombre(lignes),
      ajouter: (p) => setPanier((actuel) => P.ajouter(actuel, p.id, p.stock)),
      changer: (id, delta) =>
        setPanier((actuel) =>
          P.changer(actuel, id, delta, produits.find((p) => p.id === id)?.stock ?? 0),
        ),
      retirer: (id) => setPanier((actuel) => P.retirer(actuel, id)),
      vider: () => setPanier([]),
    }),
    [lignes, produits],
  );

  return <PanierContext.Provider value={valeur}>{children}</PanierContext.Provider>;
}

export function usePanier() {
  const valeur = useContext(PanierContext);
  if (!valeur) throw new Error("usePanier doit être utilisé dans <PanierProvider>");
  return valeur;
}
