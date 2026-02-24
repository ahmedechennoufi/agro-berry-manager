import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard, Input, Select, Button, EmptyState } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { calculateGlobalStock, getAveragePrice } from '../lib/store';

const Stock = () => {
  const { products, movements } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const stockData = useMemo(() => {
    const stockMap = calculateGlobalStock();
    return Object.entries(stockMap)
      .filter(([name, data]) => Math.abs(data.quantity) > 0.01)
      .map(([name, data]) => {
        const prod = products.find(p => p.name === name);
        const price = getAveragePrice(name);
        return { name, unit: prod?.unit || 'KG', category: prod?.category || 'AUTRES', quantity: data.quantity, price, value: data.quantity * price };
      })
      .sort((a, b) => b.value - a.value);
  }, [products, movements]);

  const filteredStock = useMemo(() => {
    return stockData.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [stockData, search, filterCategory]);

  const totals = useMemo(() => ({
    products: filteredStock.length,
    quantity: filteredStock.reduce((s, p) => s + Math.max(0, p.quantity), 0),
    value: filteredStock.reduce((s, p) => s + Math.max(0, p.value), 0)
  }), [filteredStock]);

  const handleExport = async () => {
    const data = filteredStock.map(p => ({ Produit: p.name, Catégorie: p.category, Quantité: p.quantity, Unité: p.unit, 'Prix Moyen': p.price, Valeur: p.value }));
    await downloadExcel(data, `stock-global-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">Stock Global</h1>
          <p className="text-ios-gray text-sm mt-1">Inventaire du magasin central</p>
        </div>
        <Button onClick={handleExport} variant="secondary">📥 Export</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="📦" label="Produits" value={totals.products} color="blue" />
        <StatCard icon="📊" label="Quantité" value={fmt(totals.quantity)} color="green" />
        <StatCard icon="💰" label="Valeur" value={fmtMoney(totals.value)} color="orange" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} className="flex-1" />
        <Select value={filterCategory} onChange={setFilterCategory} 
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: c.name }))]} 
          className="sm:w-48" />
      </div>

      <Card>
        {filteredStock.length === 0 ? <EmptyState icon="📦" message="Aucun produit" /> : (
          <div className="overflow-x-auto">
            <table className="ios-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="text-right">Quantité</th>
                  <th className="text-right hidden sm:table-cell">Prix</th>
                  <th className="text-right">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <p className="font-medium text-ios-dark">{p.name}</p>
                      <p className="text-xs text-ios-gray">{p.category}</p>
                    </td>
                    <td className="text-right">
                      <span className={`font-semibold ${p.quantity < 0 ? 'text-ios-red' : 'text-ios-dark'}`}>
                        {fmt(p.quantity)} <span className="text-ios-gray text-xs">{p.unit}</span>
                      </span>
                    </td>
                    <td className="text-right text-ios-gray hidden sm:table-cell">{fmt(p.price)} MAD</td>
                    <td className="text-right font-semibold text-ios-green">{fmtMoney(p.value)}</td>
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

export default Stock;
