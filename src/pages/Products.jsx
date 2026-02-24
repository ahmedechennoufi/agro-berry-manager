import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/UI';
import { CATEGORIES, UNITS } from '../lib/constants';

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [form, setForm] = useState({ name: '', unit: 'KG', category: 'ENGRAIS' });

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchSearch && matchCategory;
  }), [products, search, filterCategory]);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingProduct) updateProduct(editingProduct.id, form);
    else addProduct(form);
    setShowModal(false); setEditingProduct(null); setForm({ name: '', unit: 'KG', category: 'ENGRAIS' });
  };

  const handleEdit = (p) => { setEditingProduct(p); setForm({ name: p.name, unit: p.unit, category: p.category }); setShowModal(true); };
  const handleDelete = (id) => { if (confirm('Supprimer ?')) deleteProduct(id); };
  const openNew = () => { setEditingProduct(null); setForm({ name: '', unit: 'KG', category: 'ENGRAIS' }); setShowModal(true); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">Produits</h1>
          <p className="text-ios-gray text-sm mt-1">{products.length} produits</p>
        </div>
        <Button onClick={openNew}>+ Ajouter</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} className="flex-1" />
        <Select value={filterCategory} onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: c.name }))]} className="sm:w-48" />
      </div>
      {filteredProducts.length === 0 ? <Card><EmptyState icon="📦" message="Aucun produit" /></Card> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map(p => (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                    {CATEGORIES.find(c => c.id === p.category)?.icon || '📦'}
                  </div>
                  <div>
                    <p className="font-medium text-ios-dark">{p.name}</p>
                    <p className="text-xs text-ios-gray">{p.category} • {p.unit}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-2 text-ios-blue">✏️</button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-ios-red">🗑</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier' : 'Nouveau Produit'}>
        <div className="space-y-4">
          <Input label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex: MAP, SULFATE..." />
          <Select label="Unité" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} options={UNITS.map(u => ({ value: u.id, label: u.name }))} />
          <Select label="Catégorie" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map(c => ({ value: c.id, label: c.name }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} className="flex-1">{editingProduct ? 'Modifier' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Products;
