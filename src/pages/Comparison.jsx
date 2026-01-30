import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, StatCard, EmptyState } from '../components/UI';
import { MONTHS } from '../lib/constants';
import { fmt } from '../lib/utils';

const Comparison = () => {
  const { inventory, movements } = useApp();
  const [month1, setMonth1] = useState('DECEMBRE');
  const [month2, setMonth2] = useState('JANVIER');

  const getMonthData = (month) => {
    const data = {};
    
    if (month === 'DECEMBRE') {
      inventory.filter(i => i.month === 'DECEMBRE').forEach(inv => {
        data[inv.product] = (inv.agb1 || 0) + (inv.agb2 || 0) + (inv.agb3 || 0);
      });
    } else {
      // Pour les autres mois, on pourrait calculer depuis les mouvements
      // Pour l'instant, on utilise l'inventaire s'il existe
      inventory.filter(i => i.month === month).forEach(inv => {
        data[inv.product] = (inv.agb1 || 0) + (inv.agb2 || 0) + (inv.agb3 || 0);
      });
    }
    
    return data;
  };

  const data1 = useMemo(() => getMonthData(month1), [inventory, month1]);
  const data2 = useMemo(() => getMonthData(month2), [inventory, month2]);

  const comparisonData = useMemo(() => {
    const allProducts = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    return Array.from(allProducts).map(product => ({
      name: product,
      month1: data1[product] || 0,
      month2: data2[product] || 0,
      diff: (data2[product] || 0) - (data1[product] || 0),
      pct: data1[product] ? (((data2[product] || 0) - data1[product]) / data1[product] * 100) : 0
    })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [data1, data2]);

  const totals = useMemo(() => ({
    month1: Object.values(data1).reduce((s, v) => s + v, 0),
    month2: Object.values(data2).reduce((s, v) => s + v, 0)
  }), [data1, data2]);

  const diff = totals.month2 - totals.month1;

  const monthOptions = MONTHS.map(m => ({ value: m.id, label: m.name }));

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Comparaison</h1>
        <p className="text-gray-500">Comparer le stock entre deux périodes</p>
      </div>

      {/* Selectors */}
      <Card>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Select
            label="Période 1"
            value={month1}
            onChange={setMonth1}
            options={monthOptions}
            className="flex-1"
          />
          <span className="text-2xl text-gray-400 hidden md:block">vs</span>
          <Select
            label="Période 2"
            value={month2}
            onChange={setMonth2}
            options={monthOptions}
            className="flex-1"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon="📅" 
          label={MONTHS.find(m => m.id === month1)?.name || month1} 
          value={fmt(totals.month1)} 
          color="blue" 
        />
        <StatCard 
          icon="📅" 
          label={MONTHS.find(m => m.id === month2)?.name || month2} 
          value={fmt(totals.month2)} 
          color="green" 
        />
        <StatCard 
          icon={diff >= 0 ? "📈" : "📉"} 
          label="Différence" 
          value={`${diff >= 0 ? '+' : ''}${fmt(diff)}`} 
          color={diff >= 0 ? 'green' : 'red'} 
        />
      </div>

      {/* Table */}
      <Card>
        {comparisonData.length === 0 ? (
          <EmptyState icon="📊" message="Aucune donnée à comparer" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-right py-3 px-4 font-medium text-blue-600">
                    {MONTHS.find(m => m.id === month1)?.name}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-green-600">
                    {MONTHS.find(m => m.id === month2)?.name}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Diff</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 hidden md:table-cell">%</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.slice(0, 50).map((p, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{fmt(p.month1)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{fmt(p.month2)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${p.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.diff >= 0 ? '+' : ''}{fmt(p.diff)}
                    </td>
                    <td className={`py-3 px-4 text-right hidden md:table-cell ${p.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.pct >= 0 ? '+' : ''}{p.pct.toFixed(1)}%
                    </td>
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

export default Comparison;
