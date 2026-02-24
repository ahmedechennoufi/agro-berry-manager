import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, StatCard } from '../components/UI';
import { downloadJSON, readFile } from '../lib/utils';
import { exportAllData, importAllData, clearAllData, getProducts, getMovements, getSuppliers, getConsommations, getStockAB1, getStockAB2, getStockAB3 } from '../lib/store';
import { 
  getGitHubConfig, saveGitHubConfig, clearGitHubConfig, isGitHubConfigured,
  backupToGitHub, restoreFromGitHub, testGitHubConnection, getLastBackupInfo,
  getAutoBackupStatus
} from '../lib/githubBackup';

const Settings = () => {
  const { products, movements, loadData, showNotif, readOnly } = useApp();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  // GitHub state
  const [ghConfigOpen, setGhConfigOpen] = useState(false);
  const [ghToken, setGhToken] = useState('');
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghStatus, setGhStatus] = useState('idle');
  const [ghMessage, setGhMessage] = useState('');
  const [ghBacking, setGhBacking] = useState(false);
  const [ghRestoring, setGhRestoring] = useState(false);
  const [ghLastBackup, setGhLastBackup] = useState(null);

  useEffect(() => {
    const config = getGitHubConfig();
    if (config.token) {
      setGhToken(config.token);
      setGhOwner(config.owner || '');
      setGhRepo(config.repo || '');
      if (config.token && config.owner && config.repo) {
        setGhStatus('connected');
        getLastBackupInfo().then(info => {
          if (info) setGhLastBackup(info);
        });
      }
    }
  }, []);

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
      if (data.cultures) {
        await importFromCoutApp(data);
        showNotif('✅ Données Coût importées');
      } else if (data.stockMovements || data.products) {
        await importFromStockApp(data);
        showNotif('✅ Données Stock importées');
      } else if (data.movements) {
        if (importAllData(data)) { showNotif('✅ Backup restauré'); }
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
    const existingNames = new Set(existing.products.map(p => p.name));
    const newProducts = (data.products || []).filter(p => !existingNames.has(p.name));
    const existingIds = new Set(existing.movements.map(m => m.id));
    const newMovements = (data.stockMovements || []).filter(m => !existingIds.has(m.id));
    const allSuppliers = [...new Set([...existing.suppliers, ...(data.suppliers || [])])];
    importAllData({
      ...existing,
      products: [...existing.products, ...newProducts],
      movements: [...existing.movements, ...newMovements],
      suppliers: allSuppliers,
      stockAB1: data.stockAB1 || existing.stockAB1,
      stockAB2: data.stockAB2 || existing.stockAB2,
      stockAB3: data.stockAB3 || existing.stockAB3
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
            (prod.qte || []).forEach((qte, monthIdx) => {
              if (qte > 0) {
                newConsommations.push({
                  id: Date.now() + Math.random(), farm: farmId, culture: cultureName,
                  category, product: prod.nom, quantity: qte, price: prod.prix || 0,
                  monthIndex: monthIdx, nature: prod.nature || ''
                });
              }
            });
          }
        }
      }
    }
    importAllData({ ...existing, consommations: [...existing.consommations, ...newConsommations] });
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

  // === GITHUB HANDLERS ===
  const handleTestConnection = async () => {
    if (!ghToken || !ghOwner || !ghRepo) {
      setGhMessage('Remplissez tous les champs');
      setGhStatus('error');
      return;
    }
    setGhStatus('testing');
    setGhMessage('Test de connexion...');
    try {
      const result = await testGitHubConnection(ghToken, ghOwner, ghRepo);
      saveGitHubConfig({ token: ghToken, owner: ghOwner, repo: ghRepo });
      setGhStatus('connected');
      setGhMessage(`✅ Connecté à ${result.repoName}`);
      setGhConfigOpen(false);
      const info = await getLastBackupInfo();
      if (info) setGhLastBackup(info);
      showNotif('✅ GitHub connecté');
    } catch (err) {
      setGhStatus('error');
      setGhMessage(`❌ ${err.message}`);
    }
  };

  const handleGitHubBackup = async () => {
    setGhBacking(true);
    try {
      const data = exportAllData();
      const result = await backupToGitHub(data);
      setGhLastBackup({ date: result.date, url: result.url });
      showNotif('✅ Backup GitHub réussi !');
    } catch (err) {
      showNotif(`❌ Erreur: ${err.message}`, 'error');
    }
    setGhBacking(false);
  };

  const handleGitHubRestore = async () => {
    if (!confirm('Restaurer les données depuis GitHub ?\nCela remplacera vos données actuelles.')) return;
    setGhRestoring(true);
    try {
      const data = await restoreFromGitHub();
      if (importAllData(data)) {
        loadData();
        showNotif('✅ Données restaurées depuis GitHub !');
      } else {
        showNotif('❌ Erreur lors de la restauration', 'error');
      }
    } catch (err) {
      showNotif(`❌ ${err.message}`, 'error');
    }
    setGhRestoring(false);
  };

  const handleDisconnectGitHub = () => {
    if (confirm('Déconnecter GitHub ? Votre token sera supprimé.')) {
      clearGitHubConfig();
      setGhToken(''); setGhOwner(''); setGhRepo('');
      setGhStatus('idle'); setGhMessage(''); setGhLastBackup(null);
      showNotif('GitHub déconnecté');
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
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

      {/* ☁️ GitHub Backup */}
      <Card className="border-2 border-blue-100">
        <h3 className="font-semibold text-ios-dark mb-2">☁️ Sauvegarde GitHub</h3>
        <p className="text-sm text-ios-gray mb-3">Backup en ligne gratuit à vie sur votre GitHub</p>

        {ghStatus === 'connected' && !ghConfigOpen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-green-50 p-3 rounded-xl">
              <span className="text-green-500 text-lg">🟢</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Connecté à GitHub</p>
                <p className="text-xs text-green-600">{ghOwner}/{ghRepo}</p>
              </div>
            </div>

            {ghLastBackup && (
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-xs text-ios-gray">Dernier backup : {formatDate(ghLastBackup.date)}</p>
              </div>
            )}

            {/* Auto-backup status */}
            <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-2">
              <span className="text-blue-500">🔄</span>
              <p className="text-xs text-blue-700">Auto-backup activé — sauvegarde 2 min après chaque modification</p>
            </div>

            <div className="flex gap-2">
              <button onClick={handleGitHubBackup} disabled={ghBacking}
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl font-medium text-sm hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50">
                {ghBacking ? '⏳ Sauvegarde...' : '☁️ Sauvegarder'}
              </button>
              <button onClick={handleGitHubRestore} disabled={ghRestoring}
                className="flex-1 bg-green-500 text-white py-3 px-4 rounded-xl font-medium text-sm hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-50">
                {ghRestoring ? '⏳ Restauration...' : '📥 Restaurer'}
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setGhConfigOpen(true)} className="flex-1 text-ios-gray text-xs py-2 hover:text-ios-dark">
                ⚙️ Modifier config
              </button>
              <button onClick={handleDisconnectGitHub} className="flex-1 text-red-400 text-xs py-2 hover:text-red-600">
                🔌 Déconnecter
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!ghConfigOpen && ghStatus !== 'connected' && (
              <button onClick={() => setGhConfigOpen(true)}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-medium text-sm hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                Connecter GitHub
              </button>
            )}

            {ghConfigOpen && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                <div>
                  <label className="text-xs font-medium text-ios-gray block mb-1">Propriétaire (username)</label>
                  <input type="text" value={ghOwner} onChange={(e) => setGhOwner(e.target.value.trim())}
                    placeholder="ahmedechennoufi"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ios-gray block mb-1">Repository</label>
                  <input type="text" value={ghRepo} onChange={(e) => setGhRepo(e.target.value.trim())}
                    placeholder="agro-berry-manager"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ios-gray block mb-1">Personal Access Token</label>
                  <input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value.trim())}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                  <p className="text-xs text-ios-gray mt-1">
                    GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate → Cocher "repo"
                  </p>
                </div>

                {ghMessage && (
                  <p className={`text-xs ${ghStatus === 'error' ? 'text-red-500' : ghStatus === 'connected' ? 'text-green-500' : 'text-ios-gray'}`}>
                    {ghMessage}
                  </p>
                )}

                <div className="flex gap-2">
                  <button onClick={handleTestConnection} disabled={ghStatus === 'testing'}
                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-blue-600 disabled:opacity-50">
                    {ghStatus === 'testing' ? '⏳ Test...' : '🔗 Connecter'}
                  </button>
                  <button onClick={() => { setGhConfigOpen(false); setGhMessage(''); }}
                    className="px-3 py-2 text-ios-gray text-sm hover:text-ios-dark">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Export JSON */}
      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">📤 Exporter les données</h3>
        <p className="text-sm text-ios-gray mb-3">Créer une sauvegarde locale (JSON)</p>
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
        <Card>
          <h3 className="font-semibold text-ios-dark mb-2">🔄 Réinitialiser</h3>
          <p className="text-sm text-ios-gray mb-3">Recharger les données initiales importées</p>
          <Button variant="orange" onClick={handleResetToInitial}>Réinitialiser</Button>
        </Card>
        <Card className="border-2 border-red-100">
          <h3 className="font-semibold text-ios-red mb-2">⚠️ Zone Danger</h3>
          <p className="text-sm text-ios-gray mb-3">Supprimer toutes les données. Cette action est irréversible !</p>
          <Button variant="danger" onClick={handleClear}>Tout supprimer</Button>
        </Card>
      </>}

      <Card>
        <h3 className="font-semibold text-ios-dark mb-2">ℹ️ À propos</h3>
        <div className="text-sm text-ios-gray space-y-1">
          <p><strong>Agro Berry Manager</strong> v5.4</p>
          <p>Application unifiée Stock + Coût Production</p>
          <p className="text-ios-green">✅ Données synchronisées automatiquement</p>
          <p>☁️ Backup GitHub intégré</p>
          <p>© 2026 Agro Berry</p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
