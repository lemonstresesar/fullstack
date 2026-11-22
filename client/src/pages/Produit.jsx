import { Link, useParams } from "react-router-dom";
import { useCatalogue } from "../CatalogueContext.jsx";
import { usePanier } from "../PanierContext.jsx";
import { fcfa } from "../outils.js";

export default function Produit() {
  const { id } = useParams(); // le « :id » de la route /produit/:id (toujours du texte)
  const { statut, produits } = useCatalogue();
  const { ajouter } = usePanier();

  if (statut === "chargement")
    return (
      <p className="etat" role="status">
        Chargement…
      </p>
    );
  const produit = produits.find((p) => p.id === Number(id));
  if (!produit) {
    return (
      <section className="page">
        <h1>Produit introuvable</h1>
        <p>
          <Link to="/">Retour au catalogue</Link>
        </p>
      </section>
    );
  }
  return (
    <section className="page fiche">
      <div className="visuel grand" style={{ "--t": produit.teinte }} />
      <div>
        <p className="cat">{produit.categorie}</p>
        <h1>{produit.nom}</h1>
        <p className="prix grand-prix">{fcfa(produit.prix_fcfa)}</p>
        <p>{produit.stock > 0 ? `${produit.stock} en stock` : "Rupture de stock"}</p>
        <p>
          <button className="btn" disabled={produit.stock === 0} onClick={() => ajouter(produit)}>
            Ajouter au panier
          </button>{" "}
          <Link to="/">← Catalogue</Link>
        </p>
      </div>
    </section>
  );
}
