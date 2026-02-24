import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Input, EmptyState, Button, StatCard } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, downloadExcel } from '../lib/utils';
import { calculateFarmStock } from '../lib/store';

const Farms = () => {
  const { movements, inventory } = useApp();
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [search, setSearch] = useState('');

  const farmStocks = useMemo(() => {
    const result = {};
    FARMS.forEach(farm => { result[farm.id] = calculateFarmStock(farm.id); });
    return result;
  }, [movements, inventory]);

  const handleExport = async (farm) => {
    const stockMap = farmStocks[farm.id] || {};
    const data = Object.entries(stockMap).filter(([_, v]) => v.quantity > 0.01).map(([name, v]) => ({ Produit: name, Quantité: v.quantity }));
    await downloadExcel(data, `stock-${farm.short}.xlsx`);
  };

  if (selectedFarm) {
    const stockMap = farmStocks[selectedFarm.id] || {};
    const stock = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0.01)
      .map(([name, d]) => ({ name, ...d }))
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.quantity - a.quantity);

    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedFarm(null)} className="text-ios-blue font-medium">← Retour</button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">🌱</div>
            <div>
              <h1 className="text-2xl font-bold text-ios-dark">{selectedFarm.name}</h1>
              <p className="text-ios-gray text-sm">{selectedFarm.hectares} ha • {stock.length} produits</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => handleExport(selectedFarm)}>📥</Button>
        </div>
        <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} />
        <Card>
          {stock.length === 0 ? <EmptyState /> : (
            <table className="ios-table">
              <thead><tr><th>Produit</th><th className="text-right">Quantité</th></tr></thead>
              <tbody>{stock.map((p, i) => <tr key={i}><td className="font-medium text-ios-dark">{p.name}</td><td className="text-right font-semibold text-ios-green">{fmt(p.quantity)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Stock Fermes</h1>
        <p className="text-ios-gray text-sm mt-1">Inventaire par exploitation</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FARMS.map(farm => {
          const stockMap = farmStocks[farm.id] || {};
          const stockArray = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0.01);
          const totalQty = stockArray.reduce((s, [_, p]) => s + p.quantity, 0);
          return (
            <Card key={farm.id} onClick={() => setSelectedFarm(farm)} className="cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl">🌱</div>
                <div>
                  <p className="font-semibold text-ios-dark">{farm.name}</p>
                  <p className="text-xs text-ios-gray">{farm.hectares} ha</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-ios-dark">{stockArray.length}</p>
                  <p className="text-xs text-ios-gray">Produits</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-ios-green">{fmt(totalQty)}</p>
                  <p className="text-xs text-ios-gray">Quantité</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Farms;
