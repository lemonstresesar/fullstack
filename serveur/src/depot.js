// Le « dépôt » : TOUT le SQL est ici, nulle part ailleurs. Les routes ne connaissent pas SQL.
// RÈGLE : les valeurs venant de l'extérieur passent par « ? ». On ne les colle JAMAIS dans le texte SQL.
const COLONNES = "id, nom, categorie, prix_fcfa, stock, teinte";
const echapperLike = (s) => s.replace(/[\\%_]/g, "\\$&"); // « % » et « _ » sont des jokers dans LIKE

export function creerDepot(pool) {
  return {
    async lister({ categorie, q, limite = 50, decalage = 0 } = {}) {
      const conditions = [];
      const valeurs = [];
      if (categorie) {
        conditions.push("categorie = ?");
        valeurs.push(categorie);
      }
      if (q) {
        conditions.push("nom LIKE ?");
        valeurs.push(`%${echapperLike(q)}%`);
      }
      // Seules des conditions écrites ICI (jamais l'utilisateur) entrent dans le texte SQL
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM produits ${where}`, valeurs);
      const [lignes] = await pool.query(
        `SELECT ${COLONNES} FROM produits ${where} ORDER BY id LIMIT ? OFFSET ?`,
        [...valeurs, limite, decalage],
      );
      return { lignes, total };
    },
    async trouver(id) {
      const [lignes] = await pool.query(`SELECT ${COLONNES} FROM produits WHERE id = ?`, [id]);
      return lignes[0] ?? null;
    },
    async creer(p) {
      const [r] = await pool.query(
        "INSERT INTO produits (nom, categorie, prix_fcfa, stock, teinte) VALUES (?, ?, ?, ?, ?)",
        [p.nom, p.categorie, p.prix_fcfa, p.stock, p.teinte],
      );
      return r.insertId;
    },
    async modifier(id, p) {
      const [r] = await pool.query(
        "UPDATE produits SET nom = ?, categorie = ?, prix_fcfa = ?, stock = ?, teinte = ? WHERE id = ?",
        [p.nom, p.categorie, p.prix_fcfa, p.stock, p.teinte, id],
      );
      return r.affectedRows; // 0 : aucun produit n'a cet identifiant
    },
    async supprimer(id) {
      const [r] = await pool.query("DELETE FROM produits WHERE id = ?", [id]);
      return r.affectedRows;
    },
  };
}
