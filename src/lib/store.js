import initialData from './initialData.json';
import coutDataJson from './coutData.json';

const STORAGE_KEYS = {
  products: 'agro_products_v3',
  movements: 'agro_movements_v3',
  stockAB1: 'agro_stock_ab1_v3',
  stockAB2: 'agro_stock_ab2_v3',
  stockAB3: 'agro_stock_ab3_v3',
  suppliers: 'agro_suppliers_v3',
  consommations: 'agro_consommations_v3',
  melanges: 'agro_melanges_v3',
  inventory: 'agro_inventory_v3',
  coutData: 'agro_cout_data_v3',
  stockHistory: 'agro_stock_history_v3',
  initialized: 'agro_initialized_v3',
  dataVersion: 'agro_data_version'
};

// ⬇️ Increment this number each time initialData.json is updated
const CURRENT_DATA_VERSION = 54; // v5.3.1 - fix double AGB2

// === INITIALISATION ===
export const initializeData = () => {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.initialized);
  if (!isInitialized) {
    console.log('🚀 Initialisation des données...');
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(initialData.products || []));
    localStorage.setItem(STORAGE_KEYS.movements, JSON.stringify(initialData.movements || []));
    localStorage.setItem(STORAGE_KEYS.stockAB1, JSON.stringify(initialData.stockAB1 || []));
    localStorage.setItem(STORAGE_KEYS.stockAB2, JSON.stringify(initialData.stockAB2 || []));
    localStorage.setItem(STORAGE_KEYS.stockAB3, JSON.stringify(initialData.stockAB3 || []));
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(initialData.suppliers || []));
    localStorage.setItem(STORAGE_KEYS.consommations, JSON.stringify(initialData.consommations || []));
    localStorage.setItem(STORAGE_KEYS.melanges, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.coutData, JSON.stringify(coutDataJson.cultures || {}));
    localStorage.setItem(STORAGE_KEYS.initialized, 'true');
    localStorage.setItem(STORAGE_KEYS.dataVersion, String(CURRENT_DATA_VERSION));
    console.log('✅ Données initialisées');
  }
  
  // Auto-update: merge new data without erasing user data
  const savedVersion = parseInt(localStorage.getItem(STORAGE_KEYS.dataVersion) || '0');
  if (savedVersion < CURRENT_DATA_VERSION) {
    console.log(`🔄 Mise à jour données v${savedVersion} → v${CURRENT_DATA_VERSION}...`);
    
    // IDs that were in old versions but replaced in new version (must be removed)
    const obsoleteIdRanges = [[9000, 9041]]; // Old AGB2 aggregated data
    const isObsolete = (id) => obsoleteIdRanges.some(([min, max]) => id >= min && id <= max);
    
    // Merge movements: keep user-added ones + replace initialData ones
    const existingMovements = JSON.parse(localStorage.getItem(STORAGE_KEYS.movements) || '[]');
    const newMovements = initialData.movements || [];
    const newIds = new Set(newMovements.map(m => m.id));
    
    // Keep movements added manually by user (IDs not in initialData AND not obsolete)
    const userMovements = existingMovements.filter(m => !newIds.has(m.id) && !isObsolete(m.id));
    const mergedMovements = [...newMovements, ...userMovements];
    localStorage.setItem(STORAGE_KEYS.movements, JSON.stringify(mergedMovements));
    
    // Merge products: add new ones, keep existing
    const existingProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || '[]');
    const newProducts = initialData.products || [];
    const existingNames = new Set(existingProducts.map(p => p.name));
    const addedProducts = newProducts.filter(p => !existingNames.has(p.name));
    if (addedProducts.length > 0) {
      localStorage.setItem(STORAGE_KEYS.products, JSON.stringify([...existingProducts, ...addedProducts]));
    }
    
    localStorage.setItem(STORAGE_KEYS.dataVersion, String(CURRENT_DATA_VERSION));
    console.log(`✅ Mise à jour terminée: ${mergedMovements.length} mouvements (${userMovements.length} manuels conservés)`);
  }
  
  // Check if coutData exists, if not initialize it
  const coutData = localStorage.getItem(STORAGE_KEYS.coutData);
  if (!coutData) {
    localStorage.setItem(STORAGE_KEYS.coutData, JSON.stringify(coutDataJson.cultures || {}));
    console.log('✅ Données de coûts initialisées');
  }
};

// === HELPERS ===
const getItem = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
};

const setItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// === PRODUITS ===
export const getProducts = () => getItem(STORAGE_KEYS.products);

export const addProduct = (product) => {
  const products = getProducts();
  const newProduct = { ...product, id: Date.now() };
  products.push(newProduct);
  setItem(STORAGE_KEYS.products, products);
  return newProduct;
};

export const updateProduct = (id, updates) => {
  const products = getProducts().map(p => p.id === id ? { ...p, ...updates } : p);
  setItem(STORAGE_KEYS.products, products);
};

export const deleteProduct = (id) => {
  const products = getProducts().filter(p => p.id !== id);
  setItem(STORAGE_KEYS.products, products);
};

// === MOUVEMENTS ===
export const getMovements = () => getItem(STORAGE_KEYS.movements);

export const addMovement = (movement) => {
  const movements = getMovements();
  const newMovement = { ...movement, id: Date.now() };
  movements.push(newMovement);
  setItem(STORAGE_KEYS.movements, movements);
  return newMovement;
};

export const deleteMovement = (id) => {
  const movements = getMovements().filter(m => m.id !== id);
  setItem(STORAGE_KEYS.movements, movements);
};

export const updateMovement = (id, updates) => {
  const movements = getMovements();
  const index = movements.findIndex(m => m.id === id);
  if (index !== -1) {
    movements[index] = { ...movements[index], ...updates };
    setItem(STORAGE_KEYS.movements, movements);
  }
};

// === FOURNISSEURS ===
export const getSuppliers = () => getItem(STORAGE_KEYS.suppliers);

export const addSupplier = (name) => {
  const suppliers = getSuppliers();
  if (!suppliers.includes(name)) {
    suppliers.push(name);
    setItem(STORAGE_KEYS.suppliers, suppliers);
  }
};

// === STOCK INITIAL PAR FERME ===
export const getStockAB1 = () => getItem(STORAGE_KEYS.stockAB1);
export const getStockAB2 = () => getItem(STORAGE_KEYS.stockAB2);
export const getStockAB3 = () => getItem(STORAGE_KEYS.stockAB3);

export const getInitialStock = (farmId) => {
  if (farmId === 'AGRO BERRY 1' || farmId?.includes('1')) return getStockAB1();
  if (farmId === 'AGRO BERRY 2' || farmId?.includes('2')) return getStockAB2();
  if (farmId === 'AGRO BERRY 3' || farmId?.includes('3')) return getStockAB3();
  return [];
};

export const updateInitialStock = (farmId, product, quantity, price) => {
  const key = farmId.includes('1') ? STORAGE_KEYS.stockAB1 : 
              farmId.includes('2') ? STORAGE_KEYS.stockAB2 : STORAGE_KEYS.stockAB3;
  const stock = getItem(key);
  const idx = stock.findIndex(s => s.product === product);
  if (idx >= 0) {
    stock[idx].quantity = quantity;
    stock[idx].price = price || stock[idx].price;
  } else {
    stock.push({ product, quantity, price: price || 0, date: new Date().toISOString().split('T')[0] });
  }
  setItem(key, stock);
};

// === CONSOMMATIONS ===
export const getConsommations = () => getItem(STORAGE_KEYS.consommations);

export const addConsommation = (conso) => {
  const consommations = getConsommations();
  consommations.push({ ...conso, id: Date.now() });
  setItem(STORAGE_KEYS.consommations, consommations);
};

// === MELANGES SAUVEGARDES ===
export const getMelangesSauvegardes = () => getItem(STORAGE_KEYS.melanges);

export const saveMelangePersonnalise = (melange) => {
  const melanges = getMelangesSauvegardes();
  melanges.push({ ...melange, id: Date.now() });
  setItem(STORAGE_KEYS.melanges, melanges);
};

export const deleteMelangePersonnalise = (id) => {
  const melanges = getMelangesSauvegardes().filter(m => m.id !== id);
  setItem(STORAGE_KEYS.melanges, melanges);
};

// === CALCULS DE STOCK ===

// Stock global magasin (entrées - sorties)
export const calculateGlobalStock = () => {
  const movements = getMovements();
  const stockMap = {};
  
  movements.forEach(m => {
    const product = m.product;
    if (!product) return;
    if (!stockMap[product]) stockMap[product] = { quantity: 0, totalValue: 0, count: 0 };
    
    if (m.type === 'entry') {
      stockMap[product].quantity += m.quantity || 0;
      stockMap[product].totalValue += (m.quantity || 0) * (m.price || 0);
      stockMap[product].count++;
    } else if (m.type === 'exit') {
      stockMap[product].quantity -= m.quantity || 0;
    }
  });
  
  return stockMap;
};

// Stock par ferme
export const calculateFarmStock = (farmId) => {
  const initialStock = getInitialStock(farmId);
  const movements = getMovements();
  const stockMap = {};
  
  // Stock initial
  initialStock.forEach(s => {
    stockMap[s.product] = { quantity: s.quantity || 0, price: s.price || 0 };
  });
  
  // Mouvements
  movements.forEach(m => {
    const product = m.product;
    if (!product) return;
    if (!stockMap[product]) stockMap[product] = { quantity: 0, price: m.price || 0 };
    
    // Entrées (sorties du magasin vers cette ferme)
    if (m.type === 'exit' && m.farm === farmId) {
      stockMap[product].quantity += m.quantity || 0;
      if (m.price) stockMap[product].price = m.price;
    }
    // Transferts entrants
    if (m.type === 'transfer-in' && m.farm === farmId) {
      stockMap[product].quantity += m.quantity || 0;
    }
    // Transferts sortants
    if (m.type === 'transfer-out' && m.farm === farmId) {
      stockMap[product].quantity -= m.quantity || 0;
    }
    // Consommations
    if (m.type === 'consumption' && m.farm === farmId) {
      stockMap[product].quantity -= m.quantity || 0;
    }
  });
  
  return stockMap;
};

// Stock du magasin central
export const calculateWarehouseStock = () => {
  const movements = getMovements();
  const stockMap = {};
  
  movements.forEach(m => {
    const product = m.product;
    if (!product) return;
    if (!stockMap[product]) stockMap[product] = { quantity: 0, price: m.price || 0 };
    
    // Entrées fournisseurs -> magasin central (+)
    if (m.type === 'entry') {
      stockMap[product].quantity += m.quantity || 0;
      if (m.price) stockMap[product].price = m.price;
    }
    // Sorties magasin central -> fermes (-)
    if (m.type === 'exit') {
      stockMap[product].quantity -= m.quantity || 0;
    }
  });
  
  return stockMap;
};

// Prix moyen d'un produit
export const getAveragePrice = (productName) => {
  const movements = getMovements().filter(m => m.type === 'entry' && m.product === productName && m.price > 0);
  if (movements.length === 0) {
    // Chercher dans stock initial
    const allStock = [...getStockAB1(), ...getStockAB2(), ...getStockAB3()];
    const found = allStock.find(s => s.product === productName && s.price > 0);
    return found?.price || 0;
  }
  const total = movements.reduce((s, m) => s + (m.quantity || 0) * (m.price || 0), 0);
  const qty = movements.reduce((s, m) => s + (m.quantity || 0), 0);
  return qty > 0 ? total / qty : 0;
};

// === INVENTAIRE PAR MOIS ===
export const getInventory = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.inventory) || '{}');
  } catch { return {}; }
};

export const getInventoryByMonth = (month) => {
  const inventory = getInventory();
  return inventory[month] || [];
};

export const setInventoryItem = (month, product, values) => {
  const inventory = getInventory();
  if (!inventory[month]) inventory[month] = [];
  const idx = inventory[month].findIndex(i => i.product === product);
  if (idx >= 0) {
    inventory[month][idx] = { ...inventory[month][idx], ...values };
  } else {
    inventory[month].push({ product, ...values });
  }
  localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
};

// === DONNÉES DE COÛT ===
export const getCoutData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.coutData);
    if (data) return JSON.parse(data);
    // Fallback to JSON file
    return coutDataJson.cultures || {};
  } catch { 
    return coutDataJson.cultures || {}; 
  }
};

export const getCoutProducts = (farm, culture, category) => {
  const data = getCoutData();
  const farmKey = farm === 'AGRO BERRY 1' ? 'Agro Berry 1' : 
                  farm === 'AGRO BERRY 2' ? 'Agro Berry 2' : 
                  farm === 'AGRO BERRY 3' ? 'Agro Berry 3' : farm;
  
  try {
    const farmData = data[farmKey];
    if (!farmData) return [];
    
    const cultureData = farmData[culture];
    if (!cultureData) return [];
    
    return cultureData[category] || [];
  } catch (e) {
    console.error('Error getting cost products:', e);
    return [];
  }
};

export const updateCoutProduct = (farm, culture, category, productName, monthIndex, newQty) => {
  const data = getCoutData();
  const farmKey = farm === 'AGRO BERRY 1' ? 'Agro Berry 1' : 
                  farm === 'AGRO BERRY 2' ? 'Agro Berry 2' : 
                  farm === 'AGRO BERRY 3' ? 'Agro Berry 3' : farm;
  
  try {
    if (!data[farmKey]) data[farmKey] = {};
    if (!data[farmKey][culture]) data[farmKey][culture] = {};
    if (!data[farmKey][culture][category]) data[farmKey][culture][category] = [];
    
    const products = data[farmKey][culture][category];
    const productIdx = products.findIndex(p => p.nom?.toUpperCase() === productName.toUpperCase());
    
    if (productIdx >= 0) {
      // Update existing product
      if (!products[productIdx].qte) products[productIdx].qte = Array(12).fill(0);
      products[productIdx].qte[monthIndex] = parseFloat(newQty) || 0;
    } else {
      // Add new product
      const newProduct = {
        id: Date.now(),
        nom: productName,
        prix: 0,
        qte: Array(12).fill(0)
      };
      newProduct.qte[monthIndex] = parseFloat(newQty) || 0;
      products.push(newProduct);
    }
    
    localStorage.setItem(STORAGE_KEYS.coutData, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error updating cost product:', e);
    return false;
  }
};

export const addCoutProduct = (farm, culture, category, product) => {
  const data = getCoutData();
  const farmKey = farm === 'AGRO BERRY 1' ? 'Agro Berry 1' : 
                  farm === 'AGRO BERRY 2' ? 'Agro Berry 2' : 
                  farm === 'AGRO BERRY 3' ? 'Agro Berry 3' : farm;
  
  try {
    if (!data[farmKey]) data[farmKey] = {};
    if (!data[farmKey][culture]) data[farmKey][culture] = {};
    if (!data[farmKey][culture][category]) data[farmKey][culture][category] = [];
    
    const newProduct = {
      id: Date.now(),
      nom: product.name,
      prix: parseFloat(product.price) || 0,
      qte: Array(12).fill(0),
      nature: product.nature || category
    };
    
    // Set quantity for selected month
    if (product.monthIndex !== undefined && product.quantity) {
      newProduct.qte[product.monthIndex] = parseFloat(product.quantity) || 0;
    }
    
    data[farmKey][culture][category].push(newProduct);
    localStorage.setItem(STORAGE_KEYS.coutData, JSON.stringify(data));
    return newProduct;
  } catch (e) {
    console.error('Error adding cost product:', e);
    return null;
  }
};

export const deleteCoutProduct = (farm, culture, category, productName) => {
  const data = getCoutData();
  const farmKey = farm === 'AGRO BERRY 1' ? 'Agro Berry 1' : 
                  farm === 'AGRO BERRY 2' ? 'Agro Berry 2' : 
                  farm === 'AGRO BERRY 3' ? 'Agro Berry 3' : farm;
  
  try {
    if (!data[farmKey]?.[culture]?.[category]) return false;
    
    const products = data[farmKey][culture][category];
    const idx = products.findIndex(p => p.nom?.toUpperCase() === productName.toUpperCase());
    
    if (idx >= 0) {
      products.splice(idx, 1);
      localStorage.setItem(STORAGE_KEYS.coutData, JSON.stringify(data));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error deleting cost product:', e);
    return false;
  }
};

export const resetCoutData = () => {
  localStorage.setItem(STORAGE_KEYS.coutData, JSON.stringify(coutDataJson.cultures || {}));
};

// === HISTORIQUE DES MÉLANGES ===
export const getMelangeHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('agro_melange_history_v3') || '[]');
  } catch { return []; }
};

export const addMelangeToHistory = (melange) => {
  const history = getMelangeHistory();
  const entry = {
    id: Date.now(),
    ...melange,
    appliedAt: new Date().toISOString()
  };
  history.unshift(entry); // Add at beginning
  localStorage.setItem('agro_melange_history_v3', JSON.stringify(history.slice(0, 100))); // Keep last 100
  return entry;
};

export const cancelMelange = (melangeId) => {
  // Remove all consumption movements with this melangeId
  const movements = getMovements();
  const filtered = movements.filter(m => m.melangeId !== melangeId);
  const removed = movements.length - filtered.length;
  setItem(STORAGE_KEYS.movements, filtered);
  
  // Mark as cancelled in history
  const history = getMelangeHistory();
  const idx = history.findIndex(h => h.id === melangeId);
  if (idx >= 0) {
    history[idx].cancelled = true;
    history[idx].cancelledAt = new Date().toISOString();
    localStorage.setItem('agro_melange_history_v3', JSON.stringify(history));
  }
  
  return removed;
};

export const deleteMelangeFromHistory = (melangeId) => {
  const history = getMelangeHistory();
  const filtered = history.filter(h => h.id !== melangeId);
  localStorage.setItem('agro_melange_history_v3', JSON.stringify(filtered));
};

// Sync cost data to stock - creates consumption movements
export const syncCoutToStock = (farm, culture, category, monthIndex) => {
  const products = getCoutProducts(farm, culture, category);
  const movements = getMovements();
  const allProducts = getProducts();
  let synced = 0;
  let errors = [];
  
  const monthNames = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août'];
  const monthName = monthNames[monthIndex] || 'Unknown';
  
  // Map month index to actual date (for 2025/2026 season)
  const getDateForMonth = (idx) => {
    const monthMap = {
      0: '2025-09', // Sept
      1: '2025-10', // Oct
      2: '2025-11', // Nov
      3: '2025-12', // Dec
      4: '2026-01', // Jan
      5: '2026-02', // Feb
      6: '2026-03'  // Mar
    };
    const yearMonth = monthMap[idx] || '2025-09';
    return `${yearMonth}-15`; // Middle of month
  };
  
  const syncDate = getDateForMonth(monthIndex);
  const syncTag = `SYNC-COUT-${farm}-${culture}-${category}-${monthIndex}`;
  
  products.forEach(p => {
    const qty = p.qte?.[monthIndex] || 0;
    if (qty <= 0) return;
    
    const productName = p.nom?.toUpperCase();
    if (!productName) return;
    
    // Check if already synced (look for existing movement with same sync tag)
    const existingSync = movements.find(m => 
      m.syncTag === syncTag && 
      m.product?.toUpperCase() === productName
    );
    
    if (existingSync) {
      // Update existing sync movement
      const idx = movements.findIndex(m => m.id === existingSync.id);
      if (idx >= 0) {
        movements[idx].quantity = qty;
        movements[idx].date = syncDate;
      }
    } else {
      // Create new consumption movement
      const price = p.prix || getAveragePrice(productName) || 0;
      
      const newMovement = {
        id: Date.now() + Math.random(),
        type: 'consumption',
        product: productName,
        quantity: qty,
        price: price,
        date: syncDate,
        farm: farm,
        culture: culture,
        category: category,
        notes: `Sync coût ${monthName} - ${category}`,
        syncTag: syncTag,
        createdAt: new Date().toISOString()
      };
      
      movements.push(newMovement);
    }
    
    synced++;
  });
  
  // Save updated movements
  setItem(STORAGE_KEYS.movements, movements);
  
  return { synced, errors, monthName };
};

// Sync all months for a farm/culture/category
export const syncAllMonthsCoutToStock = (farm, culture, category) => {
  let totalSynced = 0;
  const results = [];
  
  for (let i = 0; i <= 4; i++) { // Sept (0) to Jan (4)
    const result = syncCoutToStock(farm, culture, category, i);
    totalSynced += result.synced;
    results.push(result);
  }
  
  return { totalSynced, results };
};

// Sync entire farm costs to stock
export const syncFarmCoutToStock = (farm, culture) => {
  const categories = ['Engrais Poudre Sol', 'Engrais Poudre Hydroponic', 'Engrais Foliaire', 'Pesticides'];
  let totalSynced = 0;
  
  categories.forEach(cat => {
    const result = syncAllMonthsCoutToStock(farm, culture, cat);
    totalSynced += result.totalSynced;
  });
  
  return totalSynced;
};

// === CONSOMMATION FERMES (pour la page principale) ===
export const getConsoFermesData = (monthIndex) => {
  const movements = getMovements();
  const products = getProducts();
  const dataMap = {};

  // Initialiser avec tous les produits
  products.forEach(p => {
    dataMap[p.name] = {
      name: p.name,
      category: p.category || 'AUTRES',
      unit: p.unit || 'KG',
      price: getAveragePrice(p.name) || 0,
      initAB1: 0, initAB2: 0, initAB3: 0,
      entAB1: 0, entAB2: 0, entAB3: 0,
      sortAB1: 0, sortAB2: 0, sortAB3: 0,
      consAB1: 0, consAB2: 0, consAB3: 0,
      finAB1: 0, finAB2: 0, finAB3: 0
    };
  });

  // Stock initial (date début = Nov 2025)
  getStockAB1().forEach(s => {
    if (!dataMap[s.product]) dataMap[s.product] = createEmptyRow(s.product, s.price);
    dataMap[s.product].initAB1 = s.quantity || 0;
    dataMap[s.product].price = s.price || dataMap[s.product].price;
  });
  getStockAB2().forEach(s => {
    if (!dataMap[s.product]) dataMap[s.product] = createEmptyRow(s.product, s.price);
    dataMap[s.product].initAB2 = s.quantity || 0;
  });
  getStockAB3().forEach(s => {
    if (!dataMap[s.product]) dataMap[s.product] = createEmptyRow(s.product, s.price);
    dataMap[s.product].initAB3 = s.quantity || 0;
  });

  // Mouvements
  movements.forEach(m => {
    const product = m.product;
    if (!product || !dataMap[product]) return;
    const data = dataMap[product];
    const qty = m.quantity || 0;
    const farm = m.farm || '';

    // Transferts entrants = ENTRÉES (entre fermes)
    if (m.type === 'transfer-in') {
      if (farm.includes('1')) data.entAB1 += qty;
      else if (farm.includes('2')) data.entAB2 += qty;
      else if (farm.includes('3')) data.entAB3 += qty;
    }
    // Transferts sortants = SORTIES
    if (m.type === 'transfer-out') {
      if (farm.includes('1')) data.sortAB1 += qty;
      else if (farm.includes('2')) data.sortAB2 += qty;
      else if (farm.includes('3')) data.sortAB3 += qty;
    }
    // Consommations
    if (m.type === 'consumption') {
      if (farm.includes('1')) data.consAB1 += qty;
      else if (farm.includes('2')) data.consAB2 += qty;
      else if (farm.includes('3')) data.consAB3 += qty;
    }
  });

  // Calcul stock final: Init + Entrées (TransIn) - Sorties (TransOut) - Conso
  Object.values(dataMap).forEach(data => {
    data.finAB1 = data.initAB1 + data.entAB1 - data.sortAB1 - data.consAB1;
    data.finAB2 = data.initAB2 + data.entAB2 - data.sortAB2 - data.consAB2;
    data.finAB3 = data.initAB3 + data.entAB3 - data.sortAB3 - data.consAB3;
  });

  return dataMap;
};

// === CONSOMMATION FERMES PAR PÉRIODE (26 → 25 du mois) ===
export const getConsoFermesDataByPeriod = (startDate, endDate, prevInventoryDate) => {
  const movements = getMovements();
  const products = getProducts();
  const dataMap = {};
  
  // Import stock history data
  let stockHistoryData = {};
  try {
    stockHistoryData = require('./stockHistory.json');
  } catch (e) {
    console.log('No stockHistory.json found');
  }

  // Map date to month ID
  const dateToMonthId = {
    '2025-09-25': 'SEPTEMBRE',
    '2025-10-25': 'OCTOBRE',
    '2025-11-25': 'NOVEMBRE',
    '2025-12-25': 'DECEMBRE',
    '2025-12-31': 'DECEMBRE_2025',
    '2026-01-25': 'JANVIER',
    '2026-01-31': 'JANVIER',
    '2026-02-25': 'FEVRIER',
    '2026-02-28': 'FEVRIER',
    '2026-03-31': 'MARS',
    '2026-04-30': 'AVRIL',
    '2026-05-31': 'MAI',
    '2026-06-30': 'JUIN',
    '2026-07-31': 'JUILLET'
  };

  // Initialiser avec tous les produits
  products.forEach(p => {
    dataMap[p.name] = {
      name: p.name,
      category: p.category || 'AUTRES',
      unit: p.unit || 'KG',
      price: getAveragePrice(p.name) || 0,
      initAB1: 0, initAB2: 0, initAB3: 0,
      entAB1: 0, entAB2: 0, entAB3: 0,
      transInAB1: 0, transInAB2: 0, transInAB3: 0,
      sortAB1: 0, sortAB2: 0, sortAB3: 0,
      consAB1: 0, consAB2: 0, consAB3: 0,
      finAB1: 0, finAB2: 0, finAB3: 0
    };
  });

  // Stock initial: depuis stockHistory.json
  const prevMonthId = dateToMonthId[prevInventoryDate];
  const prevMonthData = prevMonthId ? stockHistoryData[prevMonthId] : null;
  
  if (prevMonthData) {
    // Utiliser les données historiques importées
    ['AB1', 'AB2', 'AB3'].forEach(farm => {
      (prevMonthData[farm] || []).forEach(item => {
        if (!dataMap[item.product]) dataMap[item.product] = createEmptyRow(item.product, item.price);
        dataMap[item.product][`init${farm}`] = item.quantity || 0;
        if (item.price) dataMap[item.product].price = item.price;
      });
    });
  } else {
    // Utiliser stock initial de début de saison (stockAB1/2/3)
    getStockAB1().forEach(s => {
      if (!dataMap[s.product]) dataMap[s.product] = createEmptyRow(s.product, s.price);
      dataMap[s.product].initAB1 = s.quantity || 0;
      dataMap[s.product].price = s.price || dataMap[s.product].price;
    });
    getStockAB2().forEach(s => {
      if (!dataMap[s.product]) dataMap[s.product] = createEmptyRow(s.product, s.price);
      dataMap[s.product].initAB2 = s.quantity || 0;
    });
    getStockAB3().forEach(s => {
      if (!dataMap[s.product]) dataMap[s.product] = createEmptyRow(s.product, s.price);
      dataMap[s.product].initAB3 = s.quantity || 0;
    });
  }

  // Filtrer mouvements par période
  const periodMovements = movements.filter(m => {
    if (!m.date) return false;
    return m.date >= startDate && m.date <= endDate;
  });

  // Mouvements de la période
  periodMovements.forEach(m => {
    const product = m.product;
    if (!product || !dataMap[product]) return;
    const data = dataMap[product];
    const qty = m.quantity || 0;
    const farm = m.farm || '';

    // ENTRÉES = transferts entrants + sorties magasin (livraisons fournisseurs)
    if (m.type === 'transfer-in' || m.type === 'exit') {
      if (farm.includes('1')) data.entAB1 += qty;
      else if (farm.includes('2')) data.entAB2 += qty;
      else if (farm.includes('3')) data.entAB3 += qty;
      
      // Track transfers separately
      if (m.type === 'transfer-in') {
        if (farm.includes('1')) data.transInAB1 += qty;
        else if (farm.includes('2')) data.transInAB2 += qty;
        else if (farm.includes('3')) data.transInAB3 += qty;
      }
    }
    // SORTIES = Transferts sortants vers autres fermes
    if (m.type === 'transfer-out') {
      if (farm.includes('1')) data.sortAB1 += qty;
      else if (farm.includes('2')) data.sortAB2 += qty;
      else if (farm.includes('3')) data.sortAB3 += qty;
    }
    // Consommations
    if (m.type === 'consumption') {
      if (farm.includes('1')) data.consAB1 += qty;
      else if (farm.includes('2')) data.consAB2 += qty;
      else if (farm.includes('3')) data.consAB3 += qty;
    }
  });

  // Calcul stock final: Init + Entrées - Sorties - Conso
  Object.values(dataMap).forEach(data => {
    data.finAB1 = data.initAB1 + data.entAB1 - data.sortAB1 - data.consAB1;
    data.finAB2 = data.initAB2 + data.entAB2 - data.sortAB2 - data.consAB2;
    data.finAB3 = data.initAB3 + data.entAB3 - data.sortAB3 - data.consAB3;
  });

  return dataMap;
};

function createEmptyRow(name, price = 0) {
  return {
    name, category: 'AUTRES', unit: 'KG', price,
    initAB1: 0, initAB2: 0, initAB3: 0,
    entAB1: 0, entAB2: 0, entAB3: 0,
    sortAB1: 0, sortAB2: 0, sortAB3: 0,
    consAB1: 0, consAB2: 0, consAB3: 0,
    finAB1: 0, finAB2: 0, finAB3: 0
  };
}

// === EXPORT / IMPORT ===
export const exportAllData = () => ({
  products: getProducts(),
  movements: getMovements(),
  stockAB1: getStockAB1(),
  stockAB2: getStockAB2(),
  stockAB3: getStockAB3(),
  suppliers: getSuppliers(),
  consommations: getConsommations(),
  melanges: getMelangesSauvegardes(),
  inventory: getInventory(),
  exportDate: new Date().toISOString()
});

export const importAllData = (data) => {
  try {
    if (data.products) setItem(STORAGE_KEYS.products, data.products);
    if (data.movements) setItem(STORAGE_KEYS.movements, data.movements);
    if (data.stockAB1) setItem(STORAGE_KEYS.stockAB1, data.stockAB1);
    if (data.stockAB2) setItem(STORAGE_KEYS.stockAB2, data.stockAB2);
    if (data.stockAB3) setItem(STORAGE_KEYS.stockAB3, data.stockAB3);
    if (data.suppliers) setItem(STORAGE_KEYS.suppliers, data.suppliers);
    if (data.consommations) setItem(STORAGE_KEYS.consommations, data.consommations);
    if (data.melanges) setItem(STORAGE_KEYS.melanges, data.melanges);
    if (data.inventory) localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(data.inventory));
    return true;
  } catch (e) {
    console.error('Import error:', e);
    return false;
  }
};

export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};

// === PARAMÈTRES ALERTES ===
const SETTINGS_KEY = 'agro_settings_v3';

export const getSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch { return {}; }
};

export const updateSettings = (updates) => {
  const settings = { ...getSettings(), ...updates };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
};

export const getDefaultThreshold = () => getSettings().defaultThreshold || 10;

export const setDefaultThreshold = (value) => updateSettings({ defaultThreshold: value });

// === CALCUL DES ALERTES ===
export const getAlerts = () => {
  const alerts = [];
  const products = getProducts();
  const movements = getMovements();
  const consommations = getConsommations();
  const globalStock = calculateGlobalStock();
  const defaultThreshold = getDefaultThreshold();
  
  // 1. Alertes Stock Bas et Stock Épuisé (Magasin)
  products.forEach(product => {
    const stock = globalStock[product.name]?.quantity || 0;
    const threshold = product.threshold ?? defaultThreshold;
    
    if (stock <= 0) {
      alerts.push({
        id: `empty-mag-${product.name}`,
        type: 'empty',
        severity: 'critical',
        icon: '🔴',
        title: 'Stock épuisé',
        message: `${product.name} épuisé au Magasin`,
        product: product.name,
        location: 'Magasin'
      });
    } else if (stock <= threshold) {
      alerts.push({
        id: `low-mag-${product.name}`,
        type: 'low',
        severity: 'warning',
        icon: '⚠️',
        title: 'Stock bas',
        message: `${product.name} < ${threshold} ${product.unit || 'unités'} au Magasin (reste: ${stock.toFixed(1)})`,
        product: product.name,
        location: 'Magasin',
        current: stock,
        threshold
      });
    }
  });
  
  // 2. Alertes Stock par Ferme
  ['AGRO BERRY 1', 'AGRO BERRY 2', 'AGRO BERRY 3'].forEach(farmId => {
    const farmStock = calculateFarmStock(farmId);
    const farmName = farmId.replace('AGRO BERRY ', 'AB');
    
    Object.entries(farmStock).forEach(([productName, data]) => {
      const product = products.find(p => p.name === productName);
      const threshold = product?.threshold ?? defaultThreshold;
      const stock = data.quantity || 0;
      
      if (stock < 0) {
        alerts.push({
          id: `negative-${farmId}-${productName}`,
          type: 'empty',
          severity: 'critical',
          icon: '🔴',
          title: 'Stock négatif',
          message: `${productName}: ${stock.toFixed(1)} à ${farmName}`,
          product: productName,
          location: farmName
        });
      } else if (stock > 0 && stock <= threshold / 2) {
        alerts.push({
          id: `low-${farmId}-${productName}`,
          type: 'low',
          severity: 'warning',
          icon: '⚠️',
          title: 'Stock bas ferme',
          message: `${productName} < ${(threshold/2).toFixed(0)} à ${farmName} (reste: ${stock.toFixed(1)})`,
          product: productName,
          location: farmName,
          current: stock
        });
      }
    });
  });
  
  // 3. Alertes Consommation élevée (comparaison entre fermes)
  const consoByFarm = { 'AGRO BERRY 1': 0, 'AGRO BERRY 2': 0, 'AGRO BERRY 3': 0 };
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  [...movements.filter(m => m.type === 'consumption'), ...consommations].forEach(c => {
    const cDate = (c.date || '').slice(0, 7);
    if (cDate === thisMonth && c.farm) {
      consoByFarm[c.farm] = (consoByFarm[c.farm] || 0) + ((c.quantity || 0) * (c.price || 0));
    }
  });
  
  const avgConso = Object.values(consoByFarm).reduce((a, b) => a + b, 0) / 3;
  
  Object.entries(consoByFarm).forEach(([farm, value]) => {
    if (avgConso > 0 && value > avgConso * 2) {
      const farmName = farm.replace('AGRO BERRY ', 'AB');
      alerts.push({
        id: `high-conso-${farm}`,
        type: 'high-consumption',
        severity: 'info',
        icon: '📊',
        title: 'Consommation élevée',
        message: `${farmName} consomme ${((value/avgConso)*100 - 100).toFixed(0)}% de plus que la moyenne ce mois`,
        location: farmName,
        value,
        average: avgConso
      });
    }
  });
  
  // Trier: critiques d'abord, puis warnings, puis info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return alerts;
};

// === STOCK HISTORY ===
export const getStockHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.stockHistory) || '[]');
  } catch { return []; }
};

export const saveStockHistory = (history) => {
  localStorage.setItem(STORAGE_KEYS.stockHistory, JSON.stringify(history));
};

export const addStockSnapshot = (month, date) => {
  const ab1 = calculateFarmStock('AGRO BERRY 1');
  const ab2 = calculateFarmStock('AGRO BERRY 2');
  const ab3 = calculateFarmStock('AGRO BERRY 3');

  const formatStock = (stockObj) => {
    return Object.entries(stockObj)
      .filter(([_, data]) => data.quantity > 0)
      .map(([product, data]) => ({
        product,
        quantity: data.quantity,
        unit: 'KG',
        price: data.avgPrice || 0
      }));
  };

  const snapshot = {
    date,
    month,
    AB1: formatStock(ab1),
    AB2: formatStock(ab2),
    AB3: formatStock(ab3),
    createdAt: new Date().toISOString()
  };

  const history = getStockHistory();
  const existingIdx = history.findIndex(h => h.date === date);
  
  if (existingIdx >= 0) {
    history[existingIdx] = snapshot;
  } else {
    history.push(snapshot);
    history.sort((a, b) => a.date.localeCompare(b.date));
  }

  saveStockHistory(history);
  return snapshot;
};

// === INVENTAIRE MENSUEL ===
const INVENTAIRES_KEY = 'agro-inventaires';

export const getInventaires = () => {
  const data = localStorage.getItem(INVENTAIRES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
};

export const saveInventaire = (inventaire) => {
  const inventaires = getInventaires();
  const existingIdx = inventaires.findIndex(inv => inv.id === inventaire.id);
  
  if (existingIdx >= 0) {
    inventaires[existingIdx] = inventaire;
  } else {
    inventaires.push(inventaire);
  }
  
  localStorage.setItem(INVENTAIRES_KEY, JSON.stringify(inventaires));
};

export const deleteInventaire = (id) => {
  const inventaires = getInventaires().filter(inv => inv.id !== id);
  localStorage.setItem(INVENTAIRES_KEY, JSON.stringify(inventaires));
};

export const getLastInventaire = () => {
  const inventaires = getInventaires();
  return inventaires.length > 0 ? inventaires[0] : null;
};

export const getInventaireForPeriod = (periodDate) => {
  // Get inventory that should be the starting point for a period
  // If periodDate is January 2026, we need inventory from 25 Dec 2025
  const inventaires = getInventaires();
  const targetDate = new Date(periodDate);
  targetDate.setMonth(targetDate.getMonth() - 1);
  targetDate.setDate(25);
  const targetStr = targetDate.toISOString().split('T')[0];
  
  return inventaires.find(inv => inv.date <= targetStr) || null;
};

// Initialiser au chargement
initializeData();
