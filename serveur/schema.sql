CREATE TABLE IF NOT EXISTS produits (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom        VARCHAR(120) NOT NULL UNIQUE,
  categorie  VARCHAR(60)  NOT NULL,
  prix_fcfa  INT UNSIGNED NOT NULL,
  stock      INT UNSIGNED NOT NULL DEFAULT 0,
  teinte     SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  cree_le    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prix_positif CHECK (prix_fcfa > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Les comptes. On ne stocke JAMAIS le mot de passe : seulement son empreinte (hash) bcrypt.
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom               VARCHAR(80)  NOT NULL,
  email             VARCHAR(190) NOT NULL UNIQUE,
  mot_de_passe_hash VARCHAR(100) NOT NULL,
  role              ENUM('client','admin') NOT NULL DEFAULT 'client',
  cree_le           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une commande, et ses lignes. Les lignes COPIENT le nom et le prix au moment de l'achat :
-- si le prix du produit change demain, la commande d'hier ne change pas.
CREATE TABLE IF NOT EXISTS commandes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom_client  VARCHAR(80)  NOT NULL,
  telephone   CHAR(9)      NOT NULL,
  quartier    VARCHAR(80)  NOT NULL,
  statut      ENUM('nouvelle','confirmee','livree','annulee') NOT NULL DEFAULT 'nouvelle',
  total_fcfa  INT UNSIGNED NOT NULL,
  cree_le     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commande_lignes (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commande_id        INT UNSIGNED NOT NULL,
  produit_id         INT UNSIGNED NOT NULL,
  nom_produit        VARCHAR(120) NOT NULL,
  prix_unitaire_fcfa INT UNSIGNED NOT NULL,
  quantite           INT UNSIGNED NOT NULL,
  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id)  REFERENCES produits(id)  ON DELETE RESTRICT  -- on ne supprime pas un produit déjà commandé
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
