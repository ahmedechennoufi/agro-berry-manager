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
import PhysicalInventory from './pages/PhysicalInventory';
import Commandes from './pages/Commandes';
import Ecarts from './pages/Ecarts';
import Products from './pages/Products';
import Settings from './pages/Settings';
import * as store from './lib/store';
import { isGitHubConfigured, scheduleAutoBackup, syncMovementsFromGitHub } from './lib/githubBackup';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const isReadOnly = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === '1';
};

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
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'done' | 'error'
  const [newMovementsCount, setNewMovementsCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const loadData = () => {
    setProducts(store.getProducts());
    setMovements(store.getMovements());
  };

  const triggerAutoBackup = () => {
    if (isGitHubConfigured()) {
      scheduleAutoBackup(
        store.exportAllData,
        () => console.log('✅ Auto-backup GitHub réussi'),
        (err) => console.warn('⚠️ Auto-backup échoué:', err.message)
      );
    }
  };

  // Sync depuis GitHub (mouvements magasiniers)
  const syncFromGitHub = async (silent = false) => {
    if (!isGitHubConfigured()) return;
    if (!silent) setSyncStatus('syncing');
    try {
      const count = await syncMovementsFromGitHub(
        store.getMovements,
        (mv) => store.addMovement(mv)
      );
      if (count > 0) {
        loadData();
        setNewMovementsCount(count);
        if (!silent) showNotif(`✅ ${count} nouveau(x) mouvement(s) importé(s) depuis les fermes`, 'success');
        setTimeout(() => setNewMovementsCount(0), 5000);
      }
      if (!silent) setSyncStatus('done');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (e) {
      if (!silent) setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  useEffect(() => {
    store.initializeData();
    loadData();
    setLoading(false);

    // Sync au démarrage (silencieux)
    setTimeout(() => syncFromGitHub(true), 2000);

    // Sync automatique toutes les 5 minutes
    const syncInterval = setInterval(() => syncFromGitHub(true), 5 * 60 * 1000);

    // Sync quand l'onglet redevient actif
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncFromGitHub(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const showNotif = (msg, type = 'success') => setNotification({ msg, type });

  const addProduct = (product) => {
    const newProduct = store.addProduct(product);
    setProducts(prev => [...prev, newProduct]);
    showNotif('Produit ajouté');
    triggerAutoBackup();
    return newProduct;
  };

  const updateProduct = (id, updates) => {
    try {
      const oldProduct = products.find(p => p.id === id);
      store.updateProduct(id, updates);
      setProducts(store.getProducts());
      if (oldProduct && updates.name && oldProduct.name !== updates.name) {
        setMovements(store.getMovements());
        loadData();
      }
      showNotif('Produit modifié');
      triggerAutoBackup();
    } catch (err) {
      console.error('Erreur modification produit:', err);
      showNotif('Erreur: ' + err.message, 'error');
    }
  };

  const deleteProduct = (id) => {
    store.deleteProduct(id);
    setProducts(store.getProducts());
    showNotif('Produit supprimé');
    triggerAutoBackup();
  };

  const addMovement = (movement) => {
    const newMovement = store.addMovement(movement);
    setMovements(prev => [...prev, newMovement]);
    triggerAutoBackup();
    return newMovement;
  };

  const updateMovement = (id, updates) => {
    const oldMovement = movements.find(m => m.id === id);
    if (oldMovement && oldMovement.type === 'entry' && store.syncEntryWithCommande) {
      store.syncEntryWithCommande(oldMovement.product, -(oldMovement.quantity || 0), oldMovement.date);
    }
    store.updateMovement(id, updates);
    const updatedMovement = store.getMovements().find(m => m.id === id);
    if (updatedMovement && updatedMovement.type === 'entry' && store.syncEntryWithCommande) {
      store.syncEntryWithCommande(updatedMovement.product, updatedMovement.quantity || 0, updatedMovement.date);
    }
    setMovements(store.getMovements());
    showNotif('Mouvement modifié');
    triggerAutoBackup();
  };

  const deleteMovement = (id) => {
    store.deleteMovement(id);
    setMovements(store.getMovements());
    showNotif('Mouvement supprimé');
    triggerAutoBackup();
  };

  const readOnly = isReadOnly();

  const contextValue = {
    products, movements, loadData, showNotif, readOnly, triggerAutoBackup,
    addProduct, updateProduct, deleteProduct, addMovement, updateMovement, deleteMovement,
    setPage: setCurrentPage,
    syncFromGitHub, syncStatus, newMovementsCount
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
      case 'physical-inventory': return <PhysicalInventory />;
      case 'commandes': return <Commandes />;
      case 'ecarts': return <Ecarts />;
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
      <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
        {/* Sync indicator */}
        {syncStatus === 'syncing' && (
          <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:'#1d9e75', color:'white', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
            🔄 Synchronisation en cours...
          </div>
        )}
        {newMovementsCount > 0 && (
          <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:'#1d9e75', color:'white', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
            ✅ {newMovementsCount} nouveau(x) mouvement(s) importé(s)
          </div>
        )}

        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          onSync={() => syncFromGitHub(false)}
          syncStatus={syncStatus}
        />
        <main className="flex-1 overflow-auto">
          {renderPage()}
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
