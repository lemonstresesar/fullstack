import jwt from "jsonwebtoken";

const ALGO = "HS256";

// Le jeton contient : sub (id), role, et une date d'expiration. Il est SIGNÉ, pas chiffré : tout le monde peut le lire.
export function signer(utilisateur, cle, duree = "2h") {
  return jwt.sign({ sub: String(utilisateur.id), role: utilisateur.role }, cle, {
    algorithm: ALGO,
    expiresIn: duree,
  });
}

// « algorithms » est OBLIGATOIRE : sans cette liste, un jeton « sans signature » (alg: none) pourrait être accepté
export function verifier(jeton, cle) {
  return jwt.verify(jeton, cle, { algorithms: [ALGO] });
}
