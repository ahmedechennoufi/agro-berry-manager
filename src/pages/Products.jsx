import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, EmptyState, Badge } from '../components/UI';
import { CATEGORIES, UNITS } from '../lib/constants';
import { getDefaultThreshold, setDefaultThreshold } from '../lib/store';

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [form, setForm] = useState({ name: '', unit: 'KG', category: 'ENGRAIS', threshold: '' });
  const [defaultThresholdValue, setDefaultThresholdValue] = useState(getDefaultThreshold());

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchSearch && matchCategory;
  }), [products, search, filterCategory]);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const productData = { ...form, threshold: form.threshold ? parseFloat(form.threshold) : null };
    if (editingProduct) updateProduct(editingProduct.id, productData);
    else addProduct(productData);
    setShowModal(false); setEditingProduct(null); setForm({ name: '', unit: 'KG', category: 'ENGRAIS', threshold: '' });
  };

  const handleEdit = (p) => { 
    setEditingProduct(p); 
    setForm({ name: p.name, unit: p.unit, category: p.category, threshold: p.threshold ?? '' }); 
    setShowModal(true); 
  };
  
  const handleDelete = (id) => { if (confirm('Supprimer ce produit ?')) deleteProduct(id); };
  const openNew = () => { setEditingProduct(null); setForm({ name: '', unit: 'KG', category: 'ENGRAIS', threshold: '' }); setShowModal(true); };

  const handleSaveDefaultThreshold = () => {
    setDefaultThreshold(parseInt(defaultThresholdValue) || 10);
    setShowSettingsModal(false);
  };

  const getCategoryColor = (cat) => {
    const colors = { ENGRAIS: 'green', PHYTOSANITAIRES: 'red', ACIDES: 'orange', AUTRES: 'purple' };
    return colors[cat] || 'blue';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-500 mt-1">{products.length} produits • Seuil alerte: {getDefaultThreshold()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowSettingsModal(true)}>⚙️ Seuils</Button>
          <Button onClick={openNew}>+ Nouveau</Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} />
        </div>
        <Select 
          value={filterCategory} 
          onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))]} 
          className="sm:w-56"
        />
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.map(cat => {
          const count = products.filter(p => p.category === cat.id).length;
          const isActive = filterCategory === cat.id;
          return (
            <Card 
              key={cat.id}
              onClick={() => setFilterCategory(isActive ? 'ALL' : cat.id)}
              className={`cursor-pointer text-center transition-all ${isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
            >
              <span className="text-3xl">{cat.icon}</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
              <p className="text-sm text-gray-500">{cat.name}</p>
            </Card>
          );
        })}
      </div>
      
      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <EmptyState icon="📦" message="Aucun produit trouvé" action={<Button onClick={openNew}>+ Ajouter</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(p => (
            <Card key={p.id} className="group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-gray-100">
                    {CATEGORIES.find(c => c.id === p.category)?.icon || '📦'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={getCategoryColor(p.category)}>{p.category}</Badge>
                      <span className="text-xs text-gray-500">{p.unit}</span>
                    </div>
                    {p.threshold && <p className="text-xs text-orange-500 mt-1">⚠️ Seuil: {p.threshold}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-gray-100 text-blue-500">✏️</button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-gray-100 text-red-500">🗑</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Modal Nouveau/Modifier */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier Produit' : 'Nouveau Produit'}>
        <div className="space-y-4">
          <Input label="Nom du produit" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex: MAP, SULFATE..." />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unité" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} options={UNITS.map(u => ({ value: u.id, label: u.name }))} />
            <Select label="Catégorie" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          </div>
          <Input label={`Seuil d'alerte (défaut: ${getDefaultThreshold()})`} type="number" value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} placeholder="Laisser vide pour défaut" />
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-sm text-orange-700">⚠️ Alerte affichée quand le stock descend en dessous du seuil.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} className="flex-1">{editingProduct ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Paramètres */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Paramètres d'alerte">
        <div className="space-y-4">
          <Input label="Seuil par défaut global" type="number" value={defaultThresholdValue} onChange={setDefaultThresholdValue} placeholder="10" />
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">ℹ️ Ce seuil s'applique à tous les produits sans seuil personnalisé.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowSettingsModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSaveDefaultThreshold} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
