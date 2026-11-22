import { Link, NavLink } from "react-router-dom";
import { usePanier } from "../PanierContext.jsx";

export default function Entete() {
  const { nombre } = usePanier();
  return (
    <header className="entete">
      <Link className="logo" to="/">
        Comptoir<span>.</span>
      </Link>
      <nav className="actions" aria-label="Principal">
        {/* NavLink ajoute tout seul aria-current="page" et la classe « active » sur le lien courant */}
        <NavLink to="/" end>
          Catalogue
        </NavLink>
        <NavLink to="/panier" className="btn-panier">
          Panier{" "}
          <span className="badge" aria-live="polite">
            {nombre}
          </span>
        </NavLink>
      </nav>
    </header>
  );
}
