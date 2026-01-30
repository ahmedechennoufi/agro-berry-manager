import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard, Input, Select, EmptyState } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { getAveragePrice } from '../lib/store';

const Stock = () => {
  const { products, movements } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const stockData = useMemo(() => {
    const stockMap = {};

    // Initialiser avec les produits
    products.forEach(p => {
      stockMap[p.name] = {
        name: p.name,
        unit: p.unit || 'KG',
        category: p.category || 'AUTRES',
        quantity: 0,
        totalValue: 0
      };
    });

    // Calculer depuis les mouvements
    movements.forEach(m => {
      if (!m.product) return;
      if (!stockMap[m.product]) {
        const prod = products.find(p => p.name === m.product);
        stockMap[m.product] = {
          name: m.product,
          unit: prod?.unit || 'KG',
          category: prod?.category || 'AUTRES',
          quantity: 0,
          totalValue: 0
        };
      }

      if (m.type === 'entry') {
        stockMap[m.product].quantity += m.quantity || 0;
        stockMap[m.product].totalValue += (m.quantity || 0) * (m.price || 0);
      } else if (m.type === 'exit') {
        stockMap[m.product].quantity -= m.quantity || 0;
      }
    });

    return Object.values(stockMap)
      .filter(p => Math.abs(p.quantity) > 0.01)
      .map(p => ({
        ...p,
        price: getAveragePrice(p.name)
      }))
      .sort((a, b) => b.quantity * b.price - a.quantity * a.price);
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
    value: filteredStock.reduce((s, p) => s + Math.max(0, p.quantity) * p.price, 0)
  }), [filteredStock]);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Stock Global</h1>
        <p className="text-gray-500">Stock disponible au magasin central</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon="📦" label="Produits en stock" value={totals.products} color="blue" />
        <StatCard icon="📊" label="Quantité totale" value={fmt(totals.quantity)} color="green" />
        <StatCard icon="💰" label="Valeur totale" value={fmtMoney(totals.value)} color="orange" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={setSearch}
            className="flex-1"
          />
          <Select
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'ALL', label: 'Toutes catégories' },
              ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
            className="md:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filteredStock.length === 0 ? (
          <EmptyState message="Aucun produit en stock" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Catégorie</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Quantité</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Prix Unit.</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((p, idx) => {
                  const cat = CATEGORIES.find(c => c.id === p.category);
                  const value = Math.max(0, p.quantity) * p.price;
                  return (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{cat?.icon || '📦'}</span>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{cat?.name || p.category}</td>
                      <td className={`py-3 px-4 text-right font-medium ${p.quantity < 0 ? 'text-red-600' : ''}`}>
                        {fmt(p.quantity)} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 hidden md:table-cell">{fmt(p.price)} MAD</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">{fmtMoney(value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Stock;
