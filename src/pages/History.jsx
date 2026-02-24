import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, StatCard, Tabs, EmptyState, Button, Input, Modal } from '../components/UI';
import { MONTHS } from '../lib/constants';
import { fmt, downloadExcel } from '../lib/utils';
import { getInventory, setInventoryItem, getInventoryByMonth } from '../lib/store';

const History = () => {
  const { loadData } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('DECEMBRE');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ agb1: 0, agb2: 0, agb3: 0 });

  const inventory = getInventory();
  const monthData = useMemo(() => {
    return getInventoryByMonth(selectedMonth).map(inv => ({
      name: inv.product, agb1: inv.agb1 || 0, agb2: inv.agb2 || 0, agb3: inv.agb3 || 0,
      total: (inv.agb1 || 0) + (inv.agb2 || 0) + (inv.agb3 || 0)
    })).sort((a, b) => b.total - a.total);
  }, [inventory, selectedMonth]);

  const totals = useMemo(() => ({
    agb1: monthData.reduce((s, p) => s + p.agb1, 0),
    agb2: monthData.reduce((s, p) => s + p.agb2, 0),
    agb3: monthData.reduce((s, p) => s + p.agb3, 0),
    total: monthData.reduce((s, p) => s + p.total, 0)
  }), [monthData]);

  const tabs = MONTHS.slice(0, 6).map(m => ({ id: m.id, label: m.short }));

  const handleEdit = (product) => { setEditingProduct(product); setEditForm({ agb1: product.agb1, agb2: product.agb2, agb3: product.agb3 }); };
  const handleSave = () => {
    if (!editingProduct) return;
    setInventoryItem(selectedMonth, editingProduct.name, { agb1: parseFloat(editForm.agb1) || 0, agb2: parseFloat(editForm.agb2) || 0, agb3: parseFloat(editForm.agb3) || 0 });
    setEditingProduct(null); loadData();
  };
  const handleExport = async () => {
    const data = monthData.map(p => ({ Produit: p.name, AGB1: p.agb1, AGB2: p.agb2, AGB3: p.agb3, Total: p.total }));
    await downloadExcel(data, `historique-${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">Historique</h1>
          <p className="text-ios-gray text-sm mt-1">Inventaire par mois</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
      </div>
      <Tabs tabs={tabs} activeTab={selectedMonth} onChange={setSelectedMonth} />
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon="📦" label="Total" value={fmt(totals.total)} color="green" />
        <StatCard icon="🏭" label="AB1" value={fmt(totals.agb1)} color="blue" />
        <StatCard icon="🏭" label="AB2" value={fmt(totals.agb2)} color="orange" />
        <StatCard icon="🏭" label="AB3" value={fmt(totals.agb3)} color="purple" />
      </div>
      <Card>
        {monthData.length === 0 ? <EmptyState icon="📅" message="Aucune donnée" /> : (
          <table className="ios-table">
            <thead><tr><th>Produit</th><th className="text-right">AB1</th><th className="text-right">AB2</th><th className="text-right">AB3</th><th className="text-right">Total</th><th></th></tr></thead>
            <tbody>{monthData.map((p, i) => (
              <tr key={i}>
                <td className="font-medium text-ios-dark">{p.name}</td>
                <td className="text-right text-ios-blue">{fmt(p.agb1)}</td>
                <td className="text-right text-ios-orange">{fmt(p.agb2)}</td>
                <td className="text-right text-purple-500">{fmt(p.agb3)}</td>
                <td className="text-right font-semibold">{fmt(p.total)}</td>
                <td className="text-center"><button onClick={() => handleEdit(p)} className="text-ios-blue">✏️</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title={`Éditer: ${editingProduct?.name}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="AB1" type="number" value={editForm.agb1} onChange={(v) => setEditForm({ ...editForm, agb1: v })} />
            <Input label="AB2" type="number" value={editForm.agb2} onChange={(v) => setEditForm({ ...editForm, agb2: v })} />
            <Input label="AB3" type="number" value={editForm.agb3} onChange={(v) => setEditForm({ ...editForm, agb3: v })} />
          </div>
          <p className="text-sm text-ios-gray">Total: {fmt((parseFloat(editForm.agb1) || 0) + (parseFloat(editForm.agb2) || 0) + (parseFloat(editForm.agb3) || 0))}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEditingProduct(null)} className="flex-1">Annuler</Button>
            <Button onClick={handleSave} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default History;
