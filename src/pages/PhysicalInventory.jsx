import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Select, Input, EmptyState, Button } from '../components/UI';
import { FARMS } from '../lib/constants';
import { calculateFarmStock, getAveragePrice, getProducts, getPhysicalInventories, savePhysicalInventory, updatePhysicalInventory, deletePhysicalInventory } from '../lib/store';
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
    const saved = localStorage.getItem('physical_inventory_date');
    if (saved) return saved;
    // Default to the 25th of current month
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-25`;
  });
  const [filterDiff, setFilterDiff] = useState('ALL');
  const [savedInventories, setSavedInventories] = useState(getPhysicalInventories());
  const [viewingInventory, setViewingInventory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [addProductSearch, setAddProductSearch] = useState('');
  const [extraProducts, setExtraProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('physical_inventory_extra_products');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Save extra products to localStorage
  useEffect(() => {
    localStorage.setItem('physical_inventory_extra_products', JSON.stringify(extraProducts));
  }, [extraProducts]);

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

  // Check if date is the 25th (monthly reference day)
  const is25th = inventoryDate && inventoryDate.endsWith('-25');

  // Get which inventory is the active reference for each farm
  const activeReferences = useMemo(() => {
    const refs = {};
    const allInvs = getPhysicalInventories();
    FARMS.forEach(farm => {
      const farmInvs = allInvs
        .filter(inv => inv.farm === farm.id && inv.data)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (farmInvs[0]) refs[farm.id] = farmInvs[0].id;
    });
    return refs;
  }, [savedInventories]);

  // Calculate theoretical stock for selected farm
  const theoreticalStock = useMemo(() => {
    if (!selectedFarm) return [];
    const stockMap = calculateFarmStock(selectedFarm, inventoryDate);
    const allProducts = getProducts();
    
    const result = Object.entries(stockMap)
      .map(([product, data]) => {
        const price = data.price || getAveragePrice(product) || 0;
        const quantity = data.quantity || 0;
        const productInfo = allProducts.find(p => p.name === product);
        return {
          name: product,
          theoretical: Math.max(0, quantity),
          unit: productInfo?.unit || 'KG',
          price,
          category: productInfo?.category || 'AUTRES',
          isExtra: false
        };
      })
      .filter(item => item.theoretical > 0.01);
    
    // Add extra products (not in theoretical stock)
    const existingNames = new Set(result.map(r => r.name));
    extraProducts.forEach(extraName => {
      if (!existingNames.has(extraName)) {
        const productInfo = allProducts.find(p => p.name === extraName);
        const price = getAveragePrice(extraName) || 0;
        result.push({
          name: extraName,
          theoretical: 0,
          unit: productInfo?.unit || 'KG',
          price,
          category: productInfo?.category || 'AUTRES',
          isExtra: true
        });
      }
    });
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedFarm, extraProducts, inventoryDate]);

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

  // Available products to add (not already in theoretical stock)
  const availableProductsToAdd = useMemo(() => {
    if (!selectedFarm) return [];
    const allProducts = getProducts();
    const existingNames = new Set(theoreticalStock.map(t => t.name));
    return allProducts
      .filter(p => !existingNames.has(p.name))
      .filter(p => !addProductSearch || p.name.toLowerCase().includes(addProductSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedFarm, theoreticalStock, addProductSearch]);

  const handleAddExtraProduct = (productName) => {
    setExtraProducts(prev => [...prev, productName]);
    setAddProductSearch('');
    setShowAddProduct(false);
  };

  const handleRemoveExtraProduct = (productName) => {
    setExtraProducts(prev => prev.filter(n => n !== productName));
    setPhysicalStock(prev => {
      const next = { ...prev };
      delete next[productName];
      return next;
    });
  };

  // Remove a product from physical stock (clear its physical value)
  const handleRemoveProduct = (productName) => {
    setPhysicalStock(prev => {
      const next = { ...prev };
      delete next[productName];
      return next;
    });
    // Also remove from extra products if it was added
    setExtraProducts(prev => prev.filter(n => n !== productName));
  };

  // Load a saved inventory for editing
  const handleEditInventory = (inv) => {
    setSelectedFarm(inv.farm);
    setInventoryDate(inv.date);
    setPhysicalStock(inv.data || {});
    setEditingInventoryId(inv.id);
    setViewingInventory(null);
    setMode('new');

    // Restore extra products (products in data but not in theoretical)
    const theoreticalNames = new Set();
    const stockMap = calculateFarmStock(inv.farm);
    Object.entries(stockMap).forEach(([name, data]) => {
      if ((data.quantity || 0) > 0.01) theoreticalNames.add(name);
    });
    const extras = Object.keys(inv.data || {}).filter(name => !theoreticalNames.has(name));
    setExtraProducts(extras);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

    if (editingInventoryId) {
      // Update existing
      updatePhysicalInventory(editingInventoryId, {
        farm: selectedFarm, farmName, date: inventoryDate,
        data: physicalStock, comparison: comparisonResults, stats: { ...stats }
      });
      setEditingInventoryId(null);
      alert(`✅ Inventaire mis à jour pour ${farmName} (${inventoryDate}) !`);
    } else {
      // Create new
      savePhysicalInventory({
        farm: selectedFarm, farmName, date: inventoryDate,
        data: physicalStock, comparison: comparisonResults, stats: { ...stats }
      });
      const msg25 = inventoryDate.endsWith('-25')
        ? `\n\n📌 Ce stock physique est maintenant le stock de référence pour ${farmName} — il sera utilisé comme base du mois prochain.`
        : '';
      alert(`✅ Inventaire sauvegardé pour ${farmName} (${inventoryDate}) !${msg25}`);
    }

    setSavedInventories(getPhysicalInventories());
    triggerAutoBackup();
    
    setPhysicalStock({});
    setExtraProducts([]);
    localStorage.removeItem('physical_inventory_data');
    localStorage.removeItem('physical_inventory_extra_products');
  };

  const handleReset = () => {
    if (window.confirm('Effacer toutes les saisies en cours ?')) {
      setPhysicalStock({});
      setExtraProducts([]);
      setEditingInventoryId(null);
      localStorage.removeItem('physical_inventory_data');
      localStorage.removeItem('physical_inventory_extra_products');
    }
  };

  const handlePrefill = () => {
    if (window.confirm('Pré-remplir avec le stock theorique ? Vous pourrez modifier les valeurs ensuite.')) {
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
    if (editingInventoryId === id) {
      setEditingInventoryId(null);
      setPhysicalStock({});
      setExtraProducts([]);
    }
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
      'Produit\tUnite\tTheorique\tPhysique\tEcart\tEcart %\tValeur Ecart',
      ...comparisonData.filter(i => i.hasPhysical).map(i => 
        `${i.name}\t${i.unit}\t${fmt(i.theoretical)}\t${fmt(i.physical)}\t${fmt(i.diff)}\t${i.diffPercent !== null ? fmt(i.diffPercent) + '%' : '-'}\t${fmtMoney(i.diffValue)}`
      ), '',
      `Total produits: ${stats.total}`, `Avec ecart: ${stats.withDiff}`, `Valeur ecart total: ${fmtMoney(stats.totalDiffValue)}`
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
          <div key={inv.id} className="ios-card" style={{ padding: 0 }}>
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg">🌿</div>
                <div>
                  <h3 className="font-bold text-gray-800">{inv.farmName}</h3>
                  <p className="text-sm text-gray-500">📅 {inv.date.split('-').reverse().join('/')} — {inv.stats?.entered || 0} produits</p>
                </div>
                {activeReferences[inv.farm] === inv.id && (
                  <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1">
                    📌 Référence active
                  </span>
                )}
                {inv.date && inv.date.endsWith('-25') && (
                  <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                    🗓️ Clôture 25
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditInventory(inv)}
                  className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium transition-colors">
                  ✏️ Modifier
                </button>
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
                <p className="text-xs text-gray-500">Ecarts</p>
                <p className="font-bold text-red-600">{inv.stats?.withDiff || 0}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500">Valeur ecart</p>
                <p className={`font-bold ${(inv.stats?.totalDiffValue || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtMoney(inv.stats?.totalDiffValue || 0)}
                </p>
              </div>
            </div>

            {viewingInventory?.id === inv.id && inv.comparison && (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left p-3 font-semibold text-gray-700">PRODUIT</th>
                      <th className="text-center p-3 font-semibold text-gray-500">UNITE</th>
                      <th className="text-right p-3 font-semibold text-blue-600">THEORIQUE</th>
                      <th className="text-right p-3 font-semibold text-green-600">PHYSIQUE</th>
                      <th className="text-right p-3 font-semibold text-gray-700">ECART</th>
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
          </div>
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
          <p className="text-gray-500 text-sm mt-1">Comparer le stock theorique avec le comptage réel</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
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
                onChange={(e) => { setSelectedFarm(e.target.value); setPhysicalStock({}); setExtraProducts([]); localStorage.removeItem('physical_inventory_data'); localStorage.removeItem('physical_inventory_extra_products'); }}
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
                  📝 Pré-remplir avec stock theorique
                </button>
              </Card>
            )}
          </div>

          {!selectedFarm ? (
            <Card className="p-12"><EmptyState icon="🏭" message="Sélectionnez une ferme pour commencer l'inventaire" /></Card>
          ) : (
            <>
              {/* Monthly Reference Banner */}
              {is25th ? (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl flex items-start gap-3">
                  <span className="text-2xl">📌</span>
                  <div>
                    <h3 className="font-bold text-purple-800">Inventaire de clôture mensuelle — 25 du mois</h3>
                    <p className="text-purple-600 text-sm mt-0.5">
                      Le <strong>stock physique sauvegardé aujourd'hui</strong> deviendra le <strong>stock de départ du mois prochain</strong>. 
                      Tous les calculs futurs partiront de ces quantités réelles.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <span className="text-lg">💡</span>
                  <p className="text-amber-700 text-sm">
                    Pour un <strong>inventaire de clôture mensuelle</strong>, choisissez le <strong>25 du mois</strong> — il deviendra le stock de référence du mois suivant.
                  </p>
                </div>
              )}
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
                  <p className="text-red-600 text-xs font-medium">⚠️ Avec ecart</p>
                  <p className="text-2xl font-bold text-red-700">{stats.withDiff}</p>
                </Card>
                <Card className={`p-4 bg-gradient-to-br ${stats.totalDiffValue < 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-green-50 to-green-100 border-green-200'}`}>
                  <p className={`${stats.totalDiffValue < 0 ? 'text-red-600' : 'text-green-600'} text-xs font-medium`}>💰 Valeur ecart</p>
                  <p className={`text-xl font-bold ${stats.totalDiffValue < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {stats.totalDiffValue >= 0 ? '+' : ''}{fmtMoney(stats.totalDiffValue)}
                  </p>
                </Card>
              </div>

              {/* Editing Banner */}
              {editingInventoryId && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium text-yellow-800">✏️ Mode modification — vous éditez un inventaire existant</span>
                  <button onClick={() => { setEditingInventoryId(null); setPhysicalStock({}); setExtraProducts([]); }}
                    className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded-lg text-xs font-medium">
                    ✖ Annuler
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {stats.entered > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button onClick={handleSaveInventory}
                    className={`px-5 py-2.5 ${editingInventoryId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-xl font-medium transition-colors text-sm shadow-lg`}>
                    {editingInventoryId ? '✏️ Mettre à jour' : '💾 Sauvegarder'}
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
                <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} style={{ flex: 1 }} />
                <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium text-sm sm:w-52">
                  <option value="ALL">📊 Tous les produits</option>
                  <option value="ecart">⚠️ Avec ecart</option>
                  <option value="manquant">🔻 Manquants</option>
                  <option value="excedent">🔺 Excédents</option>
                  <option value="ok">✅ Conformes</option>
                  <option value="pending">⏳ Non saisis</option>
                </select>
                <button onClick={() => setShowAddProduct(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors text-sm shadow-lg whitespace-nowrap">
                  ➕ Ajouter un produit
                </button>
              </div>

              {/* Comparison Table */}
              <div className="ios-card" style={{ padding: 0 }}>
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <span className="text-gray-700 font-medium">{comparisonData.length} produits</span>
                  <span className="text-xs text-gray-500">
                    {FARMS.find(f => f.id === selectedFarm)?.name} — {inventoryDate.split('-').reverse().join('/')}
                  </span>
                </div>
                {comparisonData.length === 0 ? (
                  <div className="p-8"><EmptyState icon="📭" message="Aucun produit trouvé" /></div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="text-left p-4 font-semibold text-gray-700">PRODUIT</th>
                          <th className="text-center p-4 font-semibold text-gray-500">UNITE</th>
                          <th className="text-right p-4 font-semibold text-blue-600">📊 THEORIQUE</th>
                          <th className="text-center p-4 font-semibold text-green-600 min-w-[140px]">✏️ PHYSIQUE</th>
                          <th className="text-center p-4 font-semibold text-gray-700">ECART</th>
                          <th className="text-right p-4 font-semibold text-gray-500">VALEUR ECART</th>
                          <th className="text-center p-4 font-semibold text-gray-500">STATUT</th>
                          <th className="text-center p-4 font-semibold text-gray-400 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((item) => (
                          <tr key={item.name} className={`border-b transition-colors ${
                            item.isExtra ? 'bg-orange-50/50 hover:bg-orange-50' :
                            item.status === 'manquant' ? 'bg-red-50/50 hover:bg-red-50' :
                            item.status === 'excedent' ? 'bg-blue-50/50 hover:bg-blue-50' :
                            item.status === 'ok' ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-gray-50'
                          }`}>
                            <td className="p-4 font-medium text-gray-800">
                              <div className="flex items-center gap-2">
                                {item.name}
                                {item.isExtra && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-bold">AJOUTÉ</span>
                                )}
                                {item.isExtra && (
                                  <button onClick={() => handleRemoveExtraProduct(item.name)}
                                    className="ml-1 text-red-400 hover:text-red-600 text-xs" title="Retirer ce produit">✕</button>
                                )}
                              </div>
                            </td>
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
                            <td className="p-2 text-center">
                              {item.hasPhysical && (
                                <button onClick={() => handleRemoveProduct(item.name)}
                                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex items-center justify-center mx-auto"
                                  title="Supprimer ce produit">
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Summary */}
              {stats.entered > 0 && stats.withDiff > 0 && (
                <Card className="p-5 border-l-4 border-orange-400 bg-orange-50/50">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h3 className="font-bold text-gray-800">Résumé de l'inventaire</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Sur {stats.entered} produits saisis, {stats.withDiff} présentent un ecart 
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

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-2">➕ Ajouter un produit</h3>
            <p className="text-gray-500 text-sm mb-4">Sélectionnez un produit qui n'est pas dans le stock theorique</p>
            <input
              type="text"
              placeholder="🔍 Rechercher un produit..."
              value={addProductSearch}
              onChange={(e) => setAddProductSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent mb-3"
              autoFocus
            />
            <div className="flex-1 overflow-y-auto min-h-0 border rounded-xl">
              {availableProductsToAdd.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm">{addProductSearch ? 'Aucun produit trouvé' : 'Tous les produits sont déjà dans la liste'}</p>
                </div>
              ) : (
                availableProductsToAdd.map(p => (
                  <button key={p.name} onClick={() => handleAddExtraProduct(p.name)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b last:border-b-0 transition-colors flex items-center justify-between group">
                    <div>
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{p.unit || 'KG'}</span>
                      {p.category && <span className="text-xs text-gray-400 ml-2">• {p.category}</span>}
                    </div>
                    <span className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">+</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => { setShowAddProduct(false); setAddProductSearch(''); }}
              className="mt-4 w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🗑️ Supprimer l'inventaire ?</h3>
            <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
            <div style={{ display: "flex", gap: 12 }}>
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
