import React, { useState, useEffect, useContext, createContext } from 'react';
import Sidebar from './components/Sidebar';
import { Toast } from './components/UI';
import Dashboard from './pages/Dashboard';
import ConsoFermes from './pages/ConsoFermes';
import Stock from './pages/Stock';
import Movements from './pages/Movements';
import Farms from './pages/Farms';
import Transfers from './pages/Transfers';
import Saisie from './pages/Saisie';
import Melange from './pages/Melange';
import Costs from './pages/Costs';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Settings from './pages/Settings';
import * as store from './lib/store';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [notification, setNotification] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const loadData = () => {
    setProducts(store.getProducts());
    setMovements(store.getMovements());
  };

  useEffect(() => { 
    store.initializeData();
    loadData();
    setLoading(false);
  }, []);

  const showNotif = (msg, type = 'success') => setNotification({ msg, type });

  const addProduct = (product) => {
    const newProduct = store.addProduct(product);
    setProducts(prev => [...prev, newProduct]);
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

  const addMovement = (movement) => {
    const newMovement = store.addMovement(movement);
    setMovements(prev => [...prev, newMovement]);
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

  const contextValue = {
    products, movements, loadData, showNotif,
    addProduct, updateProduct, deleteProduct, addMovement, updateMovement, deleteMovement,
    setPage: setCurrentPage
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'consofermes': return <ConsoFermes />;
      case 'stock': return <Stock />;
      case 'movements': return <Movements />;
      case 'farms': return <Farms />;
      case 'transfers': return <Transfers />;
      case 'saisie': return <Saisie />;
      case 'melange': return <Melange />;
      case 'costs': return <Costs />;
      case 'inventory': return <Inventory />;
      case 'products': return <Products />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-3xl mb-4 animate-pulse shadow-lg">
            🫐
          </div>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen bg-[#f5f5f7] overflow-hidden">
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />
        
        <main className="flex-1 overflow-auto">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-200/50 shadow-sm">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">🫐</span>
              <h1 className="font-semibold text-gray-900">Agro Berry</h1>
            </div>
          </div>
          
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>

        {notification && (
          <Toast 
            message={notification.msg} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </div>
    </AppContext.Provider>
  );
}

export default App;
