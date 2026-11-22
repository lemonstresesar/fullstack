import bcrypt from "bcryptjs";

const cout = () => Number(process.env.BCRYPT_COUT ?? 12);

// bcrypt ajoute tout seul un « sel » aléatoire : deux mots de passe identiques donnent deux empreintes différentes
export const hacher = (motDePasse) => bcrypt.hash(motDePasse, cout());
export const comparer = (motDePasse, empreinte) => bcrypt.compare(motDePasse, empreinte);

// Une empreinte « leurre » : quand l'e-mail n'existe pas, on compare quand même, pour que
// la réponse prenne le même temps. Sinon un attaquant devine quels e-mails ont un compte.
export const EMPREINTE_LEURRE = bcrypt.hashSync("leurre-sans-importance", 4);
