import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Input, EmptyState } from '../components/UI';
import { fmt, fmtMoney } from '../lib/utils';
import { getMovements, getProducts, getAveragePrice } from '../lib/store';
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

  // Get selected month info
  const selectedMonthInfo = SEASON_MONTHS.find(m => m.id === selectedMonth);
  const inventoryDate = selectedMonthInfo?.date || '2025-12-25';

  // Get stock data - from imported history OR calculated
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
      <div className="flex flex-wrap gap-2">
        {SEASON_MONTHS.map(m => {
          const hasData = stockHistoryData[m.id] !== undefined;
          const monthIdx = SEASON_MONTHS.findIndex(mo => mo.id === m.id);
          const canCalculate = monthIdx > 0;
          const isAvailable = hasData || canCalculate;
          
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMonth(m.id)}
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
          <p className="text-2xl font-bold text-yellow-700">{inventoryDate.split('-').reverse().join('/')}</p>
          {!hasImportedData && <p className="text-xs text-yellow-600 mt-1">Calculé</p>}
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input 
          placeholder="🔍 Rechercher un produit..." 
          value={search} 
          onChange={setSearch} 
          className="flex-1" 
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
          <span className="text-gray-700 font-medium">{stockData.length} produits</span>
          {!hasImportedData && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              📊 Calculé depuis Décembre + mouvements
            </span>
          )}
        </div>
        
        {stockData.length === 0 ? (
          <div className="p-8"><EmptyState icon="📭" message="Aucun stock pour ce mois" /></div>
        ) : (
          <div className="overflow-x-auto">
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
    </div>
  );
};

export default Inventory;
