import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/UI';
import { FARMS, MOVEMENT_TYPES } from '../lib/constants';
import { fmt, today } from '../lib/utils';

const Movements = () => {
  const { products, movements, addMovement, deleteMovement } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ date: today(), type: 'entry', product: '', quantity: '', price: '', farm: '', supplier: '' });

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchType = filterType === 'ALL' || m.type === filterType;
      const matchSearch = !search || m.product?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [movements, filterType, search]);

  const handleSubmit = () => {
    if (!form.product || !form.quantity) return;
    addMovement({ ...form, quantity: parseFloat(form.quantity), price: parseFloat(form.price) || 0 });
    setShowModal(false);
    setForm({ date: today(), type: 'entry', product: '', quantity: '', price: '', farm: '', supplier: '' });
  };

  const handleDelete = (id) => { if (confirm('Supprimer ?')) deleteMovement(id); };
  const getTypeInfo = (type) => MOVEMENT_TYPES.find(t => t.id === type) || { name: type, color: 'gray' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">Mouvements</h1>
          <p className="text-ios-gray text-sm mt-1">{movements.length} mouvements</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Nouveau</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} className="flex-1" />
        <Select value={filterType} onChange={setFilterType} 
          options={[{ value: 'ALL', label: 'Tous types' }, ...MOVEMENT_TYPES.map(t => ({ value: t.id, label: t.name }))]} 
          className="sm:w-44" />
      </div>

      <Card>
        {filteredMovements.length === 0 ? <EmptyState icon="📭" message="Aucun mouvement" /> : (
          <div className="overflow-x-auto">
            <table className="ios-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Produit</th>
                  <th className="text-right">Qté</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.slice(0, 100).map(m => {
                  const typeInfo = getTypeInfo(m.type);
                  return (
                    <tr key={m.id}>
                      <td className="text-ios-gray text-sm">{m.date}</td>
                      <td><Badge color={typeInfo.color}>{typeInfo.name}</Badge></td>
                      <td className="font-medium text-ios-dark">{m.product}</td>
                      <td className="text-right font-semibold">{fmt(m.quantity)}</td>
                      <td className="text-center">
                        <button onClick={() => handleDelete(m.id)} className="text-ios-red">🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau Mouvement">
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <Select label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })}
            options={[{ value: 'entry', label: 'Entrée' }, { value: 'exit', label: 'Sortie' }]} />
          <Select label="Produit" value={form.product} onChange={(v) => setForm({ ...form, product: v })}
            options={[{ value: '', label: 'Choisir...' }, ...products.map(p => ({ value: p.name, label: p.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantité" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
            <Input label="Prix" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
          </div>
          {form.type === 'exit' && (
            <Select label="Ferme" value={form.farm} onChange={(v) => setForm({ ...form, farm: v })}
              options={[{ value: '', label: 'Choisir...' }, ...FARMS.map(f => ({ value: f.id, label: f.name }))]} />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Movements;
