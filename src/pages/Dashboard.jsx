import React, { useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';

const Dashboard = () => {
  const { products, movements } = useApp();

  const stats = useMemo(() => {
    const entries = movements.filter(m => m.type === 'entry');
    const consumptions = movements.filter(m => m.type === 'consumption');
    
    return {
      totalProducts: products.length,
      totalMovements: movements.length,
      totalEntries: entries.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0),
      totalConsumption: consumptions.reduce((s, m) => s + (m.quantity || 0), 0)
    };
  }, [products, movements]);

  const recentMovements = useMemo(() => {
    return [...movements]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
  }, [movements]);

  const getTypeIcon = (type) => {
    const icons = {
      entry: '📥',
      exit: '📤',
      consumption: '🔥',
      'transfer-in': '↩️',
      'transfer-out': '↪️'
    };
    return icons[type] || '📦';
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Tableau de Bord</h1>
        <p className="text-gray-500">Vue d'ensemble de votre exploitation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="🚚" label="Mouvements" value={stats.totalMovements} color="green" />
        <StatCard icon="💰" label="Achats Total" value={fmtMoney(stats.totalEntries)} color="orange" />
        <StatCard icon="🔥" label="Consommation" value={fmt(stats.totalConsumption)} color="red" />
      </div>

      {/* Farms */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Fermes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FARMS.map(farm => {
            const farmConsumption = movements
              .filter(m => m.type === 'consumption' && m.farm === farm.id)
              .reduce((s, m) => s + (m.quantity || 0), 0);
            
            return (
              <Card key={farm.id}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-${farm.color}-100 rounded-xl flex items-center justify-center`}>
                    <span className="text-2xl">🌱</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{farm.name}</h3>
                    <p className="text-sm text-gray-500">{farm.hectares} hectares</p>
                    <p className="text-xs text-gray-400">Conso: {fmt(farmConsumption)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent movements */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Derniers mouvements</h2>
        <Card>
          {recentMovements.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun mouvement récent</p>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((m, i) => (
                <div key={m.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getTypeIcon(m.type)}</span>
                    <div>
                      <p className="font-medium text-gray-800">{m.product}</p>
                      <p className="text-sm text-gray-500">{m.date}</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-800">{fmt(m.quantity)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
