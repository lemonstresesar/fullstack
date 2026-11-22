import { useSearchParams } from "react-router-dom";
import { useCatalogue } from "../CatalogueContext.jsx";
import { parCategorie, trierParPrix } from "../outils.js";
import CarteProduit from "../components/CarteProduit.jsx";

export default function Catalogue() {
  const { statut, produits, erreur, recharger } = useCatalogue();
  // Les filtres vivent DANS L'ADRESSE (#/?categorie=Beauté&tri=croissant) : un lien partagé les conserve
  const [params, setParams] = useSearchParams();
  const categorie = params.get("categorie") ?? "";
  const tri = params.get("tri") ?? "";
  const texte = (params.get("q") ?? "").toLowerCase();

  function changer(cle, valeur) {
    const suivants = new URLSearchParams(params);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    setParams(suivants, { replace: true });
  }

  let visibles = categorie ? parCategorie(produits, categorie) : produits;
  visibles = visibles.filter((p) => p.nom.toLowerCase().includes(texte));
  if (tri) visibles = trierParPrix(visibles, tri);
  const categories = [...new Set(produits.map((p) => p.categorie))];

  return (
    <section className="catalogue">
      <h1>Catalogue</h1>
      <div className="barre-outils">
        <div className="champ">
          <label htmlFor="recherche">Rechercher</label>
          <input
            id="recherche"
            type="search"
            value={params.get("q") ?? ""}
            onChange={(e) => changer("q", e.target.value)}
          />
        </div>
        <div className="champ">
          <label htmlFor="tri">Trier</label>
          <select id="tri" value={tri} onChange={(e) => changer("tri", e.target.value)}>
            <option value="">Par défaut</option>
            <option value="croissant">Prix croissant</option>
            <option value="decroissant">Prix décroissant</option>
          </select>
        </div>
      </div>
      <div className="chips" role="group" aria-label="Catégories">
        {["", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={c === categorie}
            onClick={() => changer("categorie", c)}
          >
            {c || "Tout"}
          </button>
        ))}
      </div>

      {statut === "chargement" && (
        <p className="etat" role="status">
          Chargement…
        </p>
      )}
      {statut === "erreur" && (
        <p className="etat" role="alert">
          Impossible de charger le catalogue ({erreur}).{" "}
          <button type="button" className="chip" onClick={recharger}>
            Réessayer
          </button>
        </p>
      )}
      {statut === "ok" && (
        <>
          <p className="etat" role="status">
            {visibles.length ? `${visibles.length} produit(s)` : "Aucun produit ne correspond."}
          </p>
          <ul className="grille">
            {visibles.map((p) => (
              <CarteProduit key={p.id} produit={p} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
