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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, filterCategory]);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    
    if (editingProduct) {
      updateProduct(editingProduct.id, form);
    } else {
      addProduct(form);
    }
    
    setShowModal(false);
    setEditingProduct(null);
    setForm({ name: '', unit: 'KG', category: 'ENGRAIS' });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setForm({ name: product.name, unit: product.unit, category: product.category });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Supprimer ce produit ?')) {
      deleteProduct(id);
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setForm({ name: '', unit: 'KG', category: 'ENGRAIS' });
    setShowModal(true);
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Produits</h1>
          <p className="text-gray-500">{products.length} produits enregistrés</p>
        </div>
        <Button onClick={openNewModal}>➕ Ajouter</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={setSearch}
            className="flex-1"
          />
          <Select
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'ALL', label: 'Toutes catégories' },
              ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
            className="md:w-48"
          />
        </div>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <EmptyState icon="📦" message="Aucun produit trouvé" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const cat = CATEGORIES.find(c => c.id === product.category);
            return (
              <Card key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat?.icon || '📦'}</span>
                  <div>
                    <h3 className="font-medium text-gray-800">{product.name}</h3>
                    <p className="text-sm text-gray-500">{cat?.name} • {product.unit}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(product)} 
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)} 
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    🗑️
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingProduct ? 'Modifier Produit' : 'Nouveau Produit'}
      >
        <div className="space-y-4">
          <Input
            label="Nom du produit"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Ex: MAP, SULFATE DE POTASSE..."
            required
          />
          <Select
            label="Unité"
            value={form.unit}
            onChange={(v) => setForm({ ...form, unit: v })}
            options={UNITS.map(u => ({ value: u.id, label: u.name }))}
          />
          <Select
            label="Catégorie"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            options={CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              {editingProduct ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
