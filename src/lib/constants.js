// FERMES
export const FARMS = [
  { id: 'AGRO BERRY 1', name: 'Agro Berry 1', short: 'AGB1', color: 'blue', hectares: 24 },
  { id: 'AGRO BERRY 2', name: 'Agro Berry 2', short: 'AGB2', color: 'orange', hectares: 24 },
  { id: 'AGRO BERRY 3', name: 'Agro Berry 3', short: 'AGB3', color: 'green', hectares: 32 }
];

// SUPERFICIES
export const SUPERFICIES = {
  'Agro Berry 1': {
    'Pesticides': { sept: 15.96, reste: 21.15 },
    'Engrais Foliaire': { sept: 15.96, reste: 21.15 },
    'Engrais Poudre Hydroponic': { sept: 3.94, reste: 9.13 },
    'Engrais Poudre Sol': { sept: 12.02, reste: 12.02 },
    'Bourdons': { sept: 21.15, reste: 21.15 }
  },
  'Agro Berry 2': {
    'Pesticides': { sept: 21, reste: 24 },
    'Engrais Foliaire': { sept: 21, reste: 24 },
    'Engrais Poudre Hydroponic': { sept: 11.78, reste: 11.78 },
    'Engrais Poudre Sol': { sept: 9.22, reste: 12.22 },
    'Bourdons': { sept: 24, reste: 24 }
  },
  'Agro Berry 3': {
    'Pesticides': { sept: 29.7, reste: 29.7 },
    'Engrais Foliaire': { sept: 29.7, reste: 29.7 },
    'Engrais Poudre Hydroponic': { sept: 29.7, reste: 29.7 },
    'Bourdons': { sept: 29.7, reste: 29.7 }
  }
};

// CATEGORIES STOCK
export const CATEGORIES = [
  { id: 'ENGRAIS', name: 'Engrais', icon: '🌱' },
  { id: 'PHYTOSANITAIRES', name: 'Phytosanitaires', icon: '🧪' },
  { id: 'ACIDES', name: 'Acides', icon: '⚗️' },
  { id: 'AUTRES', name: 'Autres', icon: '📁' }
];

// CATEGORIES COUT
export const COST_CATEGORIES = [
  { id: 'Bourdons', name: 'Bourdons', icon: '🐝' },
  { id: 'Engrais Poudre Sol', name: 'Engrais Sol', icon: '🌍' },
  { id: 'Engrais Poudre Hydroponic', name: 'Engrais Hydro', icon: '💧' },
  { id: 'Engrais Foliaire', name: 'Engrais Foliaire', icon: '🌿' },
  { id: 'Pesticides', name: 'Pesticides', icon: '🧪' }
];

// CULTURES
export const CULTURES = [
  { id: 'Myrtille', name: 'Myrtille', icon: '🫐' },
  { id: 'Fraise', name: 'Fraise', icon: '🍓' }
];

export const CULTURES_PER_FARM = {
  'Agro Berry 1': ['Myrtille', 'Fraise'],
  'Agro Berry 2': ['Myrtille'],
  'Agro Berry 3': ['Myrtille']
};

// DESTINATIONS
export const DESTINATIONS = [
  { id: 'Sol', name: 'Sol', icon: '🌍' },
  { id: 'Hydro', name: 'Hydroponic', icon: '💧' },
  { id: 'Foliaire', name: 'Foliaire', icon: '🌿' }
];

// MOIS
export const MONTHS = [
  { id: 'SEPTEMBRE', name: 'Septembre', short: 'Sept', num: 9, idx: 0 },
  { id: 'OCTOBRE', name: 'Octobre', short: 'Oct', num: 10, idx: 1 },
  { id: 'NOVEMBRE', name: 'Novembre', short: 'Nov', num: 11, idx: 2 },
  { id: 'DECEMBRE', name: 'Décembre', short: 'Déc', num: 12, idx: 3 },
  { id: 'JANVIER', name: 'Janvier', short: 'Jan', num: 1, idx: 4 },
  { id: 'FEVRIER', name: 'Février', short: 'Fév', num: 2, idx: 5 },
  { id: 'MARS', name: 'Mars', short: 'Mars', num: 3, idx: 6 },
  { id: 'AVRIL', name: 'Avril', short: 'Avr', num: 4, idx: 7 },
  { id: 'MAI', name: 'Mai', short: 'Mai', num: 5, idx: 8 },
  { id: 'JUIN', name: 'Juin', short: 'Juin', num: 6, idx: 9 },
  { id: 'JUILLET', name: 'Juillet', short: 'Juil', num: 7, idx: 10 },
  { id: 'AOUT', name: 'Août', short: 'Août', num: 8, idx: 11 }
];

// TYPES MOUVEMENTS
export const MOVEMENT_TYPES = [
  { id: 'entry', name: 'Entrée', icon: '📥', color: 'green' },
  { id: 'exit', name: 'Sortie', icon: '📤', color: 'blue' },
  { id: 'consumption', name: 'Consommation', icon: '🔥', color: 'red' },
  { id: 'transfer-in', name: 'Transfert entrant', icon: '↩️', color: 'purple' },
  { id: 'transfer-out', name: 'Transfert sortant', icon: '↪️', color: 'orange' }
];

// UNITES
export const UNITS = [
  { id: 'KG', name: 'Kilogramme' },
  { id: 'L', name: 'Litre' },
  { id: 'UNITÉ', name: 'Unité' }
];

// MELANGES PREDEFINIS
export const MELANGES_PREDEFINIS = {
  'Myrtille Sol': {
    nom: 'Myrtille Sol',
    culture: 'Myrtille',
    type: 'Sol',
    icon: '🫐🌍',
    produits: [
      { nom: 'ACIDE PHOSPHORIQUE', qte: 35, unite: 'L' },
      { nom: 'ENTEC 21% (NOVATEC SOLUB 21%)', qte: 75, unite: 'kg' },
      { nom: 'MAP', qte: 100, unite: 'kg' },
      { nom: 'SULFATE DE POTASSE', qte: 75, unite: 'kg' },
      { nom: 'SULFATE MAGNESUIM', qte: 100, unite: 'kg' },
      { nom: 'VITAL CU', qte: 1.5, unite: 'L' },
      { nom: 'SULFATE DE ZINC', qte: 1, unite: 'kg' },
      { nom: 'NUTREL C', qte: 10, unite: 'kg' },
      { nom: 'BORTRAC', qte: 0.1, unite: 'L' },
      { nom: 'FEROXIM', qte: 8, unite: 'L' },
      { nom: 'UREE', qte: 35, unite: 'kg' }
    ]
  },
  'Myrtille Hydroponic': {
    nom: 'Myrtille Hydroponic',
    culture: 'Myrtille',
    type: 'Hydro',
    icon: '🫐💧',
    produits: [
      { nom: 'ACIDE PHOSPHORIQUE', qte: 25, unite: 'L' },
      { nom: 'FEROXIM', qte: 5, unite: 'L' },
      { nom: 'NITRATE DE CALCIUM', qte: 25, unite: 'kg' },
      { nom: 'ENTEC 21% (NOVATEC SOLUB 21%)', qte: 35, unite: 'kg' },
      { nom: 'MAP', qte: 50, unite: 'kg' },
      { nom: 'SULFATE MAGNESUIM', qte: 35, unite: 'kg' },
      { nom: 'SULFATE DE POTASSE', qte: 50, unite: 'kg' },
      { nom: 'UREE', qte: 25, unite: 'kg' },
      { nom: 'VITAL CU', qte: 0.5, unite: 'L' },
      { nom: 'SULFATE DE ZINC', qte: 0.5, unite: 'kg' },
      { nom: 'NUTREL C', qte: 5, unite: 'kg' },
      { nom: 'BORTRAC', qte: 0.1, unite: 'L' }
    ]
  },
  'Fraise': {
    nom: 'Fraise',
    culture: 'Fraise',
    type: 'Sol',
    icon: '🍓',
    produits: [
      { nom: 'NITRATE DE POTASSE', qte: 66, unite: 'kg' },
      { nom: 'ACIDE PHOSPHORIQUE', qte: 38, unite: 'L' },
      { nom: 'SULFATE MAGNESUIM', qte: 75, unite: 'kg' },
      { nom: 'SULFATE DE POTASSE', qte: 57, unite: 'kg' },
      { nom: 'ACIDE NITRIQUE', qte: 4, unite: 'L' }
    ]
  }
};

// PRODUITS CONNUS
export const PRODUITS_CONNUS = [
  { nom: 'SULFATE DE POTASSE', unite: 'kg', prix: 9.5 },
  { nom: 'ACIDE PHOSPHORIQUE', unite: 'L', prix: 10.8 },
  { nom: 'MAP', unite: 'kg', prix: 11.5 },
  { nom: 'NUTREL C', unite: 'kg', prix: 148 },
  { nom: 'UREE', unite: 'kg', prix: 6.5 },
  { nom: 'SULFATE MAGNESUIM', unite: 'kg', prix: 4.8 },
  { nom: 'NITRATE DE CALCIUM', unite: 'kg', prix: 6.8 },
  { nom: 'SULFATE DE ZINC', unite: 'kg', prix: 14.5 },
  { nom: 'FEROXIM', unite: 'L', prix: 101 },
  { nom: 'VITAL CU', unite: 'L', prix: 141.67 },
  { nom: 'BORTRAC', unite: 'L', prix: 109 },
  { nom: 'ENTEC 21% (NOVATEC SOLUB 21%)', unite: 'kg', prix: 7 },
  { nom: 'NITRATE DE POTASSE', unite: 'kg', prix: 13 },
  { nom: 'ACIDE NITRIQUE', unite: 'L', prix: 7.5 },
  { nom: 'FERRILENE', unite: 'kg', prix: 102 }
];

// GET SUPERFICIE
export const getSuperficie = (ferme, cat, moisIdx = 4) => {
  const fermeName = ferme.includes('1') ? 'Agro Berry 1' : ferme.includes('2') ? 'Agro Berry 2' : 'Agro Berry 3';
  const catSup = SUPERFICIES[fermeName]?.[cat];
  if (!catSup) return 24;
  return moisIdx === 0 ? catSup.sept : catSup.reste;
};

// GET PRODUCT PRICE
export const getProductPrice = (name) => {
  const found = PRODUITS_CONNUS.find(p => p.nom.toUpperCase() === name?.toUpperCase());
  return found?.prix || 0;
};
