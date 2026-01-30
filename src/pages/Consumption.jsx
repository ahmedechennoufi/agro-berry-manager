import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, StatCard, EmptyState } from '../components/UI';
import { FARMS, CULTURES, DESTINATIONS } from '../lib/constants';
import { fmt, today } from '../lib/utils';
import { getAveragePrice } from '../lib/store';

const Consumption = () => {
  const { products, movements, addMovement } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [form, setForm] = useState({
    date: today(),
    product: '',
    quantity: '',
    farm: 'AGRO BERRY 1',
    culture: 'Myrtille',
    destination: 'Sol'
  });

  const consumptions = useMemo(() => {
    return movements.filter(m => m.type === 'consumption');
  }, [movements]);

  const filteredConsumptions = useMemo(() => {
    return consumptions.filter(m => selectedFarm === 'ALL' || m.farm === selectedFarm);
  }, [consumptions, selectedFarm]);

  const consoByProduct = useMemo(() => {
    const map = {};
    filteredConsumptions.forEach(m => {
      if (!map[m.product]) {
        map[m.product] = { name: m.product, total: 0, byFarm: {} };
      }
      map[m.product].total += m.quantity || 0;
      if (!map[m.product].byFarm[m.farm]) map[m.product].byFarm[m.farm] = 0;
      map[m.product].byFarm[m.farm] += m.quantity || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredConsumptions]);

  const handleSubmit = () => {
    if (!form.product || !form.quantity) return;
    
    const price = getAveragePrice(form.product);
    
    addMovement({
      date: form.date,
      type: 'consumption',
      product: form.product,
      quantity: parseFloat(form.quantity),
      price: price,
      farm: form.farm,
      culture: form.culture,
      destination: form.destination
    });
    
    setShowModal(false);
    setForm({ date: today(), product: '', quantity: '', farm: 'AGRO BERRY 1', culture: 'Myrtille', destination: 'Sol' });
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Consommation</h1>
          <p className="text-gray-500">{consumptions.length} consommations enregistrées</p>
        </div>
        <Button onClick={() => setShowModal(true)}>🔥 Saisir Consommation</Button>
      </div>

      {/* Stats per farm */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FARMS.map(farm => {
          const farmConso = consumptions.filter(c => c.farm === farm.id);
          const total = farmConso.reduce((s, c) => s + (c.quantity || 0), 0);
          return (
            <StatCard
              key={farm.id}
              icon="🔥"
              label={farm.name}
              value={fmt(total)}
              subValue={`${farmConso.length} mouvements`}
              color={farm.color}
            />
          );
        })}
      </div>

      {/* Filter */}
      <Card>
        <Select
          label="Filtrer par ferme"
          value={selectedFarm}
          onChange={setSelectedFarm}
          options={[
            { value: 'ALL', label: 'Toutes les fermes' },
            ...FARMS.map(f => ({ value: f.id, label: f.name }))
          ]}
          className="md:w-64"
        />
      </Card>

      {/* Table */}
      <Card>
        <h3 className="font-bold text-gray-800 mb-4">Consommation par produit</h3>
        {consoByProduct.length === 0 ? (
          <EmptyState icon="🔥" message="Aucune consommation enregistrée" />
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
                {consoByProduct.map((p, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{fmt(p.byFarm['AGRO BERRY 1'] || 0)}</td>
                    <td className="py-3 px-4 text-right text-orange-600">{fmt(p.byFarm['AGRO BERRY 2'] || 0)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{fmt(p.byFarm['AGRO BERRY 3'] || 0)}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">{fmt(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Saisir Consommation">
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(v) => setForm({ ...form, date: v })}
            required
          />
          <Select
            label="Ferme"
            value={form.farm}
            onChange={(v) => setForm({ ...form, farm: v })}
            options={FARMS.map(f => ({ value: f.id, label: f.name }))}
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
          <Select
            label="Culture"
            value={form.culture}
            onChange={(v) => setForm({ ...form, culture: v })}
            options={CULTURES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          />
          <Select
            label="Destination"
            value={form.destination}
            onChange={(v) => setForm({ ...form, destination: v })}
            options={DESTINATIONS.map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }))}
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Consumption;
