/**
 * Le matching des entreprises (TaaS) ne propose que les REPS du réseau HARX.
 * Les agents salariés d'un centre d'appels ou d'un accueil (secrétaires créées depuis l'application Téléphonie) ont aussi une
 * fiche `agents`, mais portent `employerCompanyId` : ils travaillent pour leur employeur et ne sont pas des REPS à placer.
 */
export const REPS_ONLY = Object.freeze({ employerCompanyId: null }); // `null` couvre le champ absent comme le champ vide

export function isNetworkRep(agent) {
  return !agent || agent.employerCompanyId == null;
}

/** Ajoute la condition « REP du réseau » à un filtre existant. */
export function repsOnly(filter = {}) {
  return { ...filter, ...REPS_ONLY };
}
