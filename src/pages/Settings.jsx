import React, { useState, useRef } from 'react';
import { useApp } from '../App';
import { Card, Button } from '../components/UI';
import { downloadJSON, readFile } from '../lib/utils';

const Settings = () => {
  const { products, movements, exportData, importData, importFromOldApp, clearData, showNotif } = useApp();
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const data = exportData();
    const date = new Date().toISOString().split('T')[0];
    downloadJSON(data, `agro-berry-backup-${date}.json`);
    showNotif('Export réussi !');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const content = await readFile(file);
      const data = JSON.parse(content);
      
      if (importData(data)) {
        showNotif('Données importées avec succès');
      }
    } catch (error) {
      showNotif('Erreur lors de l\'import: fichier invalide', 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleImportFromOldApp = () => {
    if (confirm('Importer les données depuis l\'ancienne application ?')) {
      importFromOldApp();
    }
  };

  const handleClear = () => {
    if (confirm('⚠️ Supprimer TOUTES les données ?')) {
      if (confirm('Dernière confirmation: êtes-vous sûr ?')) {
        clearData();
      }
    }
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Paramètres</h1>
        <p className="text-gray-500">Configuration et gestion des données</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Stats */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">📊 Statistiques</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Produits</span>
              <span className="font-medium">{products.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Mouvements</span>
              <span className="font-medium">{movements.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Stockage</span>
              <span className="font-medium text-green-600">LocalStorage</span>
            </div>
          </div>
        </Card>

        {/* Import from old app */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-2">📥 Importer depuis l'ancienne application</h3>
          <p className="text-sm text-gray-500 mb-4">
            Récupère les données de l'ancienne application (agro-berry-stock et agro-berry-cout)
          </p>
          <Button onClick={handleImportFromOldApp} disabled={importing}>
            {importing ? 'Import en cours...' : 'Importer'}
          </Button>
        </Card>

        {/* Export */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-2">📤 Exporter les données</h3>
          <p className="text-sm text-gray-500 mb-4">
            Télécharge une sauvegarde de toutes vos données au format JSON
          </p>
          <Button variant="secondary" onClick={handleExport}>
            Exporter (JSON)
          </Button>
        </Card>

        {/* Import */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-2">📥 Importer une sauvegarde</h3>
          <p className="text-sm text-gray-500 mb-4">
            Restaurer les données depuis un fichier de sauvegarde
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="secondary" onClick={handleImportClick} disabled={importing}>
            {importing ? 'Import en cours...' : 'Importer un fichier'}
          </Button>
        </Card>

        {/* Clear data */}
        <Card className="border-red-200">
          <h3 className="font-bold text-red-600 mb-2">🗑️ Supprimer toutes les données</h3>
          <p className="text-sm text-gray-500 mb-4">
            Attention: cette action est irréversible ! Faites une sauvegarde avant.
          </p>
          <Button variant="danger" onClick={handleClear}>
            Supprimer tout
          </Button>
        </Card>

        {/* About */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">ℹ️ À propos</h3>
          <div className="text-sm text-gray-500 space-y-1">
            <p><strong>Agro Berry Manager</strong> v1.0</p>
            <p>Application de gestion de stock et coûts de production</p>
            <p className="pt-2">
              Les données sont stockées localement dans votre navigateur.
              Pensez à exporter régulièrement vos données pour éviter de les perdre.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
