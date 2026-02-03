import React, { useRef, useState } from 'react';
import { useApp } from '../App';
import { Card, Button, StatCard } from '../components/UI';
import { downloadJSON, readFile } from '../lib/utils';
import { exportAllData, importAllData, clearAllData, getProducts, getMovements, getSuppliers, getConsommations, getStockAB1, getStockAB2, getStockAB3 } from '../lib/store';

const Settings = () => {
  const { products, movements, loadData, showNotif, readOnly } = useApp();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const stats = {
    products: getProducts().length,
    movements: getMovements().length,
    suppliers: getSuppliers().length,
    consommations: getConsommations().length,
    stockAB1: getStockAB1().length,
    stockAB2: getStockAB2().length,
    stockAB3: getStockAB3().length
  };

  const handleExport = () => { 
    downloadJSON(exportAllData(), `agro-berry-backup-${new Date().toISOString().split('T')[0]}.json`); 
    showNotif('✅ Backup exporté'); 
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    setImporting(true);
    try {
      const content = await readFile(file);
      const data = JSON.parse(content);
      
      // Détecter le type de fichier
      if (data.cultures) {
        // Import depuis app Coût
        await importFromCoutApp(data);
        showNotif('✅ Données Coût importées');
      } else if (data.stockMovements || data.products) {
        // Import depuis app Stock
        await importFromStockApp(data);
        showNotif('✅ Données Stock importées');
      } else if (data.movements) {
        // Import backup complet
        if (importAllData(data)) {
          showNotif('✅ Backup restauré');
        }
      } else {
        showNotif('❌ Format non reconnu', 'error');
      }
      
      loadData();
    } catch (err) {
      console.error('Import error:', err);
      showNotif('❌ Erreur import', 'error');
    }
    setImporting(false);
    e.target.value = '';
  };

  const importFromStockApp = async (data) => {
    const existing = exportAllData();
    
    // Fusionner produits
    const existingNames = new Set(existing.products.map(p => p.name));
    const newProducts = (data.products || []).filter(p => !existingNames.has(p.name));
    const allProducts = [...existing.products, ...newProducts];
    
    // Fusionner mouvements
    const existingIds = new Set(existing.movements.map(m => m.id));
    const newMovements = (data.stockMovements || []).filter(m => !existingIds.has(m.id));
    const allMovements = [...existing.movements, ...newMovements];
    
    // Fusionner fournisseurs
    const allSuppliers = [...new Set([...existing.suppliers, ...(data.suppliers || [])])];
    
    // Stock initial
    const stockAB1 = data.stockAB1 || existing.stockAB1;
    const stockAB2 = data.stockAB2 || existing.stockAB2;
    const stockAB3 = data.stockAB3 || existing.stockAB3;
    
    importAllData({
      ...existing,
      products: allProducts,
      movements: allMovements,
      suppliers: allSuppliers,
      stockAB1,
      stockAB2,
      stockAB3
    });
  };

  const importFromCoutApp = async (data) => {
    const existing = exportAllData();
    const newConsommations = [];
    
    const cultures = data.cultures || {};
    for (const [fermeName, fermeData] of Object.entries(cultures)) {
      let farmId = 'AGRO BERRY 1';
      if (fermeName.includes('2')) farmId = 'AGRO BERRY 2';
      else if (fermeName.includes('3')) farmId = 'AGRO BERRY 3';
      
      for (const [cultureName, cultureData] of Object.entries(fermeData)) {
        for (const [category, productsList] of Object.entries(cultureData)) {
          for (const prod of productsList) {
            const qteArray = prod.qte || [];
            qteArray.forEach((qte, monthIdx) => {
              if (qte > 0) {
                newConsommations.push({
                  id: Date.now() + Math.random(),
                  farm: farmId,
                  culture: cultureName,
                  category,
                  product: prod.nom,
                  quantity: qte,
                  price: prod.prix || 0,
                  monthIndex: monthIdx,
                  nature: prod.nature || ''
                });
              }
            });
          }
        }
      }
    }
    
    importAllData({
      ...existing,
      consommations: [...existing.consommations, ...newConsommations]
    });
  };

  const handleClear = () => { 
    if (confirm('⚠️ Supprimer TOUTES les données ?')) {
      if (confirm('Cette action est irréversible. Confirmer ?')) {
        clearAllData(); 
        localStorage.removeItem('agro_initialized_v3');
        loadData(); 
        showNotif('Données effacées');
        window.location.reload();
      }
    }
  };

  const handleResetToInitial = () => {
    if (confirm('Réinitialiser avec les données importées ?')) {
      localStorage.removeItem('agro_initialized_v3');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Paramètres</h1>
        <p className="text-ios-gray text-sm mt-1">Configuration & sauvegarde</p>
      </div>

      {/* Stats */}
      <Card>
        <h3 className="font-semibold text-ios-dark mb-4">📊 Statistiques</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-ios-gray">Produits</span>
            <span className="font-semibold text-ios-blue">{stats.products}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-ios-gray">Mouvements</span>
            <span className="font-semibold text-ios-green">{stats.movements}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-ios-gray">Fournisseurs</span>
            <span className="font-semibold">{stats.suppliers}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-ios-gray">Consommations</span>
            <span className="font-semibold text-ios-red">{stats.consommations}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-ios-gray">Stock Initial</span>
            <span className="font-semibold">AB1: {stats.stockAB1} | AB2: {stats.stockAB2} | AB3: {stats.stockAB3}</span>
          </div>
        </div>
      </Card>

      {/* Export */}
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">📤 Exporter les données</h3>
        <p className="text-sm text-ios-gray mb-3">Créer une sauvegarde complète (JSON)</p>
        <Button variant="secondary" onClick={handleExport}>Exporter backup</Button>
      </Card>

      {/* Import */}
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">📥 Importer des données</h3>
        <p className="text-sm text-ios-gray mb-3">
          Importer depuis :
          <br />• Un backup JSON de cette app
          <br />• Un export de l'app Stock (stock-backup-*.json)
          <br />• Un export de l'app Coût (agro-berry-cout-*.json)
        </p>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        <Button variant="secondary" onClick={handleImportClick} disabled={importing}>
          {importing ? 'Import en cours...' : 'Choisir fichier JSON'}
        </Button>
      </Card>

      {!readOnly && <>
        {/* Reset */}
        <Card>
          <h3 className="font-semibold text-ios-dark mb-2">🔄 Réinitialiser</h3>
          <p className="text-sm text-ios-gray mb-3">Recharger les données initiales importées</p>
          <Button variant="orange" onClick={handleResetToInitial}>Réinitialiser</Button>
        </Card>

        {/* Danger Zone */}
        <Card className="border-2 border-red-100">
          <h3 className="font-semibold text-ios-red mb-2">⚠️ Zone Danger</h3>
          <p className="text-sm text-ios-gray mb-3">Supprimer toutes les données. Cette action est irréversible !</p>
          <Button variant="danger" onClick={handleClear}>Tout supprimer</Button>
        </Card>
      </>}

      {/* About */}
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">ℹ️ À propos</h3>
        <div className="text-sm text-ios-gray space-y-1">
          <p><strong>Agro Berry Manager</strong> v4.7</p>
          <p>Application unifiée Stock + Coût Production</p>
          <p className="text-ios-green">✅ Données synchronisées automatiquement</p>
          <p>© 2026 Agro Berry</p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
