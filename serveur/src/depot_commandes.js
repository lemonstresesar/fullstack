import { ErreurHttp } from "./erreurs.js";

// Les changements de statut permis : une commande livrée ou annulée est FINIE.
const TRANSITIONS = {
  nouvelle: ["confirmee", "annulee"],
  confirmee: ["livree", "annulee"],
  livree: [],
  annulee: [],
};

export function creerDepotCommandes(pool) {
  async function trouver(id, base = pool) {
    const [[commande]] = await base.query(
      "SELECT id, nom_client, telephone, quartier, statut, total_fcfa, cree_le FROM commandes WHERE id = ?", [id]);
    if (!commande) return null;
    const [lignes] = await base.query(
      "SELECT produit_id, nom_produit, prix_unitaire_fcfa, quantite FROM commande_lignes WHERE commande_id = ?", [id]);
    return { ...commande, lignes };
  }

  return {
    trouver,

    // TOUT ou RIEN : si une seule étape échoue, rien n'est enregistré (transaction)
    async creer({ client, lignes }) {
      const cx = await pool.getConnection();
      try {
        await cx.beginTransaction();
        // FOR UPDATE verrouille ces produits jusqu'à la fin : deux clients ne peuvent pas se partager le même dernier article
        const [produits] = await cx.query(
          "SELECT id, nom, prix_fcfa, stock FROM produits WHERE id IN (?) FOR UPDATE", [lignes.map((l) => l.id)]);
        const parId = new Map(produits.map((p) => [p.id, p]));

        const problemes = {};
        for (const l of lignes) {
          const p = parId.get(l.id);
          if (!p) problemes[`lignes.${l.id}`] = [`Le produit n° ${l.id} n'existe pas.`];
          else if (l.quantite > p.stock) problemes[`lignes.${l.id}`] = [`${p.nom} : ${p.stock} en stock seulement.`];
        }
        if (Object.keys(problemes).length) {
          const manque = lignes.some((l) => !parId.has(l.id));
          throw new ErreurHttp(manque ? 400 : 409, manque ? "Produit inconnu." : "Stock insuffisant.", problemes);
        }

        // Le prix vient de la BASE, jamais du client
        const total = lignes.reduce((s, l) => s + parId.get(l.id).prix_fcfa * l.quantite, 0);
        const [r] = await cx.query(
          "INSERT INTO commandes (nom_client, telephone, quartier, total_fcfa) VALUES (?, ?, ?, ?)",
          [client.nom, client.tel, client.quartier, total]);
        for (const l of lignes) {
          const p = parId.get(l.id);
          await cx.query(
            "INSERT INTO commande_lignes (commande_id, produit_id, nom_produit, prix_unitaire_fcfa, quantite) VALUES (?, ?, ?, ?, ?)",
            [r.insertId, p.id, p.nom, p.prix_fcfa, l.quantite]);
          await cx.query("UPDATE produits SET stock = stock - ? WHERE id = ?", [l.quantite, p.id]);
        }
        await cx.commit();
        return r.insertId;
      } catch (erreur) {
        await cx.rollback();
        throw erreur;
      } finally {
        cx.release(); // la connexion retourne au pool, quoi qu'il arrive
      }
    },

    // Deux requêtes (les commandes, puis TOUTES leurs lignes), et non une par commande
    async lister({ statut } = {}) {
      const [commandes] = await pool.query(
        `SELECT id, nom_client, telephone, quartier, statut, total_fcfa, cree_le FROM commandes
         ${statut ? "WHERE statut = ?" : ""} ORDER BY id DESC LIMIT 100`,
        statut ? [statut] : []);
      if (!commandes.length) return [];
      const [lignes] = await pool.query(
        "SELECT commande_id, produit_id, nom_produit, prix_unitaire_fcfa, quantite FROM commande_lignes WHERE commande_id IN (?)",
        [commandes.map((c) => c.id)]);
      return commandes.map((c) => ({
        ...c,
        lignes: lignes.filter((l) => l.commande_id === c.id).map(({ commande_id, ...reste }) => reste),
      }));
    },

    async changerStatut(id, nouveau) {
      const cx = await pool.getConnection();
      try {
        await cx.beginTransaction();
        const [[actuelle]] = await cx.query("SELECT statut FROM commandes WHERE id = ? FOR UPDATE", [id]);
        if (!actuelle) throw new ErreurHttp(404, "Commande introuvable.");
        if (!TRANSITIONS[actuelle.statut].includes(nouveau))
          throw new ErreurHttp(409, `Une commande « ${actuelle.statut} » ne peut pas passer à « ${nouveau} ».`);
        await cx.query("UPDATE commandes SET statut = ? WHERE id = ?", [nouveau, id]);
        if (nouveau === "annulee") {
          // Annuler remet les articles en stock
          await cx.query(
            "UPDATE produits p JOIN commande_lignes l ON l.produit_id = p.id SET p.stock = p.stock + l.quantite WHERE l.commande_id = ?",
            [id]);
        }
        await cx.commit();
        return trouver(id, cx);
      } catch (erreur) {
        await cx.rollback();
        throw erreur;
      } finally {
        cx.release();
      }
    },
  };
}
