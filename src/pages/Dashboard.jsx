import React, { useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard, Badge } from '../components/UI';
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
    return [...movements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  }, [movements]);

  const farmStats = useMemo(() => {
    return FARMS.map(farm => {
      const conso = movements.filter(m => m.type === 'consumption' && m.farm === farm.id);
      return { ...farm, consoQty: conso.reduce((s, m) => s + (m.quantity || 0), 0), consoCount: conso.length };
    });
  }, [movements]);

  const getTypeInfo = (type) => {
    const types = {
      entry: { label: 'Entrée', color: 'green' },
      exit: { label: 'Sortie', color: 'blue' },
      consumption: { label: 'Conso', color: 'red' },
      'transfer-in': { label: 'Transfert', color: 'orange' },
      'transfer-out': { label: 'Transfert', color: 'orange' }
    };
    return types[type] || { label: type, color: 'gray' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Tableau de Bord</h1>
        <p className="text-ios-gray text-sm mt-1">Vue d'ensemble de votre exploitation</p>
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
        <h2 className="ios-section-header">FERMES</h2>
        <div className="ios-card">
          {farmStats.map((farm, idx) => (
            <div key={farm.id} className={`flex items-center justify-between p-4 ${idx !== farmStats.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg">🌱</div>
                <div>
                  <p className="font-medium text-ios-dark">{farm.name}</p>
                  <p className="text-xs text-ios-gray">{farm.hectares} ha</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ios-dark">{fmt(farm.consoQty)}</p>
                <p className="text-xs text-ios-gray">{farm.consoCount} mvts</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Movements */}
      <div>
        <h2 className="ios-section-header">DERNIERS MOUVEMENTS</h2>
        <div className="ios-card">
          {recentMovements.length === 0 ? (
            <div className="text-center py-8 text-ios-gray">Aucun mouvement récent</div>
          ) : (
            recentMovements.map((m, idx) => {
              const typeInfo = getTypeInfo(m.type);
              return (
                <div key={m.id || idx} className={`flex items-center justify-between p-4 ${idx !== recentMovements.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div>
                    <p className="font-medium text-ios-dark">{m.product}</p>
                    <p className="text-xs text-ios-gray">{m.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-ios-dark">{fmt(m.quantity)}</span>
                    <Badge color={typeInfo.color}>{typeInfo.label}</Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
