import { Link, Route, Routes } from "react-router-dom";
import Entete from "./components/Entete.jsx";
import RetourEnHaut from "./components/RetourEnHaut.jsx";
import Catalogue from "./pages/Catalogue.jsx";
import Produit from "./pages/Produit.jsx";
import Panier from "./pages/Panier.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <>
      <RetourEnHaut />
      <Entete />
      <main>
        <Routes>
          <Route path="/" element={<Catalogue />} />
          <Route path="/produit/:id" element={<Produit />} />
          <Route path="/panier" element={<Panier />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="*"
            element={
              <section className="page">
                <h1>Page introuvable</h1>
                <p>
                  <Link to="/">Retour au catalogue</Link>
                </p>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="pied">
        <p>
          <strong>Comptoir.</strong> Maquette pédagogique : le numéro WhatsApp du code est fictif. ·{" "}
          <Link to="/admin">Espace boutique</Link>
        </p>
      </footer>
    </>
  );
}
