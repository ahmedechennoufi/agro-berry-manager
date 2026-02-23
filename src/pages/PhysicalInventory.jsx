import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Select, Input, EmptyState, Button } from '../components/UI';
import { FARMS } from '../lib/constants';
import { calculateFarmStock, getAveragePrice, getProducts, getPhysicalInventories, savePhysicalInventory, deletePhysicalInventory } from '../lib/store';
import { fmt, fmtMoney, downloadPhysicalInventoryExcel } from '../lib/utils';

const PhysicalInventory = () => {
  const { products, triggerAutoBackup } = useApp();
  const [mode, setMode] = useState('new');
  const [selectedFarm, setSelectedFarm] = useState(() => {
    return localStorage.getItem('physical_inventory_farm') || '';
  });
  const [search, setSearch] = useState('');
  const [physicalStock, setPhysicalStock] = useState(() => {
    try {
      const saved = localStorage.getItem('physical_inventory_data');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [inventoryDate, setInventoryDate] = useState(() => {
    return localStorage.getItem('physical_inventory_date') || new Date().toISOString().split('T')[0];
  });
  const [filterDiff, setFilterDiff] = useState('ALL');
  const [savedInventories, setSavedInventories] = useState(getPhysicalInventories());
  const [viewingInventory, setViewingInventory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Save draft to localStorage
  useEffect(() => {
    localStorage.setItem('physical_inventory_farm', selectedFarm);
  }, [selectedFarm]);

  useEffect(() => {
    localStorage.setItem('physical_inventory_data', JSON.stringify(physicalStock));
  }, [physicalStock]);

  useEffect(() => {
    localStorage.setItem('physical_inventory_date', inventoryDate);
  }, [inventoryDate]);

  // Calculate theoretical stock for selected farm
  const theoreticalStock = useMemo(() => {
    if (!selectedFarm) return [];
    const stockMap = calculateFarmStock(selectedFarm);
    const allProducts = getProducts();
    
    return Object.entries(stockMap)
      .map(([product, data]) => {
        const price = data.price || getAveragePrice(product) || 0;
        const quantity = data.quantity || 0;
        const productInfo = allProducts.find(p => p.name === product);
        return {
          name: product,
          theoretical: Math.max(0, quantity),
          unit: productInfo?.unit || 'KG',
          price,
          category: productInfo?.category || 'AUTRES'
        };
      })
      .filter(item => item.theoretical > 0.01)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedFarm]);

  // Comparison data
  const comparisonData = useMemo(() => {
    return theoreticalStock
      .map(item => {
        const physical = physicalStock[item.name];
        const hasPhysical = physical !== undefined && physical !== '';
        const physicalQty = hasPhysical ? parseFloat(physical) || 0 : null;
        const diff = hasPhysical ? physicalQty - item.theoretical : null;
        const diffPercent = hasPhysical && item.theoretical > 0 
          ? ((diff / item.theoretical) * 100) 
          : null;
        
        let status = 'pending';
        if (hasPhysical) {
          if (Math.abs(diff) < 0.01) status = 'ok';
          else if (diff < 0) status = 'manquant';
          else status = 'excedent';
        }

        return {
          ...item,
          physical: physicalQty,
          hasPhysical,
          diff,
          diffPercent,
          diffValue: hasPhysical ? diff * item.price : null,
          status
        };
      })
      .filter(item => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filterDiff === 'ALL' 
          || (filterDiff === 'ecart' && item.hasPhysical && Math.abs(item.diff) > 0.01)
          || (filterDiff === 'ok' && item.status === 'ok')
          || (filterDiff === 'manquant' && item.status === 'manquant')
          || (filterDiff === 'excedent' && item.status === 'excedent')
          || (filterDiff === 'pending' && !item.hasPhysical);
        return matchSearch && matchFilter;
      });
  }, [theoreticalStock, physicalStock, search, filterDiff]);

  // Stats
  const stats = useMemo(() => {
    const entered = theoreticalStock.filter(i => physicalStock[i.name] !== undefined && physicalStock[i.name] !== '');
    const withDiff = entered.filter(i => {
      const physical = parseFloat(physicalStock[i.name]) || 0;
      return Math.abs(physical - i.theoretical) > 0.01;
    });
    const totalDiffValue = entered.reduce((sum, i) => {
      const physical = parseFloat(physicalStock[i.name]) || 0;
      const diff = physical - i.theoretical;
      return sum + diff * i.price;
    }, 0);

    return {
      total: theoreticalStock.length,
      entered: entered.length,
      withDiff: withDiff.length,
      ok: entered.length - withDiff.length,
      totalDiffValue,
      progress: theoreticalStock.length > 0 ? (entered.length / theoreticalStock.length * 100) : 0
    };
  }, [theoreticalStock, physicalStock]);

  const handlePhysicalChange = useCallback((productName, value) => {
    setPhysicalStock(prev => ({ ...prev, [productName]: value }));
  }, []);

  // Save inventory to store + trigger GitHub backup
  const handleSaveInventory = () => {
    if (stats.entered === 0) {
      alert('⚠️ Aucune saisie à sauvegarder.');
      return;
    }
    const farmName = FARMS.find(f => f.id === selectedFarm)?.name || selectedFarm;
    
    const comparisonResults = comparisonData.filter(i => i.hasPhysical).map(i => ({
      name: i.name, unit: i.unit, theoretical: i.theoretical, physical: i.physical,
      diff: i.diff, diffPercent: i.diffPercent, diffValue: i.diffValue, status: i.status
    }));

    savePhysicalInventory({
      farm: selectedFarm, farmName, date: inventoryDate,
      data: physicalStock, comparison: comparisonResults, stats: { ...stats }
    });

    setSavedInventories(getPhysicalInventories());
    triggerAutoBackup();
    
    setPhysicalStock({});
    localStorage.removeItem('physical_inventory_data');
    alert(`✅ Inventaire sauvegardé pour ${farmName} (${inventoryDate}) et synchronisé avec GitHub !`);
  };

  const handleReset = () => {
    if (window.confirm('Effacer toutes les saisies en cours ?')) {
      setPhysicalStock({});
      localStorage.removeItem('physical_inventory_data');
    }
  };

  const handlePrefill = () => {
    if (window.confirm('Pré-remplir avec le stock théorique ? Vous pourrez modifier les valeurs ensuite.')) {
      const prefilled = {};
      theoreticalStock.forEach(item => { prefilled[item.name] = item.theoretical.toString(); });
      setPhysicalStock(prefilled);
    }
  };

  const handleDeleteInventory = (id) => {
    deletePhysicalInventory(id);
    setSavedInventories(getPhysicalInventories());
    triggerAutoBackup();
    setShowDeleteConfirm(null);
    if (viewingInventory?.id === id) setViewingInventory(null);
  };

  const handleExportExcel = async () => {
    const farmName = FARMS.find(f => f.id === selectedFarm)?.name || selectedFarm;
    await downloadPhysicalInventoryExcel(comparisonData, farmName, inventoryDate, stats);
  };

  const handleExportSavedExcel = async (inv) => {
    await downloadPhysicalInventoryExcel(inv.comparison, inv.farmName, inv.date, inv.stats);
  };

  const handleCopy = () => {
    const farmName = FARMS.find(f => f.id === selectedFarm)?.name || selectedFarm;
    const lines = [
      `INVENTAIRE PHYSIQUE - ${farmName}`, `Date: ${inventoryDate}`, '',
      'Produit\tUnité\tThéorique\tPhysique\tÉcart\tÉcart %\tValeur Écart',
      ...comparisonData.filter(i => i.hasPhysical).map(i => 
        `${i.name}\t${i.unit}\t${fmt(i.theoretical)}\t${fmt(i.physical)}\t${fmt(i.diff)}\t${i.diffPercent !== null ? fmt(i.diffPercent) + '%' : '-'}\t${fmtMoney(i.diffValue)}`
      ), '',
      `Total produits: ${stats.total}`, `Avec écart: ${stats.withDiff}`, `Valeur écart total: ${fmtMoney(stats.totalDiffValue)}`
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => alert('✅ Copié !'));
  };

  const getStatusBadge = (status, diff, diffPercent) => {
    switch (status) {
      case 'ok': return <span className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold">✅ OK</span>;
      case 'manquant': return <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">🔻 {fmt(Math.abs(diff))} ({fmt(Math.abs(diffPercent))}%)</span>;
      case 'excedent': return <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">🔺 +{fmt(diff)} (+{fmt(diffPercent)}%)</span>;
      default: return <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs">⏳ En attente</span>;
    }
  };

  // ========== HISTORY VIEW ==========
  const renderHistory = () => {
    const sorted = [...savedInventories].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <Card className="p-12"><EmptyState icon="📭" message="Aucun inventaire sauvegardé" /></Card>
        ) : sorted.map(inv => (
          <Card key={inv.id} className="p-0 overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg">🌿</div>
                <div>
                  <h3 className="font-bold text-gray-800">{inv.farmName}</h3>
                  <p className="text-sm text-gray-500">📅 {inv.date.split('-').reverse().join('/')} — {inv.stats?.entered || 0} produits</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewingInventory(viewingInventory?.id === inv.id ? null : inv)}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors">
                  {viewingInventory?.id === inv.id ? '🔼 Masquer' : '🔽 Détails'}
                </button>
                <button onClick={() => handleExportSavedExcel(inv)}
                  className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-medium transition-colors">
                  📥 Excel
                </button>
                <button onClick={() => setShowDeleteConfirm(inv.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors">
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-0 border-b">
              <div className="p-3 text-center border-r">
                <p className="text-xs text-gray-500">Produits</p>
                <p className="font-bold text-blue-600">{inv.stats?.total || 0}</p>
              </div>
              <div className="p-3 text-center border-r">
                <p className="text-xs text-gray-500">Conformes</p>
                <p className="font-bold text-green-600">{inv.stats?.ok || 0}</p>
              </div>
              <div className="p-3 text-center border-r">
                <p className="text-xs text-gray-500">Écarts</p>
                <p className="font-bold text-red-600">{inv.stats?.withDiff || 0}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500">Valeur écart</p>
                <p className={`font-bold ${(inv.stats?.totalDiffValue || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtMoney(inv.stats?.totalDiffValue || 0)}
                </p>
              </div>
            </div>

            {viewingInventory?.id === inv.id && inv.comparison && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left p-3 font-semibold text-gray-700">PRODUIT</th>
                      <th className="text-center p-3 font-semibold text-gray-500">UNITÉ</th>
                      <th className="text-right p-3 font-semibold text-blue-600">THÉORIQUE</th>
                      <th className="text-right p-3 font-semibold text-green-600">PHYSIQUE</th>
                      <th className="text-right p-3 font-semibold text-gray-700">ÉCART</th>
                      <th className="text-center p-3 font-semibold text-gray-500">STATUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.comparison.map((item, idx) => (
                      <tr key={idx} className={`border-b ${
                        item.status === 'manquant' ? 'bg-red-50/50' :
                        item.status === 'excedent' ? 'bg-blue-50/50' :
                        item.status === 'ok' ? 'bg-green-50/50' : ''
                      }`}>
                        <td className="p-3 font-medium text-gray-800">{item.name}</td>
                        <td className="p-3 text-center text-gray-500">{item.unit}</td>
                        <td className="p-3 text-right text-blue-600">{fmt(item.theoretical)}</td>
                        <td className="p-3 text-right text-green-600">{fmt(item.physical)}</td>
                        <td className={`p-3 text-right font-bold ${
                          item.diff < -0.01 ? 'text-red-600' : item.diff > 0.01 ? 'text-blue-600' : 'text-green-600'
                        }`}>{item.diff > 0 ? `+${fmt(item.diff)}` : fmt(item.diff)}</td>
                        <td className="p-3 text-center">{getStatusBadge(item.status, item.diff, item.diffPercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔍 Inventaire Physique</h1>
          <p className="text-gray-500 text-sm mt-1">Comparer le stock théorique avec le comptage réel</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setMode('new')}
          className={`px-5 py-3 rounded-xl font-medium transition-all ${
            mode === 'new' ? 'bg-green-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
          ✏️ Nouveau
        </button>
        <button onClick={() => setMode('history')}
          className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            mode === 'history' ? 'bg-green-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
          📋 Historique
          {savedInventories.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              mode === 'history' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
              {savedInventories.length}
            </span>
          )}
        </button>
      </div>

      {mode === 'history' ? renderHistory() : (
        <>
          {/* Farm & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">🏭 Ferme</label>
              <select value={selectedFarm}
                onChange={(e) => { setSelectedFarm(e.target.value); setPhysicalStock({}); localStorage.removeItem('physical_inventory_data'); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                <option value="">-- Choisir une ferme --</option>
                {FARMS.map(f => <option key={f.id} value={f.id}>🌿 {f.name}</option>)}
              </select>
            </Card>
            <Card className="p-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">📅 Date inventaire</label>
              <input type="date" value={inventoryDate} onChange={(e) => setInventoryDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" />
            </Card>
            {selectedFarm && (
              <Card className="p-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">⚡ Actions rapides</label>
                <button onClick={handlePrefill}
                  className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-medium transition-colors text-sm border border-blue-200">
                  📝 Pré-remplir avec stock théorique
                </button>
              </Card>
            )}
          </div>

          {!selectedFarm ? (
            <Card className="p-12"><EmptyState icon="🏭" message="Sélectionnez une ferme pour commencer l'inventaire" /></Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <p className="text-blue-600 text-xs font-medium">📦 Produits</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <p className="text-purple-600 text-xs font-medium">✏️ Saisis</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.entered}/{stats.total}</p>
                  <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }} />
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <p className="text-green-600 text-xs font-medium">✅ Conformes</p>
                  <p className="text-2xl font-bold text-green-700">{stats.ok}</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <p className="text-red-600 text-xs font-medium">⚠️ Avec écart</p>
                  <p className="text-2xl font-bold text-red-700">{stats.withDiff}</p>
                </Card>
                <Card className={`p-4 bg-gradient-to-br ${stats.totalDiffValue < 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-green-50 to-green-100 border-green-200'}`}>
                  <p className={`${stats.totalDiffValue < 0 ? 'text-red-600' : 'text-green-600'} text-xs font-medium`}>💰 Valeur écart</p>
                  <p className={`text-xl font-bold ${stats.totalDiffValue < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {stats.totalDiffValue >= 0 ? '+' : ''}{fmtMoney(stats.totalDiffValue)}
                  </p>
                </Card>
              </div>

              {/* Action Buttons */}
              {stats.entered > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleSaveInventory}
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors text-sm shadow-lg">
                    💾 Sauvegarder
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-medium transition-colors text-sm">
                    📥 Excel
                  </button>
                  <button onClick={handleCopy}
                    className="px-4 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl font-medium transition-colors text-sm">
                    📋 Copier
                  </button>
                  <button onClick={handleReset}
                    className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-medium transition-colors text-sm">
                    🗑️ Réinitialiser
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} className="flex-1" />
                <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium text-sm sm:w-52">
                  <option value="ALL">📊 Tous les produits</option>
                  <option value="ecart">⚠️ Avec écart</option>
                  <option value="manquant">🔻 Manquants</option>
                  <option value="excedent">🔺 Excédents</option>
                  <option value="ok">✅ Conformes</option>
                  <option value="pending">⏳ Non saisis</option>
                </select>
              </div>

              {/* Comparison Table */}
              <Card className="overflow-hidden p-0">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <span className="text-gray-700 font-medium">{comparisonData.length} produits</span>
                  <span className="text-xs text-gray-500">
                    {FARMS.find(f => f.id === selectedFarm)?.name} — {inventoryDate.split('-').reverse().join('/')}
                  </span>
                </div>
                {comparisonData.length === 0 ? (
                  <div className="p-8"><EmptyState icon="📭" message="Aucun produit trouvé" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="text-left p-4 font-semibold text-gray-700">PRODUIT</th>
                          <th className="text-center p-4 font-semibold text-gray-500">UNITÉ</th>
                          <th className="text-right p-4 font-semibold text-blue-600">📊 THÉORIQUE</th>
                          <th className="text-center p-4 font-semibold text-green-600 min-w-[140px]">✏️ PHYSIQUE</th>
                          <th className="text-center p-4 font-semibold text-gray-700">ÉCART</th>
                          <th className="text-right p-4 font-semibold text-gray-500">VALEUR ÉCART</th>
                          <th className="text-center p-4 font-semibold text-gray-500">STATUT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((item) => (
                          <tr key={item.name} className={`border-b transition-colors ${
                            item.status === 'manquant' ? 'bg-red-50/50 hover:bg-red-50' :
                            item.status === 'excedent' ? 'bg-blue-50/50 hover:bg-blue-50' :
                            item.status === 'ok' ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-gray-50'
                          }`}>
                            <td className="p-4 font-medium text-gray-800">{item.name}</td>
                            <td className="p-4 text-center text-gray-500">{item.unit}</td>
                            <td className="p-4 text-right text-blue-600 font-semibold">{fmt(item.theoretical)}</td>
                            <td className="p-3 text-center">
                              <input type="number" step="0.01" min="0"
                                value={physicalStock[item.name] ?? ''} onChange={(e) => handlePhysicalChange(item.name, e.target.value)}
                                placeholder="—"
                                className={`w-full max-w-[120px] mx-auto px-3 py-2 rounded-lg border text-center font-semibold transition-all focus:ring-2 focus:ring-green-400 focus:border-transparent ${
                                  item.status === 'manquant' ? 'border-red-300 bg-red-50 text-red-700' :
                                  item.status === 'excedent' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                                  item.status === 'ok' ? 'border-green-300 bg-green-50 text-green-700' :
                                  'border-gray-200 bg-white text-gray-700'}`} />
                            </td>
                            <td className={`p-4 text-center font-bold ${
                              item.diff === null ? 'text-gray-400' : item.diff < -0.01 ? 'text-red-600' : item.diff > 0.01 ? 'text-blue-600' : 'text-green-600'
                            }`}>{item.diff === null ? '—' : item.diff > 0 ? `+${fmt(item.diff)}` : fmt(item.diff)}</td>
                            <td className={`p-4 text-right font-medium ${
                              item.diffValue === null ? 'text-gray-400' : item.diffValue < 0 ? 'text-red-600' : item.diffValue > 0 ? 'text-blue-600' : 'text-green-600'
                            }`}>{item.diffValue === null ? '—' : fmtMoney(item.diffValue)}</td>
                            <td className="p-4 text-center">{getStatusBadge(item.status, item.diff, item.diffPercent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Summary */}
              {stats.entered > 0 && stats.withDiff > 0 && (
                <Card className="p-5 border-l-4 border-orange-400 bg-orange-50/50">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h3 className="font-bold text-gray-800">Résumé de l'inventaire</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Sur {stats.entered} produits saisis, {stats.withDiff} présentent un écart 
                        pour une valeur totale de <span className={`font-bold ${stats.totalDiffValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {stats.totalDiffValue >= 0 ? '+' : ''}{fmtMoney(stats.totalDiffValue)}
                        </span>.
                        {stats.total - stats.entered > 0 && (
                          <> Il reste <span className="font-bold text-orange-600">{stats.total - stats.entered} produits</span> à saisir.</>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🗑️ Supprimer l'inventaire ?</h3>
            <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">Annuler</button>
              <button onClick={() => handleDeleteInventory(showDeleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">🗑️ Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicalInventory;
