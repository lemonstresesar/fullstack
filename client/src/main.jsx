import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { CatalogueProvider } from "./CatalogueContext.jsx";
import { PanierProvider } from "./PanierContext.jsx";
import "./styles.css";

// HashRouter : l'adresse devient index.html#/panier. Aucune configuration n'est nécessaire
// sur un hébergeur statique (GitHub Pages), même en rechargeant la page.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <CatalogueProvider>
        <PanierProvider>
          <App />
        </PanierProvider>
      </CatalogueProvider>
    </HashRouter>
  </StrictMode>,
);
