import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Input, EmptyState } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt } from '../lib/utils';
import { calculateFarmStock } from '../lib/store';

const Farms = () => {
  const { movements, inventory } = useApp();
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [search, setSearch] = useState('');

  const farmStocks = useMemo(() => {
    const result = {};
    FARMS.forEach(farm => {
      result[farm.id] = calculateFarmStock(farm.id);
    });
    return result;
  }, [movements, inventory]);

  const renderFarmCard = (farm) => {
    const stockMap = farmStocks[farm.id] || {};
    const stockArray = Object.entries(stockMap)
      .filter(([_, data]) => data.quantity > 0.01)
      .map(([name, data]) => ({ name, ...data }));
    
    const totalProducts = stockArray.length;
    const totalQty = stockArray.reduce((s, p) => s + p.quantity, 0);

    const colorClasses = {
      blue: 'bg-blue-100',
      orange: 'bg-orange-100',
      green: 'bg-green-100'
    };

    return (
      <Card key={farm.id} className="cursor-pointer" onClick={() => setSelectedFarm(farm)}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 ${colorClasses[farm.color]} rounded-xl flex items-center justify-center`}>
            <span className="text-2xl">🌱</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{farm.name}</h3>
            <p className="text-sm text-gray-500">{farm.hectares} hectares</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-500">Produits</p>
            <p className="text-xl font-bold text-gray-800">{totalProducts}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-500">Quantité</p>
            <p className="text-xl font-bold text-gray-800">{fmt(totalQty)}</p>
          </div>
        </div>
      </Card>
    );
  };

  const renderFarmDetail = () => {
    if (!selectedFarm) return null;
    
    const stockMap = farmStocks[selectedFarm.id] || {};
    const stock = Object.entries(stockMap)
      .filter(([_, data]) => data.quantity > 0.01)
      .map(([name, data]) => ({ name, ...data }))
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.quantity - a.quantity);

    const colorClasses = {
      blue: 'bg-blue-100',
      orange: 'bg-orange-100',
      green: 'bg-green-100'
    };

    return (
      <div className="fade-in space-y-6">
        <button
          onClick={() => setSelectedFarm(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          ← Retour aux fermes
        </button>

        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 ${colorClasses[selectedFarm.color]} rounded-xl flex items-center justify-center`}>
            <span className="text-3xl">🌱</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{selectedFarm.name}</h1>
            <p className="text-gray-500">{selectedFarm.hectares} hectares • {stock.length} produits</p>
          </div>
        </div>

        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={setSearch}
        />

        <Card>
          {stock.length === 0 ? (
            <EmptyState message="Aucun produit en stock" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((p, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">{fmt(p.quantity)}</td>
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

  if (selectedFarm) return renderFarmDetail();

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Fermes</h1>
        <p className="text-gray-500">Stock par exploitation agricole</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FARMS.map(farm => renderFarmCard(farm))}
      </div>
    </div>
  );
};

export default Farms;
