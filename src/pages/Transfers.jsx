import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, StatCard, EmptyState, Badge } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, today } from '../lib/utils';

const Transfers = () => {
  const { products, movements, addMovement } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), product: '', quantity: '', fromFarm: 'AGRO BERRY 1', toFarm: 'AGRO BERRY 2' });

  const transfers = useMemo(() => movements.filter(m => m.type === 'transfer-out').sort((a, b) => (b.date || '').localeCompare(a.date || '')), [movements]);

  const handleSubmit = () => {
    if (!form.product || !form.quantity || form.fromFarm === form.toFarm) return;
    addMovement({ date: form.date, type: 'transfer-out', product: form.product, quantity: parseFloat(form.quantity), farm: form.fromFarm, fromFarm: form.fromFarm, toFarm: form.toFarm });
    addMovement({ date: form.date, type: 'transfer-in', product: form.product, quantity: parseFloat(form.quantity), farm: form.toFarm, fromFarm: form.fromFarm, toFarm: form.toFarm });
    setShowModal(false);
    setForm({ date: today(), product: '', quantity: '', fromFarm: 'AGRO BERRY 1', toFarm: 'AGRO BERRY 2' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">Transferts</h1>
          <p className="text-ios-gray text-sm mt-1">Entre fermes</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Transfert</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {FARMS.map(farm => {
          const incoming = movements.filter(t => t.type === 'transfer-in' && t.farm === farm.id).length;
          const outgoing = movements.filter(t => t.type === 'transfer-out' && t.farm === farm.id).length;
          return <StatCard key={farm.id} icon="🔄" label={farm.short} value={`${incoming}↓ ${outgoing}↑`} color="blue" />;
        })}
      </div>
      <Card>
        {transfers.length === 0 ? <EmptyState icon="🔄" message="Aucun transfert" /> : (
          <table className="ios-table">
            <thead><tr><th>Date</th><th>Produit</th><th className="text-right">Qté</th><th>De</th><th>Vers</th></tr></thead>
            <tbody>{transfers.map((t, i) => (
              <tr key={i}>
                <td className="text-ios-gray text-sm">{t.date}</td>
                <td className="font-medium text-ios-dark">{t.product}</td>
                <td className="text-right font-semibold">{fmt(t.quantity)}</td>
                <td><Badge color="red">{FARMS.find(f => f.id === t.fromFarm)?.short}</Badge></td>
                <td><Badge color="green">{FARMS.find(f => f.id === t.toFarm)?.short}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau Transfert">
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <Select label="Produit" value={form.product} onChange={(v) => setForm({ ...form, product: v })}
            options={[{ value: '', label: 'Choisir...' }, ...products.map(p => ({ value: p.name, label: p.name }))]} />
          <Input label="Quantité" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="De" value={form.fromFarm} onChange={(v) => setForm({ ...form, fromFarm: v })} options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
            <Select label="Vers" value={form.toFarm} onChange={(v) => setForm({ ...form, toFarm: v })} options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
          </div>
          {form.fromFarm === form.toFarm && <p className="text-ios-red text-sm">⚠️ Fermes différentes</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={form.fromFarm === form.toFarm}>Transférer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Transfers;
