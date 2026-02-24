// === FERMES ===
export const FARMS = [
  { id: 'AGRO BERRY 1', name: 'Agro Berry 1', short: 'AGB1', hectares: 24 },
  { id: 'AGRO BERRY 2', name: 'Agro Berry 2', short: 'AGB2', hectares: 24 },
  { id: 'AGRO BERRY 3', name: 'Agro Berry 3', short: 'AGB3', hectares: 29.7 }
];

// === CULTURES ===
export const CULTURES = [
  { id: 'Myrtille', name: 'Myrtille', icon: '🫐' },
  { id: 'Fraise', name: 'Fraise', icon: '🍓' }
];

// === CULTURES PAR FERME ===
export const FARM_CULTURES = {
  'AGRO BERRY 1': ['Myrtille', 'Fraise'],
  'AGRO BERRY 2': ['Myrtille'],
  'AGRO BERRY 3': ['Myrtille']
};

// === SUPERFICIES DETAILLEES PAR FERME/CULTURE/TYPE ===
export const SUPERFICIES_DETAIL = {
  'AGRO BERRY 1': {
    'Myrtille': {
      'Sol': 12.02,
      'Hydro': 9.13,
      'Foliaire': 21.15,
      'Pesticides': 21.15,
      'Bourdons': 21.15
    },
    'Fraise': {
      'Sol': 15.5,
      'Foliaire': 15.5,
      'Pesticides': 15.5,
      'Bourdons': 15.5
    }
  },
  'AGRO BERRY 2': {
    'Myrtille': {
      'Sol': 12.22,
      'Hydro': 11.78,
      'Foliaire': 24,
      'Pesticides': 24,
      'Bourdons': 24
    }
  },
  'AGRO BERRY 3': {
    'Myrtille': {
      'Hydro': 29.7,
      'Foliaire': 29.7,
      'Pesticides': 29.7,
      'Bourdons': 29.7
    }
  }
};

// === CATEGORIES ===
export const CATEGORIES = [
  { id: 'ENGRAIS', name: 'Engrais', icon: '🌱' },
  { id: 'PHYTOSANITAIRES', name: 'Phytosanitaires', icon: '💊' },
  { id: 'ACIDES', name: 'Acides', icon: '🧪' },
  { id: 'AUTRES', name: 'Autres', icon: '📦' },
  { id: 'INVESTISSEMENT', name: 'Investissement', icon: '🏗️' }
];

// === UNITES ===
export const UNITS = [
  { id: 'KG', name: 'Kilogramme (KG)' },
  { id: 'L', name: 'Litre (L)' },
  { id: 'UNITÉ', name: 'Unité' },
  { id: 'BOITE', name: 'Boîte' },
  { id: 'SAC', name: 'Sac' }
];

// === CATEGORIES COUT DE PRODUCTION ===
export const COST_CATEGORIES = [
  { id: 'Bourdons', name: 'Bourdons', icon: '🐝' },
  { id: 'Engrais Poudre Sol', name: 'Engrais Poudre Sol', icon: '🌍' },
  { id: 'Engrais Poudre Hydroponic', name: 'Engrais Poudre Hydroponic', icon: '💧' },
  { id: 'Engrais Foliaire', name: 'Engrais Foliaire', icon: '🍃' },
  { id: 'Pesticides', name: 'Pesticides', icon: '🧴' }
];

// === MOIS ===
export const MONTHS = [
  { id: 1, name: 'Janvier', short: 'Jan' },
  { id: 2, name: 'Février', short: 'Fév' },
  { id: 3, name: 'Mars', short: 'Mar' },
  { id: 4, name: 'Avril', short: 'Avr' },
  { id: 5, name: 'Mai', short: 'Mai' },
  { id: 6, name: 'Juin', short: 'Juin' },
  { id: 7, name: 'Juillet', short: 'Juil' },
  { id: 8, name: 'Août', short: 'Août' },
  { id: 9, name: 'Septembre', short: 'Sept' },
  { id: 10, name: 'Octobre', short: 'Oct' },
  { id: 11, name: 'Novembre', short: 'Nov' },
  { id: 12, name: 'Décembre', short: 'Déc' }
];

// === SUPERFICIES PAR FERME ET CATEGORIE (legacy) ===
export const SUPERFICIES = {
  'Agro Berry 1': {
    'Pesticides': { total: 24, reste: 24 },
    'Engrais Foliaire': { total: 24, reste: 24 },
    'Engrais Poudre Sol': { total: 12.02, reste: 12.02 },
    'Engrais Poudre Hydroponic': { total: 9.13, reste: 9.13 },
    'Bourdons': { total: 24, reste: 24 }
  },
  'Agro Berry 2': {
    'Pesticides': { total: 24, reste: 24 },
    'Engrais Foliaire': { total: 24, reste: 24 },
    'Engrais Poudre Sol': { total: 12.22, reste: 12.22 },
    'Engrais Poudre Hydroponic': { total: 11.78, reste: 11.78 },
    'Bourdons': { total: 24, reste: 24 }
  },
  'Agro Berry 3': {
    'Pesticides': { total: 29.7, reste: 29.7 },
    'Engrais Foliaire': { total: 29.7, reste: 29.7 },
    'Engrais Poudre Hydroponic': { total: 29.7, reste: 29.7 },
    'Bourdons': { total: 29.7, reste: 29.7 }
  }
};

// === MELANGES PREDEFINIS ===
export const MELANGES_PREDEFINIS = {
  'Myrtille Sol': {
    nom: 'Myrtille Sol',
    culture: 'Myrtille',
    type: 'Sol',
    produits: [
      { nom: 'ACIDE PHOSPHORIQUE', qte: 35, unite: 'L' },
      { nom: 'ACIDE SULFIRIQUE', qte: 35, unite: 'L' },
      { nom: 'ENTEC 21% (NOVATEC SOLUB 21%)', qte: 40, unite: 'kg' },
      { nom: 'MAP', qte: 40, unite: 'kg' },
      { nom: 'SULFATE MAGNESUIM', qte: 30, unite: 'kg' },
      { nom: 'SULFATE DE POTASSE', qte: 15, unite: 'kg' },
      { nom: 'FEROXIM', qte: 5, unite: 'kg' },
      { nom: 'MANVERT BIOMIX', qte: 2.5, unite: 'kg' },
      { nom: 'PERFECTOSE', qte: 3, unite: 'L' },
      { nom: 'ALGOBAZ', qte: 0.4, unite: 'kg' },
      { nom: 'SULFATE DE ZINC', qte: 0.5, unite: 'kg' },
      { nom: 'VITAL CU', qte: 1, unite: 'L' },
      { nom: 'BORTRAC', qte: 0.05, unite: 'L' }
    ]
  },
  'Myrtille Hydro': {
    nom: 'Myrtille Hydro',
    culture: 'Myrtille',
    type: 'Hydro',
    produits: [
      { nom: 'ACIDE PHOSPHORIQUE', qte: 25, unite: 'L' },
      { nom: 'ACIDE NITRIQUE', qte: 20, unite: 'L' },
      { nom: 'MAP', qte: 30, unite: 'kg' },
      { nom: 'NITRATE DE POTASSE', qte: 30, unite: 'kg' },
      { nom: 'SULFATE MAGNESUIM', qte: 25, unite: 'kg' },
      { nom: 'NITRATE DE CALCIUM', qte: 20, unite: 'kg' },
      { nom: 'FEROXIM', qte: 3, unite: 'kg' },
      { nom: 'MANVERT BIOMIX', qte: 2, unite: 'kg' }
    ]
  },
  'Fraise Sol': {
    nom: 'Fraise Sol',
    culture: 'Fraise',
    type: 'Sol',
    produits: [
      { nom: 'AMMONITRATE', qte: 30, unite: 'kg' },
      { nom: 'NITRATE DE POTASSE', qte: 50, unite: 'kg' },
      { nom: 'NITRATE DE MAGNESIUM', qte: 20, unite: 'kg' },
      { nom: 'NITRATE DE CALCIUM', qte: 40, unite: 'kg' },
      { nom: 'MAP', qte: 25, unite: 'kg' },
      { nom: 'SULFATE DE POTASSE', qte: 15, unite: 'kg' },
      { nom: 'FEROXIM', qte: 3, unite: 'kg' },
      { nom: 'MICROMIX', qte: 5, unite: 'kg' },
      { nom: 'ACIDE PHOSPHORIQUE', qte: 20, unite: 'L' }
    ]
  }
};

// === ALERT SETTINGS ===
export const ALERT_SETTINGS = {
  defaultThreshold: 10,
  highConsumptionMultiplier: 2
};

// === DESTINATIONS ===
export const DESTINATIONS = [
  { id: 'Sol', name: 'Sol', icon: '🌍' },
  { id: 'Hydro', name: 'Hydroponic', icon: '💧' },
  { id: 'Foliaire', name: 'Foliaire', icon: '🍃' },
  { id: 'Pesticide', name: 'Pesticide', icon: '🧪' }
];

// === PRODUITS CONNUS ===
export const PRODUITS_CONNUS = [];
