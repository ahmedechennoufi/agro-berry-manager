import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, Badge, StatCard } from '../components/UI';
import { FARMS, MELANGES_PREDEFINIS, FARM_CULTURES, CULTURES, COST_CATEGORIES, SUPERFICIES_DETAIL } from '../lib/constants';
import { today, fmt, fmtMoney } from '../lib/utils';
import { getMelangesSauvegardes, saveMelangePersonnalise, deleteMelangePersonnalise, getAveragePrice, calculateFarmStock } from '../lib/store';

const Melange = () => {
  const { addMovement, showNotif, loadData } = useApp();
  
  // State
  const [selectedMelange, setSelectedMelange] = useState('Myrtille Sol');
  const [selectedFarm, setSelectedFarm] = useState('AGRO BERRY 1');
  const [selectedCulture, setSelectedCulture] = useState('Myrtille');
  const [form, setForm] = useState({ date: today(), ferSource: 'FEROXIM' });
  const [editableProduits, setEditableProduits] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newMelangeName, setNewMelangeName] = useState('');
  const [viewMode, setViewMode] = useState('predefinis');

  // Get melanges
  const melangesSauvegardes = getMelangesSauvegardes();
  const currentMelange = useMemo(() => 
    viewMode === 'personnalises' 
      ? melangesSauvegardes.find(m => m.nom === selectedMelange) 
      : MELANGES_PREDEFINIS[selectedMelange], 
    [selectedMelange, viewMode, melangesSauvegardes]
  );

  // Available cultures for selected farm
  const availableCultures = useMemo(() => {
    return CULTURES.filter(c => FARM_CULTURES[selectedFarm]?.includes(c.id));
  }, [selectedFarm]);

  // Available melanges based on farm (AGB3 has no Sol)
  const availableMelanges = useMemo(() => {
    const melanges = Object.entries(MELANGES_PREDEFINIS);
    if (selectedFarm === 'AGRO BERRY 3') {
      // AGB3 only has Hydro, filter out Sol melanges
      return melanges.filter(([key, m]) => m.type === 'Hydro');
    }
    return melanges;
  }, [selectedFarm]);

  // Farm stock
  const farmStock = useMemo(() => calculateFarmStock(selectedFarm), [selectedFarm]);

  // Superficie
  const getSuperficie = () => {
    const farmData = SUPERFICIES_DETAIL[selectedFarm];
    if (!farmData || !farmData[selectedCulture]) return 0;
    const type = currentMelange?.type || 'Sol';
    return farmData[selectedCulture][type] || 0;
  };

  // Load products when melange changes
  useEffect(() => { 
    if (currentMelange) {
      setEditableProduits(currentMelange.produits.map((p, i) => ({ 
        id: i, 
        nom: p.nom, 
        qte: p.qte, 
        unite: p.unite, 
        enabled: true,
        price: getAveragePrice(p.nom) || 0
      }))); 
    }
  }, [selectedMelange, viewMode]);

  // When farm changes, update culture and melange if needed
  useEffect(() => {
    const cultures = FARM_CULTURES[selectedFarm] || [];
    if (!cultures.includes(selectedCulture)) {
      setSelectedCulture(cultures[0] || 'Myrtille');
    }
    // AGB3 only has Hydro, switch to Hydro melange if Sol is selected
    if (selectedFarm === 'AGRO BERRY 3' && selectedMelange.includes('Sol')) {
      setSelectedMelange('Myrtille Hydro');
    }
  }, [selectedFarm]);

  // Update product
  const updateProduit = (id, field, value) => 
    setEditableProduits(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  
  const toggleProduit = (id) => 
    setEditableProduits(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  
  const getPrice = (name) => { 
    const avg = getAveragePrice(name); 
    return avg > 0 ? avg : 0; 
  };
  
  const enabledProduits = editableProduits.filter(p => p.enabled && p.qte > 0);
  
  // Calculate totals
  const totalCost = enabledProduits.reduce((sum, p) => sum + (parseFloat(p.qte) || 0) * (getPrice(p.nom) || 0), 0);
  const totalQty = enabledProduits.reduce((sum, p) => sum + (parseFloat(p.qte) || 0), 0);

  // Check stock availability
  const checkStock = (productName) => {
    const stock = farmStock[productName]?.quantity || 0;
    return stock;
  };

  // Apply melange
  const handleApply = () => { 
    if (enabledProduits.length === 0) { 
      showNotif('Aucun produit sélectionné', 'error'); 
      return; 
    } 
    setShowConfirm(true); 
  };

  const confirmApply = () => {
    const dest = currentMelange?.type === 'Hydro' ? 'Hydro' : 'Sol';
    const category = dest === 'Hydro' ? 'Engrais Poudre Hydroponic' : 'Engrais Poudre Sol';
    
    enabledProduits.forEach(p => {
      addMovement({ 
        date: form.date, 
        type: 'consumption', 
        product: p.nom.toUpperCase(), 
        quantity: parseFloat(p.qte), 
        price: getPrice(p.nom), 
        farm: selectedFarm, 
        culture: selectedCulture, 
        destination: dest,
        category: category,
        melange: selectedMelange 
      });
    });
    
    showNotif(`✅ Mélange appliqué à ${FARMS.find(f => f.id === selectedFarm)?.name}`);
    setShowConfirm(false);
    loadData();
  };

  // Save custom melange
  const handleSaveMelange = () => {
    if (!newMelangeName.trim()) { 
      showNotif('Nom requis', 'error'); 
      return; 
    }
    saveMelangePersonnalise({ 
      nom: newMelangeName.trim(), 
      culture: selectedCulture, 
      type: currentMelange?.type || 'Sol', 
      produits: enabledProduits.map(p => ({ nom: p.nom, qte: p.qte, unite: p.unite })) 
    });
    showNotif('✅ Mélange sauvegardé'); 
    setShowSaveModal(false); 
    setNewMelangeName(''); 
    loadData();
  };

  const handleDeleteMelange = (id, nom) => { 
    if (confirm(`Supprimer "${nom}" ?`)) { 
      deleteMelangePersonnalise(id); 
      showNotif('Mélange supprimé'); 
      loadData(); 
    } 
  };

  const farmInfo = FARMS.find(f => f.id === selectedFarm);
  const superficie = getSuperficie();

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mélanges</h1>
          <p className="text-gray-500 mt-1">Appliquer un mélange à une ferme</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'predefinis' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('predefinis')}
          >
            📋 Prédéfinis
          </Button>
          <Button 
            variant={viewMode === 'personnalises' ? 'primary' : 'secondary'} 
            onClick={() => setViewMode('personnalises')}
          >
            ⭐ Perso ({melangesSauvegardes.length})
          </Button>
        </div>
      </div>

      {/* Farm & Culture Selection */}
      <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">🌱</div>
          <div>
            <h2 className="text-xl font-bold">Ferme Destination</h2>
            <p className="text-white/80">Le mélange sera déduit du stock de cette ferme</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Farm Selection */}
          <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
            {FARMS.map(farm => (
              <button
                key={farm.id}
                onClick={() => setSelectedFarm(farm.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  selectedFarm === farm.id 
                    ? 'bg-white text-green-600' 
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {farm.short}
              </button>
            ))}
          </div>
          
          {/* Culture Selection */}
          <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
            {availableCultures.map(culture => (
              <button
                key={culture.id}
                onClick={() => setSelectedCulture(culture.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  selectedCulture === culture.id 
                    ? 'bg-white text-green-600' 
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {culture.icon} {culture.name}
              </button>
            ))}
          </div>
          
          {/* Info */}
          <div className="ml-auto text-right">
            <p className="text-white/80 text-sm">Superficie {currentMelange?.type || 'Sol'}</p>
            <p className="font-bold text-xl">{superficie.toFixed(2)} ha</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Melanges List */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">
            {viewMode === 'predefinis' ? '📋 Mélanges Prédéfinis' : '⭐ Mélanges Sauvegardés'}
          </h3>
          <div className="space-y-2">
            {viewMode === 'predefinis' ? (
              availableMelanges.map(([key, m]) => (
                <button 
                  key={key} 
                  onClick={() => setSelectedMelange(key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedMelange === key 
                      ? 'bg-green-50 border-green-500 shadow-sm' 
                      : 'bg-gray-50 border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{m.nom}</p>
                      <p className="text-xs text-gray-500">{m.produits.length} produits • {m.type}</p>
                    </div>
                    <Badge color={m.type === 'Hydro' ? 'blue' : 'green'}>{m.type}</Badge>
                  </div>
                </button>
              ))
            ) : melangesSauvegardes.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Aucun mélange sauvegardé</p>
            ) : (
              melangesSauvegardes.map(m => (
                <div 
                  key={m.id} 
                  className={`p-3 rounded-xl border ${
                    selectedMelange === m.nom 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedMelange(m.nom)} className="text-left flex-1">
                      <p className="font-medium text-gray-900">{m.nom}</p>
                      <p className="text-xs text-gray-500">{m.produits?.length || 0} produits</p>
                    </button>
                    <button onClick={() => handleDeleteMelange(m.id, m.nom)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Melange Editor */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{currentMelange?.nom || 'Sélectionner un mélange'}</h3>
              <p className="text-sm text-gray-500">
                {currentMelange?.culture} • {currentMelange?.type} • {farmInfo?.name}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setShowSaveModal(true)}>💾 Sauvegarder</Button>
          </div>
          
          {/* Settings */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <Input 
              label="📅 Date" 
              type="date" 
              value={form.date} 
              onChange={(v) => setForm({ ...form, date: v })} 
            />
            <Select 
              label="🔬 Source Fer" 
              value={form.ferSource} 
              onChange={(v) => setForm({ ...form, ferSource: v })} 
              options={[
                { value: 'FEROXIM', label: 'FEROXIM' }, 
                { value: 'FERRILENE', label: 'FERRILENE' }
              ]} 
            />
            <div className="flex flex-col justify-end">
              <p className="text-xs text-gray-500 mb-1">Destination</p>
              <Badge color={currentMelange?.type === 'Hydro' ? 'blue' : 'green'} className="text-center py-2">
                {currentMelange?.type === 'Hydro' ? '💧 Hydroponic' : '🌍 Sol'}
              </Badge>
            </div>
          </div>
          
          {/* Products List */}
          <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-2 pb-2 border-b">
              <div className="col-span-1">✓</div>
              <div className="col-span-5">Produit</div>
              <div className="col-span-2 text-right">Qté</div>
              <div className="col-span-2 text-right">Stock</div>
              <div className="col-span-2 text-right">Coût</div>
            </div>
            
            {editableProduits.map(p => {
              const stock = checkStock(p.nom.toUpperCase());
              const cost = (parseFloat(p.qte) || 0) * (getPrice(p.nom) || 0);
              const hasStock = stock >= (parseFloat(p.qte) || 0);
              
              return (
                <div 
                  key={p.id} 
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-all ${
                    p.enabled 
                      ? hasStock ? 'bg-green-50' : 'bg-orange-50' 
                      : 'bg-gray-100 opacity-50'
                  }`}
                >
                  <div className="col-span-1">
                    <input 
                      type="checkbox" 
                      checked={p.enabled} 
                      onChange={() => toggleProduit(p.id)} 
                      className="w-5 h-5 accent-green-500 rounded" 
                    />
                  </div>
                  <div className="col-span-5">
                    <span className="text-sm font-medium text-gray-900">{p.nom}</span>
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      value={p.qte} 
                      onChange={(e) => updateProduit(p.id, 'qte', e.target.value)} 
                      className="w-full p-1.5 text-sm bg-white border border-gray-200 rounded-lg text-right" 
                      disabled={!p.enabled} 
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm ${hasStock ? 'text-green-600' : 'text-orange-600'}`}>
                      {fmt(stock)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-gray-600">{fmtMoney(cost)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Summary & Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500">Produits</p>
                <p className="font-bold text-gray-900">{enabledProduits.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quantité</p>
                <p className="font-bold text-gray-900">{fmt(totalQty)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Coût estimé</p>
                <p className="font-bold text-green-600">{fmtMoney(totalCost)}</p>
              </div>
            </div>
            <Button onClick={handleApply} disabled={enabledProduits.length === 0}>
              ✅ Appliquer à {farmInfo?.short}
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirm Modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="🔄 Confirmer l'application">
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🧪</span>
              <div>
                <p className="font-bold text-gray-900">{selectedMelange}</p>
                <p className="text-sm text-gray-600">{enabledProduits.length} produits • {currentMelange?.type}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-white rounded-lg">
                <p className="text-gray-500">Ferme</p>
                <p className="font-semibold">{farmInfo?.name}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <p className="text-gray-500">Culture</p>
                <p className="font-semibold">{selectedCulture}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <p className="text-gray-500">Date</p>
                <p className="font-semibold">{form.date}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <p className="text-gray-500">Coût</p>
                <p className="font-semibold text-green-600">{fmtMoney(totalCost)}</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
            <p className="text-sm text-orange-700">
              ⚠️ Les quantités seront déduites du stock de <strong>{farmInfo?.name}</strong>
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={confirmApply} className="flex-1">
              ✅ Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save Modal */}
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="💾 Sauvegarder le mélange">
        <div className="space-y-4">
          <Input 
            label="Nom du mélange" 
            value={newMelangeName} 
            onChange={setNewMelangeName} 
            placeholder="Ex: Mon mélange personnalisé" 
          />
          <div className="p-3 bg-gray-50 rounded-xl text-sm">
            <p className="text-gray-600">
              {enabledProduits.length} produits • {currentMelange?.type} • {selectedCulture}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSaveMelange} className="flex-1">
              Sauvegarder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Melange;
