import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Select, Input, Badge, EmptyState } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { calculateFarmStock } from '../lib/store';
import stockHistoryData from '../lib/stockHistory.json';

const STORAGE_KEY = 'agro_stock_history_v1';

const History = () => {
  const { movements, products } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingMonth, setPendingMonth] = useState(null);

  // Load history from localStorage + initial data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let savedHistory = saved ? JSON.parse(saved) : [];
    
    // Month name to date mapping
    const monthDates = {
      'SEPTEMBRE': { date: '2025-09-25', month: 'Septembre 2025' },
      'OCTOBRE': { date: '2025-10-25', month: 'Octobre 2025' },
      'NOVEMBRE': { date: '2025-11-25', month: 'Novembre 2025' },
      'DECEMBRE': { date: '2025-12-25', month: 'Décembre 2025' },
      'DECEMBRE_2025': { date: '2025-12-25', month: 'Décembre 2025' },
      'JANVIER': { date: '2026-01-25', month: 'Janvier 2026' },
      'FEVRIER': { date: '2026-02-25', month: 'Février 2026' },
      'MARS': { date: '2026-03-25', month: 'Mars 2026' },
      'AVRIL': { date: '2026-04-25', month: 'Avril 2026' }
    };
    
    // Convert stockHistoryData object to array
    const stockHistoryArray = Object.entries(stockHistoryData)
      .filter(([key]) => key !== 'DECEMBRE_2025') // Skip duplicate
      .map(([key, value]) => ({
        ...value,
        month: value.name || monthDates[key]?.month || key,
        date: value.date || monthDates[key]?.date || '2025-01-25'
      }));
    
    // Merge with initial data (don't duplicate)
    const existingDates = savedHistory.map(h => h.date);
    stockHistoryArray.forEach(h => {
      if (!existingDates.includes(h.date)) {
        savedHistory.push(h);
      }
    });
    
    // Sort by date
    savedHistory.sort((a, b) => a.date.localeCompare(b.date));
    setHistory(savedHistory);
    
    // Save merged
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedHistory));
    
    // Select latest month
    if (savedHistory.length > 0) {
      setSelectedMonth(savedHistory[savedHistory.length - 1].date);
    }
  }, []);

  // Calculate current stock (January)
  const currentStock = useMemo(() => {
    const ab1 = calculateFarmStock('AGRO BERRY 1');
    const ab2 = calculateFarmStock('AGRO BERRY 2');
    const ab3 = calculateFarmStock('AGRO BERRY 3');
    
    const formatStock = (stock) => {
      return Object.entries(stock)
        .filter(([_, data]) => data.quantity > 0)
        .map(([product, data]) => ({
          product,
          quantity: data.quantity,
          price: data.price || 0
        }));
    };
    
    return {
      date: '2026-01-25',
      month: 'Janvier',
      AB1: formatStock(ab1),
      AB2: formatStock(ab2),
      AB3: formatStock(ab3),
      isCalculated: true
    };
  }, [movements]);

  // All months including calculated January
  const allMonths = useMemo(() => {
    const months = [...history];
    
    // Add January if not exists
    if (!months.find(m => m.date === '2026-01-25')) {
      months.push(currentStock);
    }
    
    return months.sort((a, b) => a.date.localeCompare(b.date));
  }, [history, currentStock]);

  // Get selected month data
  const selectedData = useMemo(() => {
    return allMonths.find(m => m.date === selectedMonth) || null;
  }, [allMonths, selectedMonth]);

  // Get unit for product
  const getProductUnit = (productName) => {
    const product = products.find(p => p.name?.toUpperCase() === productName?.toUpperCase());
    return product?.unit || 'KG';
  };

  // Get products for display
  const displayProducts = useMemo(() => {
    if (!selectedData) return [];
    
    const productMap = {};
    
    ['AB1', 'AB2', 'AB3'].forEach(farm => {
      (selectedData[farm] || []).forEach(item => {
        const key = item.product.toUpperCase();
        if (!productMap[key]) {
          productMap[key] = { 
            product: key, 
            AB1: 0, 
            AB2: 0, 
            AB3: 0, 
            price: item.price || 0,
            unit: getProductUnit(item.product)
          };
        }
        productMap[key][farm] = item.quantity;
        if (item.price > 0) productMap[key].price = item.price;
      });
    });
    
    let productsList = Object.values(productMap);
    
    // Filter by farm
    if (selectedFarm !== 'ALL') {
      const farmKey = selectedFarm.replace('AGRO BERRY ', 'AB');
      productsList = productsList.filter(p => p[farmKey] > 0);
    }
    
    // Filter by search
    if (search) {
      productsList = productsList.filter(p => 
        p.product.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Calculate totals
    productsList.forEach(p => {
      p.total = p.AB1 + p.AB2 + p.AB3;
      p.value = p.total * p.price;
    });
    
    return productsList.sort((a, b) => b.value - a.value);
  }, [selectedData, selectedFarm, search, products]);

  // Stats
  const stats = useMemo(() => {
    const totalQty = displayProducts.reduce((s, p) => s + p.total, 0);
    const totalValue = displayProducts.reduce((s, p) => s + p.value, 0);
    
    return {
      nbProducts: displayProducts.length,
      totalValue,
      totalQty,
      date: selectedData?.date || ''
    };
  }, [displayProducts, selectedData]);

  // Save January snapshot
  const saveJanuarySnapshot = () => {
    const newHistory = history.filter(h => h.date !== '2026-01-25');
    newHistory.push({ ...currentStock, isCalculated: false });
    newHistory.sort((a, b) => a.date.localeCompare(b.date));
    
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    setSelectedMonth('2026-01-25');
  };

  // Handle month click - show export option
  const handleMonthClick = (monthData) => {
    setPendingMonth(monthData);
    setShowExportModal(true);
  };

  // Export specific month data
  const exportMonthData = async (monthData) => {
    if (!monthData) return;
    
    const productMap = {};
    ['AB1', 'AB2', 'AB3'].forEach(farm => {
      (monthData[farm] || []).forEach(item => {
        const key = item.product?.toUpperCase();
        if (!productMap[key]) {
          productMap[key] = { product: item.product, AB1: 0, AB2: 0, AB3: 0, price: item.price || 0 };
        }
        productMap[key][farm] = item.quantity || 0;
        if (item.price) productMap[key].price = item.price;
      });
    });
    
    const data = Object.values(productMap).map(p => {
      const total = (p.AB1 || 0) + (p.AB2 || 0) + (p.AB3 || 0);
      const unit = products.find(pr => pr.name?.toUpperCase() === p.product?.toUpperCase())?.unit || 'KG';
      return {
        Produit: p.product,
        Unité: unit,
        'AGB 1': p.AB1,
        'AGB 2': p.AB2,
        'AGB 3': p.AB3,
        'Total': total,
        'Prix Unit.': p.price,
        'Valeur': total * p.price
      };
    });
    
    await downloadExcel(data, `stock-${monthData.month || 'inventaire'}.xlsx`);
  };

  // Confirm export and select month
  const handleExportConfirm = async () => {
    if (pendingMonth) {
      await exportMonthData(pendingMonth);
      setSelectedMonth(pendingMonth.date);
    }
    setShowExportModal(false);
    setPendingMonth(null);
  };

  // Just select month without export
  const handleSelectOnly = () => {
    if (pendingMonth) {
      setSelectedMonth(pendingMonth.date);
    }
    setShowExportModal(false);
    setPendingMonth(null);
  };

  const handleExport = async () => {
    const data = displayProducts.map(p => ({
      Produit: p.product,
      Unité: p.unit,
      'AGB 1': p.AB1,
      'AGB 2': p.AB2,
      'AGB 3': p.AB3,
      'Total': p.total,
      'Prix Unit.': p.price,
      'Valeur': p.value
    }));
    await downloadExcel(data, `historique-${selectedData?.month || 'stock'}.xlsx`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            📅 Historique Stock
          </h1>
          <p className="text-gray-500 mt-1">Stock des mois précédents - Campagne 2025-2026</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2"
          >
            📥 Export Excel
          </button>
          {selectedData?.isCalculated && (
            <button 
              onClick={saveJanuarySnapshot} 
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg"
            >
              💾 Sauvegarder
            </button>
          )}
        </div>
      </div>

      {/* Month Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allMonths.map(m => (
          <button
            key={m.date}
            onClick={() => handleMonthClick(m)}
            className={`p-4 rounded-xl font-medium transition-all text-center ${
              selectedMonth === m.date
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300 hover:shadow'
            }`}
          >
            <div className="text-lg font-bold uppercase">{m.month}</div>
            <div className="text-sm opacity-70">{formatDate(m.date)}</div>
            {m.isCalculated && <span className="text-xs">⚡ Calculé</span>}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {selectedData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">📦 Produits</p>
            <p className="text-3xl font-bold text-blue-700">{stats.nbProducts}</p>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-xs text-green-600 font-medium mb-1">💰 Valeur Totale</p>
            <p className="text-2xl font-bold text-green-700">{fmtMoney(stats.totalValue)}</p>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <p className="text-xs text-purple-600 font-medium mb-1">📊 Quantité Totale</p>
            <p className="text-2xl font-bold text-purple-700">{fmt(stats.totalQty)}</p>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
            <p className="text-xs text-amber-600 font-medium mb-1">📅 Date Inventaire</p>
            <p className="text-2xl font-bold text-amber-700">{formatDate(stats.date)}</p>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input 
              placeholder="🔍 Rechercher un produit..." 
              value={search} 
              onChange={setSearch}
            />
          </div>
          <Select 
            value={selectedFarm} 
            onChange={setSelectedFarm}
            options={[
              { value: 'ALL', label: 'Toutes les fermes' },
              ...FARMS.map(f => ({ value: f.id, label: f.name }))
            ]}
            className="md:w-52"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {/* Table Header with Export Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <span className="text-gray-700 font-medium">{displayProducts.length} produits</span>
          <button 
            onClick={handleExport} 
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow flex items-center gap-2"
          >
            📥 Exporter Excel
          </button>
        </div>
        {!selectedData ? (
          <div className="p-6">
            <EmptyState icon="📅" message="Sélectionnez un mois" />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="📦" message="Aucun produit trouvé" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-700">PRODUIT</th>
                  <th className="text-center p-4 font-semibold text-gray-700 w-20">UNITÉ</th>
                  <th className="text-right p-4 font-semibold text-gray-700 w-28">
                    <span className="text-green-600">🌿</span> AGB 1
                  </th>
                  <th className="text-right p-4 font-semibold text-gray-700 w-28">
                    <span className="text-blue-600">🌱</span> AGB 2
                  </th>
                  <th className="text-right p-4 font-semibold text-gray-700 w-28">
                    <span className="text-purple-600">🪴</span> AGB 3
                  </th>
                  <th className="text-right p-4 font-semibold text-gray-900 w-28 bg-gray-100">TOTAL</th>
                  <th className="text-right p-4 font-semibold text-gray-700 w-24">PRIX UNIT.</th>
                  <th className="text-right p-4 font-semibold text-green-600 w-32">VALEUR</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map((p, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{p.product}</td>
                    <td className="p-4 text-center text-gray-500">{p.unit}</td>
                    <td className="p-4 text-right text-gray-700">
                      {p.AB1 > 0 ? fmt(p.AB1) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4 text-right text-gray-700">
                      {p.AB2 > 0 ? fmt(p.AB2) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4 text-right text-gray-700">
                      {p.AB3 > 0 ? fmt(p.AB3) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4 text-right font-bold text-gray-900 bg-gray-50">
                      {fmt(p.total)}
                    </td>
                    <td className="p-4 text-right text-gray-600">{fmt(p.price)}</td>
                    <td className="p-4 text-right font-bold text-green-600">
                      {fmtMoney(p.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 font-bold border-t-2 border-green-200">
                  <td className="p-4 text-gray-900">TOTAL ({displayProducts.length} produits)</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right text-gray-700">
                    {fmt(displayProducts.reduce((s, p) => s + p.AB1, 0))}
                  </td>
                  <td className="p-4 text-right text-gray-700">
                    {fmt(displayProducts.reduce((s, p) => s + p.AB2, 0))}
                  </td>
                  <td className="p-4 text-right text-gray-700">
                    {fmt(displayProducts.reduce((s, p) => s + p.AB3, 0))}
                  </td>
                  <td className="p-4 text-right text-gray-900 bg-green-100">
                    {fmt(stats.totalQty)}
                  </td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right text-green-700 text-lg">
                    {fmtMoney(stats.totalValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Export Confirmation Modal */}
      {showExportModal && pendingMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              📥 {pendingMonth.month}
            </h3>
            <p className="text-gray-600 mb-6">
              Voulez-vous exporter l'inventaire de ce mois en Excel ?
            </p>
            <div className="flex gap-3">
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

export default History;
