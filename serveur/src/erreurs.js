// Une erreur qui porte un code HTTP (et, pour une validation, le détail champ par champ)
export class ErreurHttp extends Error {
  constructor(statut, message, details) {
    super(message);
    this.statut = statut;
    this.details = details;
  }
}
