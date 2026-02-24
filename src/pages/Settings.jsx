import React, { useRef } from 'react';
import { useApp } from '../App';
import { Card, Button } from '../components/UI';
import { downloadJSON, readFile } from '../lib/utils';
import { exportAllData, importAllData, clearAllData } from '../lib/store';

const Settings = () => {
  const { products, movements, loadData, showNotif } = useApp();
  const fileInputRef = useRef(null);

  const handleExport = () => { downloadJSON(exportAllData(), `backup-${new Date().toISOString().split('T')[0]}.json`); showNotif('✅ Exporté'); };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const content = await readFile(file);
      if (importAllData(JSON.parse(content))) { loadData(); showNotif('✅ Importé'); }
    } catch { showNotif('❌ Erreur', 'error'); }
    e.target.value = '';
  };
  const handleImportOld = () => {
    try {
      ['products', 'stockMovements', 'stockHistoryEdits', 'allDataV5'].forEach(key => { const old = localStorage.getItem(key); if (old) localStorage.setItem(key, old); });
      loadData(); showNotif('✅ Importé');
    } catch { showNotif('❌ Erreur', 'error'); }
  };
  const handleClear = () => { if (confirm('⚠️ Tout supprimer ?') && confirm('Confirmer ?')) { clearAllData(); loadData(); showNotif('Effacé'); } };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Paramètres</h1>
        <p className="text-ios-gray text-sm mt-1">Configuration</p>
      </div>
      <Card>
        <h3 className="font-semibold text-ios-dark mb-3">📊 Statistiques</h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-ios-gray">Produits</span><span className="font-medium">{products.length}</span></div>
          <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-ios-gray">Mouvements</span><span className="font-medium">{movements.length}</span></div>
          <div className="flex justify-between py-2"><span className="text-ios-gray">Stockage</span><span className="font-medium text-ios-green">LocalStorage</span></div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">📥 Importer ancienne app</h3>
        <p className="text-xs text-ios-gray mb-3">Récupérer les données</p>
        <Button variant="orange" onClick={handleImportOld}>Importer</Button>
      </Card>
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">📤 Exporter</h3>
        <p className="text-xs text-ios-gray mb-3">Sauvegarde JSON</p>
        <Button variant="secondary" onClick={handleExport}>Exporter</Button>
      </Card>
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">📁 Importer fichier</h3>
        <p className="text-xs text-ios-gray mb-3">Restaurer sauvegarde</p>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        <Button variant="secondary" onClick={handleImportClick}>Choisir fichier</Button>
      </Card>
      <Card>
        <h3 className="font-semibold text-ios-red mb-2">🗑 Supprimer tout</h3>
        <p className="text-xs text-ios-gray mb-3">⚠️ Irréversible</p>
        <Button variant="danger" onClick={handleClear}>Supprimer</Button>
      </Card>
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">ℹ️ À propos</h3>
        <p className="text-sm text-ios-gray">Agro Berry Manager v2.0</p>
        <p className="text-xs text-ios-gray mt-1">© 2025 Agro Berry</p>
      </Card>
    </div>
  );
};
export default Settings;
