import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, EmptyState, Badge } from '../components/UI';
import { CATEGORIES, UNITS } from '../lib/constants';
import { getDefaultThreshold, setDefaultThreshold } from '../lib/store';

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct, readOnly } = useApp();
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
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.3px' }}>Produits</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '4px 0 0' }}>
            {products.length} produits · Seuil alerte: {getDefaultThreshold()}
          </p>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setShowSettingsModal(true)}>⚙️ Seuils</Button>
            <Button onClick={openNew}>+ Nouveau</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} uppercase={false} />
        </div>
        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))]}
        />
      </div>

      {/* Category stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const count = products.filter(p => p.category === cat.id).length;
          const isActive = filterCategory === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => setFilterCategory(isActive ? 'ALL' : cat.id)}
              className="ios-card"
              style={{
                padding: '18px 20px', textAlign: 'center', cursor: 'pointer',
                border: isActive ? '2px solid var(--blue)' : '1px solid var(--border)',
                background: isActive ? '#f0f6ff' : 'var(--surface)',
                transition: 'all var(--transition)',
              }}
            >
              <span style={{ fontSize: 26, display: 'block', marginBottom: 8 }}>{cat.icon}</span>
              <p style={{ fontSize: 22, fontWeight: 700, color: isActive ? 'var(--blue)' : 'var(--text-1)', margin: '0 0 4px' }}>{count}</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{cat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <EmptyState icon="📦" message="Aucun produit trouvé" action={!readOnly && <Button onClick={openNew}>+ Ajouter</Button>} />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="ios-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'var(--surface-2)', flexShrink: 0 }}>
                    {CATEGORIES.find(c => c.id === p.category)?.icon || '📦'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: '0 0 5px', fontSize: 14 }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge color={getCategoryColor(p.category)}>{p.category}</Badge>
                      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{UNITS.find(u => u.id === p.unit)?.id || (['KG','L','U','BOITE','SAC'].includes(p.unit) ? p.unit : 'U')}</span>
                    </div>
                    {p.threshold && (
                      <p style={{ fontSize: 11, color: 'var(--orange)', margin: '5px 0 0' }}>⚠️ Seuil: {p.threshold}</p>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(p)} style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontSize: 14 }}>✏️</button>
                    <button onClick={() => handleDelete(p.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14 }}>🗑</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nouveau/Modifier */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Modifier Produit' : 'Nouveau Produit'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Nom du produit" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex: MAP, SULFATE..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Unité" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} options={UNITS.map(u => ({ value: u.id, label: u.name }))} />
            <Select label="Catégorie" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          </div>
          <Input label={`Seuil d'alerte (défaut: ${getDefaultThreshold()})`} type="number" value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} placeholder="Laisser vide pour défaut" uppercase={false} />
          <div className="alert-warning">
            <p style={{ fontSize: 13, margin: 0 }}>⚠️ Alerte affichée quand le stock descend en dessous du seuil.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button onClick={handleSubmit} style={{ flex: 1 }}>{editingProduct ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Paramètres */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Paramètres d'alerte">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Seuil par défaut global" type="number" value={defaultThresholdValue} onChange={setDefaultThresholdValue} placeholder="10" uppercase={false} />
          <div className="alert-info">
            <p style={{ fontSize: 13, margin: 0 }}>ℹ️ Ce seuil s'applique à tous les produits sans seuil personnalisé.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => setShowSettingsModal(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button onClick={handleSaveDefaultThreshold} style={{ flex: 1 }}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
