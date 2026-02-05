import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, StatCard, EmptyState, Badge } from '../components/UI';
import { FARMS, CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { calculateFarmStock, getAveragePrice } from '../lib/store';

const Farms = () => {
  const { initialFarm, setInitialFarm } = useApp();
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('quantity');
  const [sortOrder, setSortOrder] = useState('desc');

  // Auto-select farm if navigated from Dashboard
  useEffect(() => {
    if (initialFarm) {
      const farm = FARMS.find(f => f.id === initialFarm);
      if (farm) {
        setSelectedFarm(farm);
      }
      setInitialFarm(null);
    }
  }, [initialFarm]);

  const farmStockData = useMemo(() => {
    if (!selectedFarm) return [];
    
    const stockMap = calculateFarmStock(selectedFarm.id);
    
    return Object.entries(stockMap)
      .map(([product, data]) => {
        const price = data.price || getAveragePrice(product) || 0;
        const quantity = data.quantity || 0;
        return {
          name: product,
          quantity,
          price,
          value: quantity * price,
          category: 'ENGRAIS' // Default, ideally get from products
        };
      })
      .filter(item => item.quantity !== 0);
  }, [selectedFarm]);

  const filteredStock = useMemo(() => {
    let result = farmStockData.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
      return matchSearch && matchCategory;
    });
    
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'quantity') comparison = a.quantity - b.quantity;
      else if (sortBy === 'value') comparison = a.value - b.value;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return result;
  }, [farmStockData, search, filterCategory, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const inStock = filteredStock.filter(s => s.quantity > 0);
    return {
      totalProducts: inStock.length,
      totalQuantity: inStock.reduce((s, p) => s + p.quantity, 0),
      totalValue: inStock.reduce((s, p) => s + p.value, 0)
    };
  }, [filteredStock]);

  const farmSummaries = useMemo(() => {
    return FARMS.map(farm => {
      const stockMap = calculateFarmStock(farm.id);
      const items = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0);
      const totalQty = items.reduce((s, [_, p]) => s + p.quantity, 0);
      const totalValue = items.reduce((s, [name, p]) => {
        const price = p.price || getAveragePrice(name) || 0;
        return s + p.quantity * price;
      }, 0);
      return { ...farm, nbProducts: items.length, totalQty, totalValue };
    });
  }, []);

  const handleExport = async () => {
    if (!selectedFarm) return;
    const data = filteredStock.map(s => ({
      Produit: s.name,
      Quantité: s.quantity,
      Prix: s.price,
      Valeur: s.value
    }));
    await downloadExcel(data, `stock-${selectedFarm.short}.xlsx`);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  // Farm selection view
  if (!selectedFarm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Fermes</h1>
          <p className="text-gray-500 mt-1">Sélectionnez une ferme pour voir son stock</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {farmSummaries.map((farm, idx) => (
            <Card 
              key={farm.id} 
              onClick={() => setSelectedFarm(farm)}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: ['#dcfce7', '#dbeafe', '#f3e8ff'][idx] }}
                >
                  🌱
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{farm.name}</h3>
                  <p className="text-sm text-gray-500">{farm.hectares} ha</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{farm.nbProducts}</p>
                  <p className="text-xs text-gray-500">Produits</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{fmt(farm.totalQty)}</p>
                  <p className="text-xs text-gray-500">Quantité</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-orange-600">{fmtMoney(farm.totalValue)}</p>
                  <p className="text-xs text-gray-500">Valeur</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <span className="text-blue-500 font-medium text-sm">Voir le stock →</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Farm detail view
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedFarm(null)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl">🌱</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedFarm.name}</h1>
              <p className="text-gray-500 text-sm">{selectedFarm.hectares} ha • {stats.totalProducts} produits</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="📊" label="Quantité totale" value={fmt(stats.totalQuantity)} color="green" />
        <StatCard icon="💰" label="Valeur totale" value={fmtMoney(stats.totalValue)} color="orange" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} />
          </div>
          <Select 
            value={filterCategory} 
            onChange={setFilterCategory}
            options={[
              { value: 'ALL', label: 'Toutes catégories' },
              ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
            className="md:w-56"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filteredStock.length === 0 ? (
          <EmptyState icon="📦" message="Aucun stock dans cette ferme" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('name')}>
                    Produit <SortIcon field="name" />
                  </th>
                  <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('quantity')}>
                    Quantité <SortIcon field="quantity" />
                  </th>
                  <th className="text-right">Prix Moyen</th>
                  <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('value')}>
                    Valeur <SortIcon field="value" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.filter(s => s.quantity > 0).map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-medium text-gray-900">{item.name}</td>
                    <td className="text-right">
                      <span className="font-semibold text-gray-900">{fmt(item.quantity)}</span>
                    </td>
                    <td className="text-right text-gray-600">
                      {item.price > 0 ? `${fmt(item.price)} MAD` : '-'}
                    </td>
                    <td className="text-right">
                      <span className="font-bold text-green-600">{fmtMoney(item.value)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="font-bold text-gray-900 py-4">TOTAL</td>
                  <td className="text-right font-bold text-gray-900 py-4">{fmt(stats.totalQuantity)}</td>
                  <td></td>
                  <td className="text-right font-bold text-green-600 py-4">{fmtMoney(stats.totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Farms;
