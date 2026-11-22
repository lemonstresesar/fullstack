import { ErreurHttp } from "../erreurs.js";
import { verifier } from "./jetons.js";

// 401 = « je ne sais pas qui tu es » ; 403 = « je sais qui tu es, mais tu n'as pas le droit »
export const exigerConnexion = (cle) => (req, res, next) => {
  const [type, jeton] = (req.get("Authorization") ?? "").split(" ");
  if (type !== "Bearer" || !jeton) throw new ErreurHttp(401, "Connexion requise.");
  try {
    const { sub, role } = verifier(jeton, cle);
    req.utilisateur = { id: Number(sub), role };
    next();
  } catch {
    throw new ErreurHttp(401, "Jeton invalide ou expiré."); // même message : on ne dit pas pourquoi
  }
};

export const exigerRole = (role) => (req, res, next) => {
  if (req.utilisateur?.role !== role) throw new ErreurHttp(403, "Action réservée aux administrateurs.");
  next();
};
