// Store - Gestion du LocalStorage
const STORAGE_KEYS = {
  PRODUCTS: 'products',
  MOVEMENTS: 'stockMovements',
  INVENTORY: 'stockHistoryEdits',
  MELANGE_LOG: 'melangeLogV5',
  MELANGES_SAUVEGARDES: 'melangesSauvegardesV1',
  ALL_DATA: 'allDataV5'
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const getItem = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setItem = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
};

// PRODUCTS
export const getProducts = () => getItem(STORAGE_KEYS.PRODUCTS, []);
export const addProduct = (product) => {
  const products = getProducts();
  const newProduct = { ...product, id: generateId() };
  products.push(newProduct);
  setItem(STORAGE_KEYS.PRODUCTS, products);
  return newProduct;
};
export const updateProduct = (id, updates) => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates };
    setItem(STORAGE_KEYS.PRODUCTS, products);
  }
};
export const deleteProduct = (id) => {
  setItem(STORAGE_KEYS.PRODUCTS, getProducts().filter(p => p.id !== id));
};

// MOVEMENTS
export const getMovements = () => getItem(STORAGE_KEYS.MOVEMENTS, []);
export const addMovement = (movement) => {
  const movements = getMovements();
  const newMovement = { ...movement, id: generateId(), createdAt: new Date().toISOString() };
  movements.push(newMovement);
  setItem(STORAGE_KEYS.MOVEMENTS, movements);
  return newMovement;
};
export const addMovements = (newMovements) => {
  const movements = getMovements();
  const withIds = newMovements.map(m => ({ ...m, id: m.id || generateId() }));
  movements.push(...withIds);
  setItem(STORAGE_KEYS.MOVEMENTS, movements);
  return withIds;
};
export const updateMovement = (id, updates) => {
  const movements = getMovements();
  const index = movements.findIndex(m => m.id === id);
  if (index !== -1) {
    movements[index] = { ...movements[index], ...updates };
    setItem(STORAGE_KEYS.MOVEMENTS, movements);
  }
};
export const deleteMovement = (id) => {
  setItem(STORAGE_KEYS.MOVEMENTS, getMovements().filter(m => m.id !== id));
};

// INVENTORY
export const getInventory = () => getItem(STORAGE_KEYS.INVENTORY, {});
export const setInventoryItem = (month, product, data) => {
  const inventory = getInventory();
  inventory[`${month}_${product}`] = data;
  setItem(STORAGE_KEYS.INVENTORY, inventory);
};
export const getInventoryByMonth = (month) => {
  const inventory = getInventory();
  const result = [];
  Object.entries(inventory).forEach(([key, value]) => {
    if (key.startsWith(`${month}_`)) {
      result.push({ product: key.replace(`${month}_`, ''), ...value });
    }
  });
  return result;
};

// MELANGES
export const getMelangeLog = () => getItem(STORAGE_KEYS.MELANGE_LOG, []);
export const addMelangeLog = (melange) => {
  const log = getMelangeLog();
  log.push({ ...melange, id: generateId(), date: new Date().toISOString() });
  setItem(STORAGE_KEYS.MELANGE_LOG, log);
};
export const getMelangesSauvegardes = () => getItem(STORAGE_KEYS.MELANGES_SAUVEGARDES, []);
export const saveMelangePersonnalise = (melange) => {
  const melanges = getMelangesSauvegardes();
  melanges.push({ ...melange, id: generateId() });
  setItem(STORAGE_KEYS.MELANGES_SAUVEGARDES, melanges);
};
export const deleteMelangePersonnalise = (id) => {
  setItem(STORAGE_KEYS.MELANGES_SAUVEGARDES, getMelangesSauvegardes().filter(m => m.id !== id));
};

// ALL DATA (Coûts)
export const getAllData = () => getItem(STORAGE_KEYS.ALL_DATA, getDefaultAllData());
export const setAllData = (data) => setItem(STORAGE_KEYS.ALL_DATA, data);

function getDefaultAllData() {
  const data = {};
  ['Agro Berry 1', 'Agro Berry 2', 'Agro Berry 3'].forEach(ferme => {
    data[ferme] = {};
    ['Myrtille', 'Fraise'].forEach(culture => {
      data[ferme][culture] = {};
      ['Bourdons', 'Engrais Poudre Sol', 'Engrais Poudre Hydroponic', 'Engrais Foliaire', 'Pesticides'].forEach(cat => {
        data[ferme][culture][cat] = [];
      });
    });
  });
  return data;
}

// IMPORT / EXPORT
export const exportAllData = () => ({
  products: getProducts(),
  movements: getMovements(),
  inventory: getInventory(),
  melangeLog: getMelangeLog(),
  melangesSauvegardes: getMelangesSauvegardes(),
  allData: getAllData(),
  exportDate: new Date().toISOString(),
  version: '2.0'
});

export const importAllData = (data) => {
  try {
    if (data.products) setItem(STORAGE_KEYS.PRODUCTS, data.products);
    if (data.movements) setItem(STORAGE_KEYS.MOVEMENTS, data.movements);
    if (data.inventory) setItem(STORAGE_KEYS.INVENTORY, data.inventory);
    if (data.melangeLog) setItem(STORAGE_KEYS.MELANGE_LOG, data.melangeLog);
    if (data.melangesSauvegardes) setItem(STORAGE_KEYS.MELANGES_SAUVEGARDES, data.melangesSauvegardes);
    if (data.allData) setItem(STORAGE_KEYS.ALL_DATA, data.allData);
    return true;
  } catch (e) {
    return false;
  }
};

export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};

// CALCULATIONS
export const calculateGlobalStock = () => {
  const movements = getMovements();
  const stockMap = {};
  movements.forEach(m => {
    if (!m.product) return;
    if (!stockMap[m.product]) stockMap[m.product] = { quantity: 0, totalValue: 0, entries: 0 };
    if (m.type === 'entry') {
      stockMap[m.product].quantity += m.quantity || 0;
      stockMap[m.product].totalValue += (m.quantity || 0) * (m.price || 0);
      stockMap[m.product].entries += m.quantity || 0;
    } else if (m.type === 'exit') {
      stockMap[m.product].quantity -= m.quantity || 0;
    }
  });
  Object.keys(stockMap).forEach(key => {
    stockMap[key].avgPrice = stockMap[key].entries > 0 ? stockMap[key].totalValue / stockMap[key].entries : 0;
  });
  return stockMap;
};

export const calculateFarmStock = (farmId) => {
  const movements = getMovements();
  const inventory = getInventory();
  const stockMap = {};
  
  Object.entries(inventory).forEach(([key, value]) => {
    if (key.startsWith('DECEMBRE_')) {
      const product = key.replace('DECEMBRE_', '');
      const qty = farmId === 'AGRO BERRY 1' ? value.agb1 : farmId === 'AGRO BERRY 2' ? value.agb2 : value.agb3;
      if (qty > 0) stockMap[product] = { quantity: qty };
    }
  });

  movements.filter(m => m.date > '2025-12-25').forEach(m => {
    if (!m.product) return;
    if (!stockMap[m.product]) stockMap[m.product] = { quantity: 0 };
    if (m.type === 'exit' && m.farm === farmId) stockMap[m.product].quantity += m.quantity || 0;
    else if (m.type === 'consumption' && m.farm === farmId) stockMap[m.product].quantity -= m.quantity || 0;
    else if (m.type === 'transfer-in' && m.toFarm === farmId) stockMap[m.product].quantity += m.quantity || 0;
    else if (m.type === 'transfer-out' && m.fromFarm === farmId) stockMap[m.product].quantity -= m.quantity || 0;
  });
  return stockMap;
};

export const getAveragePrice = (productName) => {
  const entries = getMovements().filter(m => m.type === 'entry' && m.product?.toUpperCase() === productName?.toUpperCase() && m.price > 0);
  if (entries.length === 0) return 0;
  const totalQty = entries.reduce((s, m) => s + (m.quantity || 0), 0);
  const totalValue = entries.reduce((s, m) => s + (m.quantity || 0) * (m.price || 0), 0);
  return totalQty > 0 ? totalValue / totalQty : 0;
};
