export function creerDepotUtilisateurs(pool) {
  return {
    async creer({ nom, email, empreinte, role = "client" }) {
      const [r] = await pool.query(
        "INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role) VALUES (?, ?, ?, ?)",
        [nom, email, empreinte, role],
      );
      return r.insertId;
    },
    async parEmail(email) {
      const [l] = await pool.query("SELECT id, nom, email, mot_de_passe_hash, role FROM utilisateurs WHERE email = ?", [email]);
      return l[0] ?? null;
    },
    async parId(id) {
      // On ne sélectionne JAMAIS l'empreinte quand on n'en a pas besoin
      const [l] = await pool.query("SELECT id, nom, email, role FROM utilisateurs WHERE id = ?", [id]);
      return l[0] ?? null;
    },
  };
}
