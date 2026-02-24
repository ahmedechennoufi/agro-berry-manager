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
import History from './pages/History';
import Products from './pages/Products';
import Settings from './pages/Settings';
import * as store from './lib/store';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [inventory, setInventory] = useState({});

  const loadData = () => {
    setProducts(store.getProducts());
    setMovements(store.getMovements());
    setInventory(store.getInventory());
  };

  useEffect(() => { loadData(); }, []);

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

  const deleteMovement = (id) => {
    store.deleteMovement(id);
    setMovements(store.getMovements());
    showNotif('Mouvement supprimé');
  };

  const contextValue = {
    products, movements, inventory, loadData, showNotif,
    addProduct, updateProduct, deleteProduct, addMovement, deleteMovement
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
      case 'history': return <History />;
      case 'products': return <Products />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen bg-[#f2f2f7]">
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        
        <main className="flex-1 overflow-auto">
          {/* Mobile header */}
          <div className="md:hidden sticky top-0 z-30 bg-[#f2f2f7]/90 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-200/50">
            <button onClick={() => setSidebarOpen(true)} className="text-ios-blue text-xl font-medium">☰</button>
            <h1 className="font-semibold text-ios-dark">Agro Berry</h1>
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
