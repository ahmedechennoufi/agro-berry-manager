import React, { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import { Toast } from './components/UI';
import * as store from './lib/store';

// Pages
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Movements from './pages/Movements';
import Farms from './pages/Farms';
import Transfers from './pages/Transfers';
import Consumption from './pages/Consumption';
import Costs from './pages/Costs';
import History from './pages/History';
import Comparison from './pages/Comparison';
import Products from './pages/Products';
import Settings from './pages/Settings';

// Context
const AppContext = createContext();

export const useApp = () => useContext(AppContext);

// Provider
const AppProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [notification, setNotification] = useState(null);

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProducts(store.getProducts());
    setMovements(store.getMovements());
    setInventory(store.getInventory());
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const hideNotif = () => setNotification(null);

  // CRUD Products
  const addProduct = (product) => {
    const newProduct = store.addProduct(product);
    setProducts(store.getProducts());
    showNotif('Produit ajouté');
    return newProduct;
  };

  const updateProduct = (id, updates) => {
    store.updateProduct(id, updates);
    setProducts(store.getProducts());
    showNotif('Produit modifié');
  };

  const deleteProduct = (id) => {
    store.deleteProduct(id);
    setProducts(store.getProducts());
    showNotif('Produit supprimé');
  };

  // CRUD Movements
  const addMovement = (movement) => {
    const newMovement = store.addMovement(movement);
    setMovements(store.getMovements());
    showNotif('Mouvement enregistré');
    return newMovement;
  };

  const updateMovement = (id, updates) => {
    store.updateMovement(id, updates);
    setMovements(store.getMovements());
    showNotif('Mouvement modifié');
  };

  const deleteMovement = (id) => {
    store.deleteMovement(id);
    setMovements(store.getMovements());
    showNotif('Mouvement supprimé');
  };

  // Inventory
  const setInventoryItem = (month, product, data) => {
    store.setInventoryItem(month, product, data);
    setInventory(store.getInventory());
  };

  // Import/Export
  const exportData = () => store.exportAllData();
  
  const importData = (data) => {
    const success = store.importAllData(data);
    if (success) {
      loadData();
      showNotif('Données importées');
    } else {
      showNotif('Erreur d\'import', 'error');
    }
    return success;
  };

  const importFromOldApp = () => {
    const success = store.importFromOldApp();
    if (success) {
      loadData();
      showNotif('Données importées depuis l\'ancienne application');
    } else {
      showNotif('Erreur d\'import', 'error');
    }
    return success;
  };

  const clearData = () => {
    store.clearAllData();
    loadData();
    showNotif('Données effacées');
  };

  const value = {
    products,
    movements,
    inventory,
    notification,
    showNotif,
    addProduct,
    updateProduct,
    deleteProduct,
    addMovement,
    updateMovement,
    deleteMovement,
    setInventoryItem,
    exportData,
    importData,
    importFromOldApp,
    clearData,
    loadData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={hideNotif} 
        />
      )}
    </AppContext.Provider>
  );
};

// Main App
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'stock': return <Stock />;
      case 'movements': return <Movements />;
      case 'farms': return <Farms />;
      case 'transfers': return <Transfers />;
      case 'consumption': return <Consumption />;
      case 'costs': return <Costs />;
      case 'history': return <History />;
      case 'comparison': return <Comparison />;
      case 'products': return <Products />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <div className="flex min-h-screen">
        <Sidebar 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        
        <main className="flex-1 min-h-screen">
          {/* Mobile header */}
          <header className="md:hidden bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-30">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-bold text-gray-800">Agro Berry Manager</h1>
          </header>
          
          {/* Page content */}
          <div className="p-4 md:p-8">
            {renderPage()}
          </div>
        </main>
      </div>
    </AppProvider>
  );
};

export default App;
