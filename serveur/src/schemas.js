// Les règles de validation, écrites une fois avec zod : le schéma EST la documentation.
import { z } from "zod";
import { ErreurHttp } from "./erreurs.js";

const texte = (min, max, nom) =>
  z
    .string(`${nom} : du texte est attendu.`)
    .trim()
    .min(min, `${nom} : ${min} caractères minimum.`)
    .max(max, `${nom} : ${max} caractères maximum.`);
const entier = (min, max, nom) =>
  z
    .number(`${nom} : un nombre est attendu.`)
    .int(`${nom} : un entier est attendu.`)
    .min(min, `${nom} : minimum ${min}.`)
    .max(max, `${nom} : maximum ${max}.`);

export const schemaProduit = z.object({
  nom: texte(2, 120, "Le nom"),
  categorie: texte(2, 60, "La catégorie"),
  prix_fcfa: entier(1, 10_000_000, "Le prix"),
  stock: entier(0, 100_000, "Le stock").default(0),
  teinte: entier(0, 360, "La teinte").default(30),
}); // z.object IGNORE les champs inconnus : « role », « id »… n'entrent jamais

export const schemaInscription = z.object({
  nom: texte(2, 80, "Le nom"),
  email: z.string("L'e-mail : du texte est attendu.").trim().toLowerCase().max(190).pipe(z.email("L'e-mail n'est pas valide.")),
  // bcrypt ne lit que les 72 premiers octets : on refuse plus long plutôt que d'en ignorer une partie
  mot_de_passe: z
    .string("Le mot de passe : du texte est attendu.")
    .min(10, "Le mot de passe : 10 caractères minimum.")
    .max(72, "Le mot de passe : 72 caractères maximum."),
});

export const schemaConnexion = z.object({
  email: z.string("E-mail attendu.").trim().toLowerCase(),
  mot_de_passe: z.string("Mot de passe attendu.").max(72),
});

// La commande : le client n'envoie QUE des identifiants et des quantités. Jamais un prix.
const tel = z
  .string("Le téléphone : du texte est attendu.")
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(/^(\+?237)?6\d{8}$/, "Le téléphone : 9 chiffres commençant par 6."))
  .transform((v) => v.slice(-9)); // on range toujours les 9 chiffres, sans indicatif

export const schemaCommande = z.object({
  client: z.object({ nom: texte(2, 80, "Le nom"), tel, quartier: texte(2, 80, "Le quartier") }),
  lignes: z
    .array(z.object({ id: entier(1, 1_000_000_000, "L'identifiant"), quantite: entier(1, 20, "La quantité") }))
    .min(1, "Le panier est vide.")
    .max(20, "20 lignes au maximum.")
    .refine((l) => new Set(l.map((x) => x.id)).size === l.length, "Une seule ligne par produit."),
});

export const schemaStatut = z.object({
  statut: z.enum(["confirmee", "livree", "annulee"], "Statut attendu : confirmee, livree ou annulee."),
});

// Valide ou lance une ErreurHttp 400. Les erreurs imbriquées gardent leur chemin : « client.nom », « lignes ».
export function exiger(schema, corps) {
  const r = schema.safeParse(corps ?? {});
  if (r.success) return r.data;
  const details = {};
  for (const probleme of r.error.issues) (details[probleme.path.join(".") || "corps"] ??= []).push(probleme.message);
  throw new ErreurHttp(400, "Données invalides.", details);
}
