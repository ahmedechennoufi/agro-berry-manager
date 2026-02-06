import React, { useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard, Badge, ProgressBar } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { getConsommations, calculateFarmStock, getAlerts, getDefaultThreshold } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#34c759', '#007aff', '#af52de'];

const Dashboard = () => {
  const { products, movements, setPage } = useApp();
  const consommations = getConsommations();
  const alerts = getAlerts();

  const stats = useMemo(() => {
    const entries = movements.filter(m => m.type === 'entry');
    const consoMovements = movements.filter(m => m.type === 'consumption');
    
    const totalAchats = entries.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0);
    const consoFromMovements = consoMovements.reduce((s, m) => s + ((m.quantity || 0) * (m.price || 0)), 0);
    const consoFromCout = consommations.reduce((s, c) => s + ((c.quantity || 0) * (c.price || 0)), 0);
    
    return {
      totalProducts: products.length,
      totalMovements: movements.length,
      totalAchats,
      totalConsommation: consoFromMovements + consoFromCout,
      nbConsommations: consoMovements.length + consommations.length
    };
  }, [products, movements, consommations]);

  const farmStats = useMemo(() => {
    return FARMS.map(farm => {
      const stockMap = calculateFarmStock(farm.id);
      const stockArray = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0.01);
      const totalQty = stockArray.reduce((s, [_, p]) => s + p.quantity, 0);
      
      const farmConsos = [
        ...movements.filter(m => m.type === 'consumption' && m.farm === farm.id),
        ...consommations.filter(c => c.farm === farm.id)
      ];
      const consoValue = farmConsos.reduce((s, c) => s + ((c.quantity || 0) * (c.price || 0)), 0);
      
      return { ...farm, nbProducts: stockArray.length, totalQty, consoValue };
    });
  }, [movements, consommations]);

  const farmChartData = farmStats.map(f => ({
    name: f.short,
    stock: Math.round(f.totalQty),
    conso: Math.round(f.consoValue / 1000),
  }));

  const consoDistribution = farmStats.map(f => ({
    name: f.short,
    value: Math.round(f.consoValue)
  }));

  const recentMovements = useMemo(() => {
    return [...movements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
  }, [movements]);

  const getTypeInfo = (type) => {
    const types = {
      entry: { label: 'Entrée', color: 'green', icon: '📥', bg: 'bg-green-50', text: 'text-green-600' },
      exit: { label: 'Sortie', color: 'blue', icon: '📤', bg: 'bg-blue-50', text: 'text-blue-600' },
      consumption: { label: 'Conso', color: 'orange', icon: '🔥', bg: 'bg-orange-50', text: 'text-orange-600' },
      'transfer-in': { label: 'Reçu', color: 'purple', icon: '↓', bg: 'bg-purple-50', text: 'text-purple-600' },
      'transfer-out': { label: 'Envoyé', color: 'purple', icon: '↑', bg: 'bg-purple-50', text: 'text-purple-600' }
    };
    return types[type] || { label: type, color: 'gray', icon: '📦', bg: 'bg-gray-50', text: 'text-gray-600' };
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const totalConsoAllFarms = farmStats.reduce((s, f) => s + f.consoValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble de votre exploitation</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Seuil alerte: {getDefaultThreshold()}</span>
          <span>•</span>
          <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* Alerts Section - Par Ferme - CLICKABLE */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="space-y-3">
          {['AB1', 'AB2', 'AB3'].map(farm => {
            const farmCritical = criticalAlerts.filter(a => a.location === farm);
            const farmWarning = warningAlerts.filter(a => a.location === farm);
            if (farmCritical.length === 0 && farmWarning.length === 0) return null;
            
            const farmColors = {
              AB1: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', title: 'text-blue-800', label: '🌿 Agro Berry 1', id: 'AGRO BERRY 1' },
              AB2: { bg: 'from-green-50 to-green-100', border: 'border-green-200', title: 'text-green-800', label: '🌱 Agro Berry 2', id: 'AGRO BERRY 2' },
              AB3: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', title: 'text-purple-800', label: '🌳 Agro Berry 3', id: 'AGRO BERRY 3' }
            };
            const c = farmColors[farm];
            
            const handleFarmClick = () => {
              localStorage.setItem('selectedFarmId', c.id);
              setPage('farms');
            };
            
            return (
              <div 
                key={farm} 
                onClick={handleFarmClick}
                className={`p-4 rounded-2xl bg-gradient-to-r ${c.bg} border ${c.border} cursor-pointer hover:shadow-lg hover:scale-[1.005] transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${c.title}`}>{c.label}</h3>
                    {farmCritical.length > 0 && <Badge color="red">🔴 {farmCritical.length} épuisé</Badge>}
                    {farmWarning.length > 0 && <Badge color="orange">⚠️ {farmWarning.length} bas</Badge>}
                  </div>
                  <span className="text-sm text-gray-400">Voir stock →</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {farmCritical.slice(0, 4).map(a => (
                    <div key={a.id} className="flex justify-between items-center text-sm bg-white/70 p-2 rounded-lg">
                      <span className="font-medium text-gray-800">{a.product}</span>
                      <Badge color="red">Épuisé</Badge>
                    </div>
                  ))}
                  {farmWarning.slice(0, 4).map(a => (
                    <div key={a.id} className="flex justify-between items-center text-sm bg-white/70 p-2 rounded-lg">
                      <span className="font-medium text-gray-800">{a.product}</span>
                      <Badge color="orange">{a.current?.toFixed(1)}</Badge>
                    </div>
                  ))}
                  {(farmCritical.length + farmWarning.length) > 8 && (
                    <p className="text-xs text-gray-500 font-medium col-span-2">+{farmCritical.length + farmWarning.length - 8} autres produits</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="🚚" label="Mouvements" value={stats.totalMovements} color="purple" />
        <StatCard icon="💰" label="Total Achats" value={fmtMoney(stats.totalAchats)} color="green" />
        <StatCard icon="🔥" label="Consommation" value={fmtMoney(stats.totalConsommation)} subValue={`${stats.nbConsommations} opérations`} color="orange" />
      </div>

      {/* Charts Row - Clickable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <Card 
          onClick={() => setPage('farms')} 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.005] transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Stock & Consommation par Ferme</h3>
            <span className="text-sm text-gray-400">Cliquer pour détails →</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={farmChartData} barGap={8}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6e6e73', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6e6e73', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }} />
                <Bar dataKey="stock" fill="#007aff" radius={[4, 4, 0, 0]} name="Stock (unités)" />
                <Bar dataKey="conso" fill="#ff9500" radius={[4, 4, 0, 0]} name="Conso (K MAD)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart */}
        <Card 
          onClick={() => setPage('consumption')} 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.005] transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Répartition Consommation</h3>
            <span className="text-sm text-gray-400">Cliquer pour détails →</span>
          </div>
          <div className="h-64 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={consoDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {consoDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => fmtMoney(value)} contentStyle={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {farmStats.map((farm, i) => {
                const pct = totalConsoAllFarms > 0 ? (farm.consoValue / totalConsoAllFarms * 100) : 0;
                return (
                  <div key={farm.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{farm.short}</span>
                      <span className="text-gray-900 font-medium">{pct.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={pct} max={100} color={['green', 'blue', 'purple'][i]} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Movements - Improved Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Derniers Mouvements</h3>
          <button 
            onClick={() => setPage('movements')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir tout ({movements.length}) →
          </button>
        </div>
        
        {recentMovements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun mouvement récent</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Produit</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Quantité</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Valeur</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Destination</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((m, idx) => {
                  const typeInfo = getTypeInfo(m.type);
                  const value = (m.quantity || 0) * (m.price || 0);
                  return (
                    <tr key={m.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 text-sm text-gray-600 whitespace-nowrap">{m.date}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-gray-900">{m.product}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-semibold ${m.type === 'entry' ? 'text-green-600' : m.type === 'exit' || m.type === 'consumption' ? 'text-orange-600' : 'text-gray-700'}`}>
                          {m.type === 'entry' ? '+' : m.type === 'exit' || m.type === 'consumption' ? '-' : ''}{fmt(m.quantity)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-gray-600">
                        {value > 0 ? fmtMoney(value) : '-'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {m.farm ? (
                          <Badge color={m.farm.includes('1') ? 'green' : m.farm.includes('2') ? 'blue' : 'purple'}>
                            {m.farm.replace('AGRO BERRY ', 'AB')}
                          </Badge>
                        ) : m.supplier ? (
                          <span className="text-xs text-gray-500">{m.supplier}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Farms Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fermes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {farmStats.map((farm, i) => (
            <Card 
              key={farm.id} 
              onClick={() => {
                localStorage.setItem('selectedFarmId', farm.id);
                setPage('farms');
              }}
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: `${COLORS[i]}20` }}>
                  🌱
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{farm.name}</p>
                  <p className="text-sm text-gray-500">{farm.hectares} ha • {farm.nbProducts} produits</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-50">
                  <p className="text-xl font-bold text-blue-600">{fmt(farm.totalQty)}</p>
                  <p className="text-xs text-gray-500">Stock</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50">
                  <p className="text-xl font-bold text-orange-600">{fmtMoney(farm.consoValue)}</p>
                  <p className="text-xs text-gray-500">Consommation</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
