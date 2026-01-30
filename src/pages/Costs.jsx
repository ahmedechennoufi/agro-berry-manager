import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, StatCard, EmptyState } from '../components/UI';
import { FARMS, CULTURES, COST_CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';

const Costs = () => {
  const { movements } = useApp();
  const [selectedFarm, setSelectedFarm] = useState('AGRO BERRY 1');
  const [selectedCulture, setSelectedCulture] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const farm = FARMS.find(f => f.id === selectedFarm);
  const farmHectares = farm?.hectares || 24;

  const consumptions = useMemo(() => {
    return movements.filter(m => 
      m.type === 'consumption' && 
      m.farm === selectedFarm &&
      (selectedCulture === 'ALL' || m.culture === selectedCulture) &&
      (selectedCategory === 'ALL' || m.destination === selectedCategory)
    );
  }, [movements, selectedFarm, selectedCulture, selectedCategory]);

  const costData = useMemo(() => {
    const byProduct = {};
    consumptions.forEach(c => {
      if (!byProduct[c.product]) {
        byProduct[c.product] = { 
          name: c.product, 
          quantity: 0, 
          cost: 0, 
          destination: c.destination || 'Autre' 
        };
      }
      byProduct[c.product].quantity += c.quantity || 0;
      byProduct[c.product].cost += (c.quantity || 0) * (c.price || 0);
    });
    return Object.values(byProduct).sort((a, b) => b.cost - a.cost);
  }, [consumptions]);

  const totals = useMemo(() => ({
    products: costData.length,
    quantity: costData.reduce((s, p) => s + p.quantity, 0),
    cost: costData.reduce((s, p) => s + p.cost, 0)
  }), [costData]);

  const costPerHa = totals.cost / farmHectares;

  // Coûts par destination
  const costsByDestination = useMemo(() => {
    const result = { Sol: 0, Hydro: 0, Foliaire: 0 };
    costData.forEach(p => {
      if (result[p.destination] !== undefined) {
        result[p.destination] += p.cost;
      }
    });
    return result;
  }, [costData]);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Coûts de Production</h1>
        <p className="text-gray-500">Analyse des coûts par ferme et culture</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Ferme"
            value={selectedFarm}
            onChange={setSelectedFarm}
            options={FARMS.map(f => ({ value: f.id, label: `🏭 ${f.name}` }))}
          />
          <Select
            label="Culture"
            value={selectedCulture}
            onChange={setSelectedCulture}
            options={[
              { value: 'ALL', label: 'Toutes' },
              ...CULTURES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
          />
          <Select
            label="Destination"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: 'ALL', label: 'Toutes' },
              { value: 'Sol', label: '🌍 Sol' },
              { value: 'Hydro', label: '💧 Hydroponic' },
              { value: 'Foliaire', label: '🌿 Foliaire' }
            ]}
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" label="Coût Total" value={fmtMoney(totals.cost)} color="orange" />
        <StatCard icon="📊" label="Coût/Hectare" value={fmtMoney(costPerHa)} color="blue" />
        <StatCard icon="📦" label="Produits" value={totals.products} color="green" />
        <StatCard icon="⚖️" label="Quantité" value={fmt(totals.quantity)} color="purple" />
      </div>

      {/* Costs by destination */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={selectedCategory === 'Sol' ? 'border-primary-500' : ''}>
          <div className="text-center">
            <span className="text-3xl">🌍</span>
            <p className="text-sm text-gray-500 mt-1">Sol</p>
            <p className="font-bold text-lg text-primary-600">{fmtMoney(costsByDestination.Sol)}</p>
          </div>
        </Card>
        <Card className={selectedCategory === 'Hydro' ? 'border-primary-500' : ''}>
          <div className="text-center">
            <span className="text-3xl">💧</span>
            <p className="text-sm text-gray-500 mt-1">Hydroponic</p>
            <p className="font-bold text-lg text-primary-600">{fmtMoney(costsByDestination.Hydro)}</p>
          </div>
        </Card>
        <Card className={selectedCategory === 'Foliaire' ? 'border-primary-500' : ''}>
          <div className="text-center">
            <span className="text-3xl">🌿</span>
            <p className="text-sm text-gray-500 mt-1">Foliaire</p>
            <p className="font-bold text-lg text-primary-600">{fmtMoney(costsByDestination.Foliaire)}</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <h3 className="font-bold text-gray-800 mb-4">Détail par produit</h3>
        {costData.length === 0 ? (
          <EmptyState icon="💰" message="Aucune donnée de consommation" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Destination</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Quantité</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Coût</th>
                </tr>
              </thead>
              <tbody>
                {costData.map((p, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{p.destination}</td>
                    <td className="py-3 px-4 text-right">{fmt(p.quantity)}</td>
                    <td className="py-3 px-4 text-right font-bold text-orange-600">{fmtMoney(p.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="py-3 px-4" colSpan="2">TOTAL</td>
                  <td className="py-3 px-4 text-right">{fmt(totals.quantity)}</td>
                  <td className="py-3 px-4 text-right text-orange-600">{fmtMoney(totals.cost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Costs;
