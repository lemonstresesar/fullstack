import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Sur un site à pages, un changement de route ne recharge rien : le navigateur garde la position
// de défilement. Ce composant sans affichage remonte en haut à chaque changement de page.
export default function RetourEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
