import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Input, EmptyState } from '../components/UI';
import { fmt, fmtMoney, downloadStyledInventoryExcel } from '../lib/utils';
import { getMovements, getProducts, getAveragePrice, getPhysicalInventories } from '../lib/store';
import stockHistoryData from '../lib/stockHistory.json';

// Months for the season (Sept 2025 - Aug 2026)
const SEASON_MONTHS = [
  { id: 'SEPTEMBRE', name: 'Septembre 2025', date: '2025-09-25' },
  { id: 'OCTOBRE', name: 'Octobre 2025', date: '2025-10-25' },
  { id: 'NOVEMBRE', name: 'Novembre 2025', date: '2025-11-25' },
  { id: 'DECEMBRE', name: 'Décembre 2025', date: '2025-12-25' },
  { id: 'JANVIER', name: 'Janvier 2026', date: '2026-01-25' },
  { id: 'FEVRIER', name: 'Février 2026', date: '2026-02-25' },
  { id: 'MARS', name: 'Mars 2026', date: '2026-03-25' },
  { id: 'AVRIL', name: 'Avril 2026', date: '2026-04-25' }
];

const Inventory = () => {
  const { products, movements } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('DECEMBRE');
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingMonth, setPendingMonth] = useState(null);

  // Get selected month info
  const selectedMonthInfo = SEASON_MONTHS.find(m => m.id === selectedMonth);
  const inventoryDate = selectedMonthInfo?.date || '2025-12-25';

  // Get stock data - from physical inventory OR imported history OR calculated
  const stockData = useMemo(() => {
    // Filter function
    const filterProduct = (p) => {
      const hasStock = p.total > 0.01;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchFarm = selectedFarm === 'ALL' || 
        (selectedFarm === 'AB1' && p.AB1 > 0) ||
        (selectedFarm === 'AB2' && p.AB2 > 0) ||
        (selectedFarm === 'AB3' && p.AB3 > 0);
      return hasStock && matchSearch && matchFarm;
    };
    
    // Check for physical inventories for this month
    const physInvs = getPhysicalInventories();
    const monthYM = inventoryDate.substring(0, 7); // YYYY-MM
    const farmMapping = {
      'AGRO BERRY 1': 'AB1',
      'AGRO BERRY 2': 'AB2', 
      'AGRO BERRY 3': 'AB3'
    };
    
    // Group physical inventories by farm for this month (keep latest per farm)
    const physByFarm = {};
    physInvs.forEach(inv => {
      if (!inv.date || !inv.data || !inv.farm) return;
      const invYM = inv.date.substring(0, 7);
      if (invYM !== monthYM) return;
      const farmKey = farmMapping[inv.farm];
      if (!farmKey) return;
      if (!physByFarm[farmKey] || inv.date >= (physByFarm[farmKey].date || '')) {
        physByFarm[farmKey] = inv;
      }
    });
    
    const physFarms = Object.keys(physByFarm); // e.g. ['AB1', 'AB2', 'AB3']
    const hasPhysical = physFarms.length > 0;
    
    if (hasPhysical) {
      // === USE PHYSICAL INVENTORY DATA ===
      const productMap = {};
      const allProducts = getProducts();
      
      // For farms WITH physical inventory, use that data
      physFarms.forEach(farmKey => {
        const inv = physByFarm[farmKey];
        if (!inv.data) return;
        Object.entries(inv.data).forEach(([product, qty]) => {
          const quantity = parseFloat(qty) || 0;
          if (quantity > 0) {
            if (!productMap[product]) {
              const pInfo = allProducts.find(p => p.name === product);
              productMap[product] = {
                name: product,
                unit: pInfo?.unit || 'KG',
                price: getAveragePrice(product) || 0,
                AB1: 0, AB2: 0, AB3: 0
              };
            }
            productMap[product][farmKey] = quantity;
          }
        });
      });
      
      // For farms WITHOUT physical inventory, use calculated data (from history or movements)
      const farmsWithoutPhys = ['AB1', 'AB2', 'AB3'].filter(f => !physFarms.includes(f));
      if (farmsWithoutPhys.length > 0) {
        const hasImported = stockHistoryData[selectedMonth] !== undefined;
        if (hasImported) {
          const monthData = stockHistoryData[selectedMonth];
          farmsWithoutPhys.forEach(farm => {
            (monthData[farm] || []).forEach(item => {
              if (!productMap[item.product]) {
                productMap[item.product] = {
                  name: item.product,
                  unit: item.unit || 'KG',
                  price: item.price || getAveragePrice(item.product) || 0,
                  AB1: 0, AB2: 0, AB3: 0
                };
              }
              productMap[item.product][farm] = item.quantity || 0;
            });
          });
        }
        // Could also calculate from movements for missing farms, but physical inventory
        // should be done per farm, so this is a fallback
      }
      
      return Object.values(productMap)
        .map(p => ({
          ...p,
          total: p.AB1 + p.AB2 + p.AB3,
          value: (p.AB1 + p.AB2 + p.AB3) * p.price
        }))
        .filter(p => filterProduct(p))
        .sort((a, b) => b.value - a.value);
    }
    
    // === FALLBACK: imported data or calculated ===
    const hasImportedData = stockHistoryData[selectedMonth] !== undefined;
    
    if (hasImportedData) {
      // Use imported data
      const monthData = stockHistoryData[selectedMonth];
      const productMap = {};
      
      ['AB1', 'AB2', 'AB3'].forEach(farm => {
        (monthData[farm] || []).forEach(item => {
          if (!productMap[item.product]) {
            productMap[item.product] = {
              name: item.product,
              unit: item.unit || 'KG',
              price: item.price || 0,
              AB1: 0, AB2: 0, AB3: 0
            };
          }
          productMap[item.product][farm] = item.quantity || 0;
          if (item.price > 0) productMap[item.product].price = item.price;
        });
      });

      return Object.values(productMap)
        .map(p => ({
          ...p,
          total: p.AB1 + p.AB2 + p.AB3,
          value: (p.AB1 + p.AB2 + p.AB3) * p.price
        }))
        .filter(p => filterProduct(p))
        .sort((a, b) => b.value - a.value);
    } else {
      // Calculate from previous month + movements
      const monthIdx = SEASON_MONTHS.findIndex(m => m.id === selectedMonth);
      if (monthIdx <= 0) return [];
      
      // Find last month with data
      let baseMonthIdx = monthIdx - 1;
      while (baseMonthIdx >= 0 && !stockHistoryData[SEASON_MONTHS[baseMonthIdx].id]) {
        baseMonthIdx--;
      }
      if (baseMonthIdx < 0) return [];
      
      const baseMonth = SEASON_MONTHS[baseMonthIdx];
      const baseData = stockHistoryData[baseMonth.id];
      const productMap = {};
      
      // Start with base month data
      ['AB1', 'AB2', 'AB3'].forEach(farm => {
        (baseData[farm] || []).forEach(item => {
          if (!productMap[item.product]) {
            productMap[item.product] = {
              name: item.product,
              unit: item.unit || 'KG',
              price: item.price || getAveragePrice(item.product) || 0,
              AB1: 0, AB2: 0, AB3: 0
            };
          }
          productMap[item.product][farm] = item.quantity || 0;
        });
      });
      
      // Add products from product list
      getProducts().forEach(p => {
        if (!productMap[p.name]) {
          productMap[p.name] = {
            name: p.name,
            unit: p.unit || 'KG',
            price: getAveragePrice(p.name) || 0,
            AB1: 0, AB2: 0, AB3: 0
          };
        }
      });
      
      // Apply movements from base month date to selected month date
      const startDate = baseMonth.date;
      const endDate = inventoryDate;
      
      getMovements()
        .filter(m => m.date && m.date > startDate && m.date <= endDate)
        .forEach(m => {
          const product = m.product;
          if (!product) return;
          
          if (!productMap[product]) {
            productMap[product] = {
              name: product,
              unit: 'KG',
              price: getAveragePrice(product) || 0,
              AB1: 0, AB2: 0, AB3: 0
            };
          }
          
          const data = productMap[product];
          const qty = m.quantity || 0;
          const farm = m.farm || '';
          
          // Entrées
          if (m.type === 'transfer-in' || m.type === 'exit') {
            if (farm.includes('1')) data.AB1 += qty;
            else if (farm.includes('2')) data.AB2 += qty;
            else if (farm.includes('3')) data.AB3 += qty;
          }
          // Sorties
          if (m.type === 'transfer-out') {
            if (farm.includes('1')) data.AB1 -= qty;
            else if (farm.includes('2')) data.AB2 -= qty;
            else if (farm.includes('3')) data.AB3 -= qty;
          }
          // Consommations
          if (m.type === 'consumption') {
            if (farm.includes('1')) data.AB1 -= qty;
            else if (farm.includes('2')) data.AB2 -= qty;
            else if (farm.includes('3')) data.AB3 -= qty;
          }
        });
      
      return Object.values(productMap)
        .map(p => ({
          ...p,
          total: p.AB1 + p.AB2 + p.AB3,
          value: (p.AB1 + p.AB2 + p.AB3) * p.price
        }))
        .filter(p => filterProduct(p))
        .sort((a, b) => b.value - a.value);
    }
  }, [selectedMonth, search, selectedFarm, movements, inventoryDate]);

  // Totals
  const totals = useMemo(() => {
    return stockData.reduce((t, p) => ({
      products: t.products + 1,
      totalQty: t.totalQty + p.total,
      totalValue: t.totalValue + p.value
    }), { products: 0, totalQty: 0, totalValue: 0 });
  }, [stockData]);

  // Check data source
  const hasImportedData = stockHistoryData[selectedMonth] !== undefined;
  
  // Check if physical inventory exists for this month
  const physicalInfo = useMemo(() => {
    const physInvs = getPhysicalInventories();
    const monthYM = inventoryDate.substring(0, 7);
    const farmMapping = {
      'AGRO BERRY 1': 'AB1',
      'AGRO BERRY 2': 'AB2',
      'AGRO BERRY 3': 'AB3'
    };
    const farms = [];
    const dates = [];
    physInvs.forEach(inv => {
      if (!inv.date || !inv.data || !inv.farm) return;
      if (inv.date.substring(0, 7) !== monthYM) return;
      const fk = farmMapping[inv.farm];
      if (fk && !farms.includes(fk)) {
        farms.push(fk);
        dates.push(inv.date);
      }
    });
    return { hasPhysical: farms.length > 0, farms, latestDate: dates.sort().pop() || inventoryDate };
  }, [inventoryDate, movements]);

  // Handle month click - show export modal
  const handleMonthClick = (monthInfo) => {
    setPendingMonth(monthInfo);
    setShowExportModal(true);
  };

  // Export current month data to Excel
  const exportMonthData = async (monthId, monthName) => {
    const data = stockData.map(p => ({
      Produit: p.name,
      Unité: p.unit,
      'AGB 1': p.AB1,
      'AGB 2': p.AB2,
      'AGB 3': p.AB3,
      'Total': p.total,
      'Prix Unit.': p.price,
      'Valeur': p.value
    }));
    await downloadStyledInventoryExcel(data, monthName || monthId, totals);
  };

  // Confirm export and select month
  const handleExportConfirm = async () => {
    if (pendingMonth) {
      setSelectedMonth(pendingMonth.id);
      // Wait for state update then export
      setTimeout(async () => {
        await exportMonthData(pendingMonth.id, pendingMonth.name);
      }, 100);
    }
    setShowExportModal(false);
    setPendingMonth(null);
  };

  // Just select month without export
  const handleSelectOnly = () => {
    if (pendingMonth) {
      setSelectedMonth(pendingMonth.id);
    }
    setShowExportModal(false);
    setPendingMonth(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Historique Stock</h1>
          <p className="text-gray-500 text-sm mt-1">Stock des mois précédents - Campagne 2025-2026</p>
        </div>
      </div>

      {/* Month Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SEASON_MONTHS.map(m => {
          const hasData = stockHistoryData[m.id] !== undefined;
          const monthIdx = SEASON_MONTHS.findIndex(mo => mo.id === m.id);
          const canCalculate = monthIdx > 0;
          const isAvailable = hasData || canCalculate;
          
          // Check if this month has physical inventory
          const mYM = m.date.substring(0, 7);
          const hasPhysForMonth = getPhysicalInventories().some(inv => 
            inv.date && inv.date.substring(0, 7) === mYM && inv.data
          );
          
          return (
            <button
              key={m.id}
              onClick={() => handleMonthClick(m)}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                selectedMonth === m.id
                  ? 'bg-green-500 text-white shadow-lg'
                  : isAvailable
                    ? 'bg-white text-gray-600 hover:bg-gray-50 border'
                    : 'bg-gray-100 text-gray-400 border cursor-not-allowed'
              }`}
            >
              <div className="text-sm font-bold">{m.name.toUpperCase()}</div>
              <div className="text-xs opacity-75">{m.date.split('-').reverse().join('/')}</div>
              {hasPhysForMonth && (
                <div className={`text-xs mt-1 ${selectedMonth === m.id ? 'text-green-100' : 'text-green-600'}`}>📋 Physique</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-blue-600 text-sm font-medium flex items-center gap-2">📦 Produits</p>
          <p className="text-3xl font-bold text-blue-700">{totals.products}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-green-600 text-sm font-medium flex items-center gap-2">💰 Valeur Totale</p>
          <p className="text-2xl font-bold text-green-700">{fmtMoney(totals.totalValue)}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-purple-600 text-sm font-medium flex items-center gap-2">📊 Quantité Totale</p>
          <p className="text-2xl font-bold text-purple-700">{fmt(totals.totalQty)}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <p className="text-yellow-600 text-sm font-medium flex items-center gap-2">📅 Date Inventaire</p>
          <p className="text-2xl font-bold text-yellow-700">
            {physicalInfo.hasPhysical ? physicalInfo.latestDate.split('-').reverse().join('/') : inventoryDate.split('-').reverse().join('/')}
          </p>
          {physicalInfo.hasPhysical ? (
            <p className="text-xs text-green-600 font-semibold mt-1">📋 Inventaire Physique</p>
          ) : !hasImportedData ? (
            <p className="text-xs text-yellow-600 mt-1">Calculé</p>
          ) : null}
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input 
          placeholder="🔍 Rechercher un produit..." 
          value={search} 
          onChange={setSearch} 
          style={{ flex: 1 }} 
        />
        <Select 
          value={selectedFarm} 
          onChange={setSelectedFarm}
          options={[
            { value: 'ALL', label: '🏭 Toutes les fermes' },
            { value: 'AB1', label: '🌿 Agro Berry 1' },
            { value: 'AB2', label: '🌱 Agro Berry 2' },
            { value: 'AB3', label: '🌾 Agro Berry 3' }
          ]}
          className="sm:w-48"
        />
      </div>

      {/* Stock Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">{stockData.length} produits</span>
            {physicalInfo.hasPhysical && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                📋 Inventaire Physique
                {physicalInfo.farms.length < 3 && ` (${physicalInfo.farms.join(', ')})`}
              </span>
            )}
            {!physicalInfo.hasPhysical && !hasImportedData && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                📊 Calculé depuis mouvements
              </span>
            )}
          </div>
        </div>
        
        {stockData.length === 0 ? (
          <div className="p-8"><EmptyState icon="📭" message="Aucun stock pour ce mois" /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-4 font-semibold text-gray-700">PRODUIT</th>
                  <th className="text-center p-4 font-semibold text-gray-500">UNITÉ</th>
                  <th className="text-right p-4 font-semibold text-blue-600">🌿 AGB 1</th>
                  <th className="text-right p-4 font-semibold text-green-600">🌱 AGB 2</th>
                  <th className="text-right p-4 font-semibold text-purple-600">🌾 AGB 3</th>
                  <th className="text-right p-4 font-semibold text-gray-700">TOTAL</th>
                  <th className="text-right p-4 font-semibold text-gray-500">PRIX UNIT.</th>
                  <th className="text-right p-4 font-semibold text-green-600">VALEUR</th>
                </tr>
              </thead>
              <tbody>
                {stockData.map((p, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{p.name}</td>
                    <td className="p-4 text-center text-gray-500">{p.unit}</td>
                    <td className="p-4 text-right text-blue-600">{p.AB1 > 0.01 ? fmt(p.AB1) : '-'}</td>
                    <td className="p-4 text-right text-green-600">{p.AB2 > 0.01 ? fmt(p.AB2) : '-'}</td>
                    <td className="p-4 text-right text-purple-600">{p.AB3 > 0.01 ? fmt(p.AB3) : '-'}</td>
                    <td className="p-4 text-right font-bold text-gray-800">{fmt(p.total)}</td>
                    <td className="p-4 text-right text-gray-500">{fmt(p.price)}</td>
                    <td className="p-4 text-right font-bold text-green-600">{fmtMoney(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Export Confirmation Modal */}
      {showExportModal && pendingMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              📥 {pendingMonth.name}
            </h3>
            <p className="text-gray-600 mb-6">
              Voulez-vous exporter l'inventaire de ce mois en Excel ?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleSelectOnly}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Non, juste voir
              </button>
              <button
                onClick={handleExportConfirm}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
              >
                ✅ Oui, exporter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
