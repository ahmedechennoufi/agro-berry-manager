// Store - Gestion du LocalStorage
const STORAGE_KEYS = {
  PRODUCTS: 'agro_products',
  MOVEMENTS: 'agro_movements',
  INVENTORY: 'agro_inventory',
  SETTINGS: 'agro_settings'
};

// Générer un ID unique
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Helpers
const getItem = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return [];
  }
};

const setItem = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error writing to localStorage:', e);
    return false;
  }
};

// ==========================================
// PRODUCTS
// ==========================================
export const getProducts = () => getItem(STORAGE_KEYS.PRODUCTS);

export const addProduct = (product) => {
  const products = getProducts();
  const newProduct = { ...product, id: generateId(), createdAt: new Date().toISOString() };
  products.push(newProduct);
  setItem(STORAGE_KEYS.PRODUCTS, products);
  return newProduct;
};

export const updateProduct = (id, updates) => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.PRODUCTS, products);
    return products[index];
  }
  return null;
};

export const deleteProduct = (id) => {
  const products = getProducts().filter(p => p.id !== id);
  setItem(STORAGE_KEYS.PRODUCTS, products);
  return true;
};

// ==========================================
// MOVEMENTS
// ==========================================
export const getMovements = () => getItem(STORAGE_KEYS.MOVEMENTS);

export const addMovement = (movement) => {
  const movements = getMovements();
  const newMovement = { ...movement, id: generateId(), createdAt: new Date().toISOString() };
  movements.push(newMovement);
  setItem(STORAGE_KEYS.MOVEMENTS, movements);
  return newMovement;
};

export const updateMovement = (id, updates) => {
  const movements = getMovements();
  const index = movements.findIndex(m => m.id === id);
  if (index !== -1) {
    movements[index] = { ...movements[index], ...updates, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.MOVEMENTS, movements);
    return movements[index];
  }
  return null;
};

export const deleteMovement = (id) => {
  const movements = getMovements().filter(m => m.id !== id);
  setItem(STORAGE_KEYS.MOVEMENTS, movements);
  return true;
};

// Bulk add movements (pour import)
export const addMovements = (newMovements) => {
  const movements = getMovements();
  const movementsWithIds = newMovements.map(m => ({
    ...m,
    id: m.id || generateId(),
    createdAt: m.createdAt || new Date().toISOString()
  }));
  movements.push(...movementsWithIds);
  setItem(STORAGE_KEYS.MOVEMENTS, movements);
  return movementsWithIds;
};

// ==========================================
// INVENTORY (Stock initial par mois)
// ==========================================
export const getInventory = () => getItem(STORAGE_KEYS.INVENTORY);

export const setInventoryItem = (month, product, data) => {
  const inventory = getInventory();
  const key = `${month}_${product}`;
  const index = inventory.findIndex(i => i.key === key);
  
  const item = {
    key,
    month,
    product,
    ...data,
    updatedAt: new Date().toISOString()
  };
  
  if (index !== -1) {
    inventory[index] = item;
  } else {
    inventory.push(item);
  }
  
  setItem(STORAGE_KEYS.INVENTORY, inventory);
  return item;
};

export const getInventoryByMonth = (month) => {
  return getInventory().filter(i => i.month === month);
};

// ==========================================
// SETTINGS
// ==========================================
export const getSettings = () => {
  const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return settings ? JSON.parse(settings) : {};
};

export const setSetting = (key, value) => {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  return settings;
};

// ==========================================
// IMPORT / EXPORT
// ==========================================
export const exportAllData = () => {
  return {
    products: getProducts(),
    movements: getMovements(),
    inventory: getInventory(),
    settings: getSettings(),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
};

export const importAllData = (data) => {
  try {
    if (data.products) setItem(STORAGE_KEYS.PRODUCTS, data.products);
    if (data.movements) setItem(STORAGE_KEYS.MOVEMENTS, data.movements);
    if (data.inventory) setItem(STORAGE_KEYS.INVENTORY, data.inventory);
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    return true;
  } catch (e) {
    console.error('Error importing data:', e);
    return false;
  }
};

export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
  localStorage.removeItem(STORAGE_KEYS.INVENTORY);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  return true;
};

// ==========================================
// IMPORT FROM OLD APP
// ==========================================
export const importFromOldApp = () => {
  try {
    // Import products from old format
    const oldProducts = localStorage.getItem('products');
    if (oldProducts) {
      const products = JSON.parse(oldProducts).map(p => ({
        ...p,
        id: p.id || generateId()
      }));
      setItem(STORAGE_KEYS.PRODUCTS, products);
    }

    // Import movements from old format
    const oldMovements = localStorage.getItem('stockMovements');
    if (oldMovements) {
      const movements = JSON.parse(oldMovements).map(m => ({
        ...m,
        id: m.id || generateId()
      }));
      setItem(STORAGE_KEYS.MOVEMENTS, movements);
    }

    // Import inventory edits from old format
    const oldEdits = localStorage.getItem('stockHistoryEdits');
    if (oldEdits) {
      const edits = JSON.parse(oldEdits);
      const inventory = [];
      Object.entries(edits).forEach(([key, value]) => {
        const [month, ...productParts] = key.split('_');
        const product = productParts.join('_');
        inventory.push({
          key,
          month,
          product,
          agb1: parseFloat(value.agb1) || 0,
          agb2: parseFloat(value.agb2) || 0,
          agb3: parseFloat(value.agb3) || 0
        });
      });
      setItem(STORAGE_KEYS.INVENTORY, inventory);
    }

    return true;
  } catch (e) {
    console.error('Error importing from old app:', e);
    return false;
  }
};

// ==========================================
// CALCULATIONS
// ==========================================

// Calculer le stock global (magasin)
export const calculateGlobalStock = () => {
  const movements = getMovements();
  const stockMap = {};

  movements.forEach(m => {
    if (!m.product) return;
    if (!stockMap[m.product]) {
      stockMap[m.product] = { quantity: 0, totalValue: 0 };
    }

    if (m.type === 'entry') {
      stockMap[m.product].quantity += m.quantity || 0;
      stockMap[m.product].totalValue += (m.quantity || 0) * (m.price || 0);
    } else if (m.type === 'exit') {
      stockMap[m.product].quantity -= m.quantity || 0;
    }
  });

  return stockMap;
};

// Calculer le stock par ferme
export const calculateFarmStock = (farmId) => {
  const movements = getMovements();
  const inventory = getInventory();
  const stockMap = {};

  // Commencer avec l'inventaire de Décembre
  inventory.filter(i => i.month === 'DECEMBRE').forEach(inv => {
    const qty = farmId === 'AGRO BERRY 1' ? inv.agb1 :
                farmId === 'AGRO BERRY 2' ? inv.agb2 : inv.agb3;
    if (qty > 0) {
      stockMap[inv.product] = { quantity: qty, totalValue: 0 };
    }
  });

  // Ajouter les mouvements après le 25/12/2025
  movements.filter(m => m.date > '2025-12-25').forEach(m => {
    if (!m.product) return;
    if (!stockMap[m.product]) {
      stockMap[m.product] = { quantity: 0, totalValue: 0 };
    }

    if (m.type === 'exit' && m.farm === farmId) {
      stockMap[m.product].quantity += m.quantity || 0;
    } else if (m.type === 'consumption' && m.farm === farmId) {
      stockMap[m.product].quantity -= m.quantity || 0;
    } else if (m.type === 'transfer-in' && m.toFarm === farmId) {
      stockMap[m.product].quantity += m.quantity || 0;
    } else if (m.type === 'transfer-out' && m.fromFarm === farmId) {
      stockMap[m.product].quantity -= m.quantity || 0;
    }
  });

  return stockMap;
};

// Calculer le prix moyen d'un produit
export const getAveragePrice = (productName) => {
  const movements = getMovements();
  const entries = movements.filter(m => 
    m.type === 'entry' && 
    m.product === productName && 
    m.price > 0
  );

  if (entries.length === 0) return 0;

  const totalQty = entries.reduce((s, m) => s + (m.quantity || 0), 0);
  const totalValue = entries.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0);

  return totalQty > 0 ? totalValue / totalQty : 0;
};
