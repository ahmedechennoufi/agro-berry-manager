import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, StatCard, EmptyState } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, today } from '../lib/utils';

const Transfers = () => {
  const { products, movements, addMovement } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    product: '',
    quantity: '',
    fromFarm: 'AGRO BERRY 1',
    toFarm: 'AGRO BERRY 2'
  });

  const transfers = useMemo(() => {
    return movements
      .filter(m => m.type === 'transfer-out')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [movements]);

  const handleSubmit = () => {
    if (!form.product || !form.quantity || form.fromFarm === form.toFarm) return;

    // Créer le transfer-out
    addMovement({
      date: form.date,
      type: 'transfer-out',
      product: form.product,
      quantity: parseFloat(form.quantity),
      farm: form.fromFarm,
      fromFarm: form.fromFarm,
      toFarm: form.toFarm
    });

    // Créer le transfer-in
    addMovement({
      date: form.date,
      type: 'transfer-in',
      product: form.product,
      quantity: parseFloat(form.quantity),
      farm: form.toFarm,
      fromFarm: form.fromFarm,
      toFarm: form.toFarm
    });

    setShowModal(false);
    setForm({ date: today(), product: '', quantity: '', fromFarm: 'AGRO BERRY 1', toFarm: 'AGRO BERRY 2' });
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Transferts</h1>
          <p className="text-gray-500">Transferts entre fermes</p>
        </div>
        <Button onClick={() => setShowModal(true)}>🔄 Nouveau Transfert</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FARMS.map(farm => {
          const incoming = movements.filter(t => t.type === 'transfer-in' && t.farm === farm.id).length;
          const outgoing = movements.filter(t => t.type === 'transfer-out' && t.farm === farm.id).length;
          return (
            <StatCard
              key={farm.id}
              icon="🔄"
              label={farm.name}
              value={`${incoming} ↓ / ${outgoing} ↑`}
              subValue="entrants / sortants"
              color={farm.color}
            />
          );
        })}
      </div>

      {/* Table */}
      <Card>
        {transfers.length === 0 ? (
          <EmptyState icon="🔄" message="Aucun transfert enregistré" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Quantité</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">De</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Vers</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">{t.date}</td>
                    <td className="py-3 px-4 font-medium">{t.product}</td>
                    <td className="py-3 px-4 text-right font-bold">{fmt(t.quantity)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                        {FARMS.find(f => f.id === t.fromFarm)?.short || t.fromFarm}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        {FARMS.find(f => f.id === t.toFarm)?.short || t.toFarm}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau Transfert">
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(v) => setForm({ ...form, date: v })}
            required
          />
          <Select
            label="Produit"
            value={form.product}
            onChange={(v) => setForm({ ...form, product: v })}
            options={[
              { value: '', label: 'Sélectionner...' },
              ...products.map(p => ({ value: p.name, label: p.name }))
            ]}
            required
          />
          <Input
            label="Quantité"
            type="number"
            value={form.quantity}
            onChange={(v) => setForm({ ...form, quantity: v })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="De (source)"
              value={form.fromFarm}
              onChange={(v) => setForm({ ...form, fromFarm: v })}
              options={FARMS.map(f => ({ value: f.id, label: f.name }))}
            />
            <Select
              label="Vers (destination)"
              value={form.toFarm}
              onChange={(v) => setForm({ ...form, toFarm: v })}
              options={FARMS.map(f => ({ value: f.id, label: f.name }))}
            />
          </div>
          {form.fromFarm === form.toFarm && (
            <p className="text-red-500 text-sm">⚠️ Les fermes doivent être différentes</p>
          )}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={form.fromFarm === form.toFarm}>
              Transférer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Transfers;
