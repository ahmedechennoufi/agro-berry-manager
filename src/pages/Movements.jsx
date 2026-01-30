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
  const [form, setForm] = useState({
    date: today(),
    type: 'entry',
    product: '',
    quantity: '',
    price: '',
    farm: '',
    supplier: '',
    notes: ''
  });

  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        const matchType = filterType === 'ALL' || m.type === filterType;
        const matchSearch = !search || m.product?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [movements, filterType, search]);

  const handleSubmit = () => {
    if (!form.product || !form.quantity) return;
    addMovement({
      ...form,
      quantity: parseFloat(form.quantity),
      price: parseFloat(form.price) || 0
    });
    setShowModal(false);
    setForm({ date: today(), type: 'entry', product: '', quantity: '', price: '', farm: '', supplier: '', notes: '' });
  };

  const handleDelete = (id) => {
    if (confirm('Supprimer ce mouvement ?')) {
      deleteMovement(id);
    }
  };

  const getTypeInfo = (type) => {
    return MOVEMENT_TYPES.find(t => t.id === type) || { icon: '📦', name: type, color: 'gray' };
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mouvements</h1>
          <p className="text-gray-500">{movements.length} mouvements enregistrés</p>
        </div>
        <Button onClick={() => setShowModal(true)}>➕ Nouveau</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Rechercher produit..."
            value={search}
            onChange={setSearch}
            className="flex-1"
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'ALL', label: 'Tous les types' },
              ...MOVEMENT_TYPES.map(t => ({ value: t.id, label: `${t.icon} ${t.name}` }))
            ]}
            className="md:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filteredMovements.length === 0 ? (
          <EmptyState message="Aucun mouvement trouvé" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Quantité</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Prix</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Ferme</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.slice(0, 100).map((m) => {
                  const typeInfo = getTypeInfo(m.type);
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600">{m.date}</td>
                      <td className="py-3 px-4">
                        <Badge color={typeInfo.color}>{typeInfo.icon} {typeInfo.name}</Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{m.product}</td>
                      <td className="py-3 px-4 text-right font-medium">{fmt(m.quantity)}</td>
                      <td className="py-3 px-4 text-right text-gray-500 hidden md:table-cell">
                        {m.price ? `${fmt(m.price)} MAD` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{m.farm || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau Mouvement">
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(v) => setForm({ ...form, date: v })}
            required
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v })}
            options={[
              { value: 'entry', label: '📥 Entrée (Achat)' },
              { value: 'exit', label: '📤 Sortie vers ferme' }
            ]}
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantité"
              type="number"
              value={form.quantity}
              onChange={(v) => setForm({ ...form, quantity: v })}
              required
            />
            <Input
              label="Prix unitaire"
              type="number"
              value={form.price}
              onChange={(v) => setForm({ ...form, price: v })}
            />
          </div>
          {form.type === 'exit' && (
            <Select
              label="Ferme"
              value={form.farm}
              onChange={(v) => setForm({ ...form, farm: v })}
              options={[
                { value: '', label: 'Sélectionner...' },
                ...FARMS.map(f => ({ value: f.id, label: f.name }))
              ]}
            />
          )}
          {form.type === 'entry' && (
            <Input
              label="Fournisseur"
              value={form.supplier}
              onChange={(v) => setForm({ ...form, supplier: v })}
            />
          )}
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

export default Movements;
