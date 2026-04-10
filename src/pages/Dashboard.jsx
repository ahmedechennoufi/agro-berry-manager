import React, { useMemo } from 'react';
import { useApp } from '../App';
import { Badge } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { calculateFarmStock, getAlerts } from '../lib/store';

const Dashboard = () => {
  const { products, movements, setPage } = useApp();
  const alerts = getAlerts();

  const stats = useMemo(() => {
    const entries = movements.filter(m => m.type === 'entry');
    return {
      totalAchats: entries.reduce((s, m) => s + (m.quantity || 0) * (m.price || 0), 0),
      totalMovements: movements.length,
    };
  }, [movements]);

  const farmStats = useMemo(() => {
    return FARMS.map(farm => {
      const stockMap = calculateFarmStock(farm.id);
      const items = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0.01);
      const emptyStock = Object.entries(stockMap).filter(([_, d]) => d.quantity <= 0 && d.hasMovements).length;
      const lowStock = items.filter(([_, p]) => p.quantity <= 10).length;
      return { ...farm, nbProducts: items.length, emptyStock, lowStock };
    });
  }, [movements]);

  const recentMovements = useMemo(() =>
    [...movements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)
  , [movements]);

  const typeInfo = (type) => ({
    entry:          { label: 'Entrée',    icon: '📥', color: 'text-green-600',  bg: 'bg-green-50'  },
    exit:           { label: 'Sortie',    icon: '📤', color: 'text-blue-600',   bg: 'bg-blue-50'   },
    consumption:    { label: 'Conso',     icon: '🔥', color: 'text-orange-600', bg: 'bg-orange-50' },
    'transfer-in':  { label: 'Transfert', icon: '↔️', color: 'text-purple-600', bg: 'bg-purple-50' },
    'transfer-out': { label: 'Transfert', icon: '↔️', color: 'text-purple-600', bg: 'bg-purple-50' },
  }[type] || { label: type, icon: '📦', color: 'text-gray-600', bg: 'bg-gray-50' });

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts  = alerts.filter(a => a.severity === 'warning');

  const farmBorder = { 'AGRO BERRY 1': 'border-l-green-400', 'AGRO BERRY 2': 'border-l-blue-400', 'AGRO BERRY 3': 'border-l-purple-400' };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Produits',     value: products.length,                              icon: '📦', color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Mouvements',   value: stats.totalMovements,                         icon: '🔄', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Achats', value: fmtMoney(stats.totalAchats),                  icon: '💰', color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Alertes',      value: criticalAlerts.length + warningAlerts.length, icon: '⚠️', color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Fermes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Stock par ferme</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {farmStats.map(farm => (
            <div
              key={farm.id}
              onClick={() => { localStorage.setItem('selectedFarmId', farm.id); setPage('farms'); }}
              className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${farmBorder[farm.id]} p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800">{farm.name}</span>
                <span className="text-xs text-gray-400">{farm.hectares} ha</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{farm.nbProducts}</p>
                  <p className="text-xs text-gray-500">produits en stock</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {farm.emptyStock > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                      🔴 {farm.emptyStock} épuisé
                    </span>
                  )}
                  {farm.lowStock > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-medium">
                      ⚠️ {farm.lowStock} bas
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes critiques */}
      {criticalAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Alertes critiques</h2>
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm divide-y divide-gray-50">
            {criticalAlerts.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span>🔴</span>
                  <span className="text-sm font-medium text-gray-800">{a.product}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{a.location}</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">Épuisé</span>
                </div>
              </div>
            ))}
            {criticalAlerts.length > 6 && (
              <div className="px-4 py-2 text-xs text-gray-400">+{criticalAlerts.length - 6} autres alertes</div>
            )}
          </div>
        </div>
      )}

      {/* Derniers mouvements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Derniers mouvements</h2>
          <button onClick={() => setPage('movements')} className="text-xs text-blue-600 hover:underline">Voir tout →</button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {recentMovements.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Aucun mouvement</div>
          ) : recentMovements.map((m, idx) => {
            const t = typeInfo(m.type);
            return (
              <div key={m.id || idx} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center text-sm`}>{t.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.product}</p>
                    <p className="text-xs text-gray-400">{m.date} · {t.label}{m.farm ? ` · ${m.farm.replace('AGRO BERRY ', 'AB')}` : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.color}`}>{m.type === 'entry' ? '+' : '-'}{fmt(m.quantity)}</p>
                  {m.price > 0 && <p className="text-xs text-gray-400">{fmtMoney((m.quantity || 0) * (m.price || 0))}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
