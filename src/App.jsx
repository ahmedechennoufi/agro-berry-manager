// Build: 2026-04-10-v3
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
import Inventory from './pages/Inventory';
import PhysicalInventory from './pages/PhysicalInventory';
import Commandes from './pages/Commandes';
import Products from './pages/Products';
import Settings from './pages/Settings';
import * as store from './lib/store';
import { isGitHubConfigured, backupToGitHub, restoreFromGitHub, syncMovementsFromGitHub } from './lib/githubBackup';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const isReadOnly = () => new URLSearchParams(window.location.search).get('view') === '1';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [notification, setNotification] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMovementsCount, setNewMovementsCount] = useState(0);

  useEffect(() => { localStorage.setItem('sidebar_collapsed', sidebarCollapsed); }, [sidebarCollapsed]);

  const loadData = () => {
    setProducts(store.getProducts());
    setMovements(store.getMovements());
  };

  // Sauvegarde IMMÉDIATE sur GitHub + mise à jour state
  const saveToGitHub = async (showSuccessNotif = false) => {
    if (!isGitHubConfigured()) {
      showNotif('⚠️ GitHub non configuré ! Le magasinier ne verra pas ce changement. Va dans Paramètres → GitHub pour configurer.', 'error');
      return;
    }
    setSaving(true);
    try {
      await backupToGitHub(store.exportAllData());
      store.clearDeletedMovementIds(); // Vider après backup réussi
      if (showSuccessNotif) showNotif('✅ Sauvegardé sur GitHub (magasinier sera à jour)', 'success');
    } catch (err) {
      console.warn('Sauvegarde GitHub échouée:', err.message);
      showNotif('❌ Sauvegarde GitHub ÉCHOUÉE: ' + err.message + ' — le magasinier ne verra pas ce changement !', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sync depuis GitHub (mouvements magasiniers)
  const syncFromGitHub = async (silent = false) => {
    if (!isGitHubConfigured()) return 0;
    try {
      const count = await syncMovementsFromGitHub(
        store.getMovements, 
        (mv) => store.addMovement(mv),
        store.getDeletedMovementIds
      );
      if (count > 0) {
        loadData();
        setNewMovementsCount(count);
        if (!silent) showNotif(`✅ ${count} nouveau(x) mouvement(s) importé(s)`, 'success');
        setTimeout(() => setNewMovementsCount(0), 5000);
      }
      return count;
    } catch (e) { return 0; }
  };

  // Au démarrage : charger depuis GitHub si configuré, sinon localStorage
  useEffect(() => {
    const init = async () => {
      store.initializeData();

      if (isGitHubConfigured()) {
        try {
          const data = await restoreFromGitHub();
          // Importer les données GitHub dans le localStorage
          if (data.products?.length) localStorage.setItem('agro_products_v3', JSON.stringify(data.products));
          if (data.movements?.length) localStorage.setItem('agro_movements_v3', JSON.stringify(data.movements));
          if (data.stockAB1) localStorage.setItem('agro_stock_ab1_v3', JSON.stringify(data.stockAB1));
          if (data.stockAB2) localStorage.setItem('agro_stock_ab2_v3', JSON.stringify(data.stockAB2));
          if (data.stockAB3) localStorage.setItem('agro_stock_ab3_v3', JSON.stringify(data.stockAB3));
          console.log('✅ Données chargées depuis GitHub');
        } catch (e) {
          console.warn('⚠️ Chargement GitHub échoué, utilisation localStorage:', e.message);
        }
      }

      loadData();
      setLoading(false);

      // Sync magasiniers au démarrage (2s)
      setTimeout(() => syncFromGitHub(true), 2000);

      // Sync toutes les 30 secondes
      const syncInterval = setInterval(() => syncFromGitHub(true), 30 * 1000);

      // Sync quand l'onglet redevient actif
      const handleVisibility = () => { if (document.visibilityState === 'visible') syncFromGitHub(true); };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(syncInterval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    };
    init();
  }, []);

  const showNotif = (msg, type = 'success') => setNotification({ msg, type });

  const addProduct = async (product) => {
    const newProduct = store.addProduct(product);
    setProducts(store.getProducts());
    showNotif('Produit ajouté');
    await saveToGitHub();
    return newProduct;
  };

  const updateProduct = async (id, updates) => {
    try {
      const oldProduct = products.find(p => p.id === id);
      store.updateProduct(id, updates);
      setProducts(store.getProducts());
      if (oldProduct && updates.name && oldProduct.name !== updates.name) {
        setMovements(store.getMovements());
        loadData();
      }
      showNotif('Produit modifié');
      await saveToGitHub();
    } catch (err) {
      showNotif('Erreur: ' + err.message, 'error');
    }
  };

  const deleteProduct = async (id) => {
    store.deleteProduct(id);
    setProducts(store.getProducts());
    showNotif('Produit supprimé');
    await saveToGitHub();
  };

  const addMovement = async (movement) => {
    const newMovement = store.addMovement(movement);
    setMovements(prev => [...prev, newMovement]);
    await saveToGitHub(true); // Show success notif so user knows magasinier will see it
    return newMovement;
  };

  const updateMovement = async (id, updates) => {
    const oldMovement = movements.find(m => m.id === id);
    if (oldMovement?.type === 'entry' && store.syncEntryWithCommande) {
      store.syncEntryWithCommande(oldMovement.product, -(oldMovement.quantity || 0), oldMovement.date);
    }
    store.updateMovement(id, updates);
    const updatedMovement = store.getMovements().find(m => m.id === id);
    if (updatedMovement?.type === 'entry' && store.syncEntryWithCommande) {
      store.syncEntryWithCommande(updatedMovement.product, updatedMovement.quantity || 0, updatedMovement.date);
    }
    setMovements(store.getMovements());
    showNotif('Mouvement modifié');
    await saveToGitHub();
  };

  const deleteMovement = async (id) => {
    store.deleteMovement(id);
    setMovements(store.getMovements());
    showNotif('Mouvement supprimé');
    await saveToGitHub();
  };

  const readOnly = isReadOnly();

  const contextValue = {
    products, movements, loadData, showNotif, readOnly,
    triggerAutoBackup: saveToGitHub,
    addProduct, updateProduct, deleteProduct,
    addMovement, updateMovement, deleteMovement,
    setPage: setCurrentPage,
    syncFromGitHub, saving, newMovementsCount
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
      case 'inventory': return <Inventory />;
      case 'physical-inventory': return <PhysicalInventory />;
      case 'commandes': return <Commandes />;
      case 'products': return <Products />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-3xl mb-4 animate-pulse shadow-lg">🫐</div>
          <p className="text-gray-500">{isGitHubConfigured() ? 'Chargement depuis GitHub...' : 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">

        {/* Indicateur sauvegarde */}
        {saving && (
          <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:'#1d9e75', color:'white', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Sauvegarde GitHub...
          </div>
        )}
        {newMovementsCount > 0 && (
          <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:'#1d9e75', color:'white', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
            ✅ {newMovementsCount} nouveau(x) mouvement(s) des fermes
          </div>
        )}

        {/* Bandeau d'alerte si GitHub non configuré */}
        {!isGitHubConfigured() && (
          <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9998, background:'#dc2626', color:'white', padding:'10px 16px', fontSize:13, fontWeight:600, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.2)', cursor:'pointer' }}
               onClick={() => setCurrentPage('settings')}>
            ⚠️ GITHUB NON CONFIGURÉ — Les sorties ne sont PAS synchronisées avec les magasiniers ! Cliquez ici pour configurer.
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
        {notification && (
          <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />
        )}
      </div>
    </AppContext.Provider>
  );
}

export default App;
