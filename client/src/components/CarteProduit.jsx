import { Link } from "react-router-dom";
import { fcfa } from "../outils.js";
import { usePanier } from "../PanierContext.jsx";

export default function CarteProduit({ produit }) {
  const { ajouter } = usePanier();
  const rupture = produit.stock === 0;
  return (
    <li className="produit">
      <Link to={`/produit/${produit.id}`} aria-label={`Voir ${produit.nom}`}>
        <div className="visuel" style={{ "--t": produit.teinte }} />
      </Link>
      {rupture && <span className="etiquette etiquette--rupture">Rupture</span>}
      {!rupture && produit.stock <= 2 && <span className="etiquette">Dernières pièces</span>}
      <div className="corps">
        <span className="cat">{produit.categorie}</span>
        <h3>
          <Link to={`/produit/${produit.id}`}>{produit.nom}</Link>
        </h3>
        <span className="prix">{fcfa(produit.prix_fcfa)}</span>
        <button className="btn" type="button" disabled={rupture} onClick={() => ajouter(produit)}>
          {rupture ? "Indisponible" : "Ajouter au panier"}
        </button>
      </div>
    </li>
  );
}
