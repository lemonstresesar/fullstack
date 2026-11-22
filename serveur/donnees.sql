-- Les 8 produits de départ (les mêmes que le catalogue JSON des chapitres 9 à 19). IGNORE : relancer le script ne duplique rien.
INSERT IGNORE INTO produits (id, nom, categorie, prix_fcfa, stock, teinte) VALUES
  (1, 'Pagne wax 6 yards', 'Textile', 12000, 10, 28),
  (2, 'Sac en raphia', 'Artisanat', 8500, 5, 48),
  (3, 'Savon noir artisanal', 'Beauté', 1500, 50, 260),
  (4, 'Miel de Dschang 500 g', 'Épicerie', 4500, 20, 38),
  (5, 'Café de Foumban 250 g', 'Épicerie', 3000, 1, 18),
  (6, 'Beurre de karité 100 ml', 'Beauté', 2500, 15, 330),
  (7, 'Poivre de Penja 100 g', 'Épicerie', 3500, 12, 150),
  (8, 'Huile de palme rouge 1 L', 'Épicerie', 2000, 0, 8);
