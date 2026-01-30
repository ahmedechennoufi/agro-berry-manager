import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard, Tabs, EmptyState } from '../components/UI';
import { MONTHS } from '../lib/constants';
import { fmt } from '../lib/utils';

const History = () => {
  const { inventory } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('DECEMBRE');

  const monthData = useMemo(() => {
    return inventory
      .filter(i => i.month === selectedMonth)
      .map(inv => ({
        name: inv.product,
        agb1: inv.agb1 || 0,
        agb2: inv.agb2 || 0,
        agb3: inv.agb3 || 0,
        total: (inv.agb1 || 0) + (inv.agb2 || 0) + (inv.agb3 || 0)
      }))
      .sort((a, b) => b.total - a.total);
  }, [inventory, selectedMonth]);

  const totals = useMemo(() => ({
    agb1: monthData.reduce((s, p) => s + p.agb1, 0),
    agb2: monthData.reduce((s, p) => s + p.agb2, 0),
    agb3: monthData.reduce((s, p) => s + p.agb3, 0),
    total: monthData.reduce((s, p) => s + p.total, 0)
  }), [monthData]);

  const tabs = MONTHS.slice(0, 4).map(m => ({
    id: m.id,
    label: m.name
  }));

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Historique Stock</h1>
        <p className="text-gray-500">Inventaire par mois</p>
      </div>

      {/* Month selector */}
      <Tabs tabs={tabs} activeTab={selectedMonth} onChange={setSelectedMonth} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Total" value={fmt(totals.total)} color="primary" />
        <StatCard icon="🏭" label="AGB1" value={fmt(totals.agb1)} color="blue" />
        <StatCard icon="🏭" label="AGB2" value={fmt(totals.agb2)} color="orange" />
        <StatCard icon="🏭" label="AGB3" value={fmt(totals.agb3)} color="green" />
      </div>

      {/* Table */}
      <Card>
        {monthData.length === 0 ? (
          <EmptyState icon="📅" message="Aucune donnée pour ce mois" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-right py-3 px-4 font-medium text-blue-600">AGB1</th>
                  <th className="text-right py-3 px-4 font-medium text-orange-600">AGB2</th>
                  <th className="text-right py-3 px-4 font-medium text-green-600">AGB3</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-800">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthData.map((p, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{fmt(p.agb1)}</td>
                    <td className="py-3 px-4 text-right text-orange-600">{fmt(p.agb2)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{fmt(p.agb3)}</td>
                    <td className="py-3 px-4 text-right font-bold">{fmt(p.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="py-3 px-4">TOTAL</td>
                  <td className="py-3 px-4 text-right text-blue-600">{fmt(totals.agb1)}</td>
                  <td className="py-3 px-4 text-right text-orange-600">{fmt(totals.agb2)}</td>
                  <td className="py-3 px-4 text-right text-green-600">{fmt(totals.agb3)}</td>
                  <td className="py-3 px-4 text-right">{fmt(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default History;
