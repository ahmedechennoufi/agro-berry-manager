import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { FARMS, MELANGES_PREDEFINIS, getProductPrice } from '../lib/constants';
import { today, getMonthIdx } from '../lib/utils';
import { getMelangesSauvegardes, saveMelangePersonnalise, deleteMelangePersonnalise, getAveragePrice } from '../lib/store';

const Melange = () => {
  const { addMovement, showNotif, loadData } = useApp();
  const [selectedMelange, setSelectedMelange] = useState('Myrtille Sol');
  const [form, setForm] = useState({ date: today(), farm: 'AGRO BERRY 1', ferSource: 'FEROXIM' });
  const [editableProduits, setEditableProduits] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newMelangeName, setNewMelangeName] = useState('');
  const [viewMode, setViewMode] = useState('predefinis');

  const melangesSauvegardes = getMelangesSauvegardes();
  const currentMelange = useMemo(() => viewMode === 'personnalises' ? melangesSauvegardes.find(m => m.nom === selectedMelange) : MELANGES_PREDEFINIS[selectedMelange], [selectedMelange, viewMode, melangesSauvegardes]);

  useEffect(() => { if (currentMelange) setEditableProduits(currentMelange.produits.map((p, i) => ({ id: i, nom: p.nom, qte: p.qte, unite: p.unite, enabled: true }))); }, [selectedMelange, viewMode]);

  const updateProduit = (id, field, value) => setEditableProduits(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  const toggleProduit = (id) => setEditableProduits(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  const getPrice = (name) => { const avg = getAveragePrice(name); return avg > 0 ? avg : getProductPrice(name); };
  const enabledProduits = editableProduits.filter(p => p.enabled && p.qte > 0);

  const handleApply = () => { if (enabledProduits.length === 0) { showNotif('Aucun produit', 'error'); return; } setShowConfirm(true); };
  const confirmApply = () => {
    const moisIdx = getMonthIdx(form.date);
    const dest = currentMelange?.type === 'Hydro' ? 'Hydro' : 'Sol';
    enabledProduits.forEach(p => addMovement({ date: form.date, type: 'consumption', product: p.nom.toUpperCase(), quantity: parseFloat(p.qte), price: getPrice(p.nom), farm: form.farm, culture: currentMelange?.culture || 'Myrtille', destination: dest, moisIdx, melange: selectedMelange }));
    showNotif(`✅ Mélange appliqué`);
    setShowConfirm(false);
  };
  const handleSaveMelange = () => {
    if (!newMelangeName.trim()) { showNotif('Nom requis', 'error'); return; }
    saveMelangePersonnalise({ nom: newMelangeName.trim(), culture: currentMelange?.culture || 'Myrtille', type: currentMelange?.type || 'Sol', produits: enabledProduits.map(p => ({ nom: p.nom, qte: p.qte, unite: p.unite })) });
    showNotif('✅ Sauvegardé'); setShowSaveModal(false); setNewMelangeName(''); loadData();
  };
  const handleDeleteMelange = (id, nom) => { if (confirm(`Supprimer "${nom}" ?`)) { deleteMelangePersonnalise(id); showNotif('Supprimé'); loadData(); } };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Mélanges</h1>
        <p className="text-ios-gray text-sm mt-1">Prédéfinis ou personnalisés</p>
      </div>
      <div className="flex gap-2">
        <Button variant={viewMode === 'predefinis' ? 'primary' : 'secondary'} onClick={() => setViewMode('predefinis')}>Prédéfinis</Button>
        <Button variant={viewMode === 'personnalises' ? 'primary' : 'secondary'} onClick={() => setViewMode('personnalises')}>Perso ({melangesSauvegardes.length})</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <h3 className="font-semibold text-ios-dark mb-3">{viewMode === 'predefinis' ? 'Prédéfinis' : 'Sauvegardés'}</h3>
          <div className="space-y-2">
            {viewMode === 'predefinis' ? Object.entries(MELANGES_PREDEFINIS).map(([key, m]) => (
              <button key={key} onClick={() => setSelectedMelange(key)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedMelange === key ? 'bg-blue-50 border-ios-blue' : 'bg-gray-50 border-gray-200'}`}>
                <p className="font-medium text-ios-dark">{m.nom}</p>
                <p className="text-xs text-ios-gray">{m.produits.length} produits</p>
              </button>
            )) : melangesSauvegardes.length === 0 ? <p className="text-ios-gray text-center py-6">Aucun</p> : melangesSauvegardes.map(m => (
              <div key={m.id} className={`p-3 rounded-xl border ${selectedMelange === m.nom ? 'bg-blue-50 border-ios-blue' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedMelange(m.nom)} className="text-left flex-1">
                    <p className="font-medium text-ios-dark">{m.nom}</p>
                    <p className="text-xs text-ios-gray">{m.produits?.length || 0} produits</p>
                  </button>
                  <button onClick={() => handleDeleteMelange(m.id, m.nom)} className="text-ios-red p-1">🗑</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ios-dark">{currentMelange?.nom || 'Sélectionner'}</h3>
            <Button size="sm" variant="secondary" onClick={() => setShowSaveModal(true)}>💾 Sauver</Button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
            <Select label="Ferme" value={form.farm} onChange={(v) => setForm({ ...form, farm: v })} options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
            <Select label="Source Fer" value={form.ferSource} onChange={(v) => setForm({ ...form, ferSource: v })} options={[{ value: 'FEROXIM', label: 'FEROXIM' }, { value: 'FERRILENE', label: 'FERRILENE' }]} />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {editableProduits.map(p => (
              <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg ${p.enabled ? 'bg-green-50' : 'bg-gray-100 opacity-50'}`}>
                <input type="checkbox" checked={p.enabled} onChange={() => toggleProduit(p.id)} className="w-5 h-5 accent-ios-green" />
                <span className="flex-1 text-sm font-medium text-ios-dark">{p.nom}</span>
                <input type="number" value={p.qte} onChange={(e) => updateProduit(p.id, 'qte', e.target.value)} className="w-16 p-2 text-sm bg-white border border-gray-200 rounded-lg text-right" disabled={!p.enabled} />
                <span className="text-xs text-ios-gray w-6">{p.unite}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
            <Button onClick={handleApply} disabled={enabledProduits.length === 0}>✅ Appliquer ({enabledProduits.length})</Button>
          </div>
        </Card>
      </div>
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmer">
        <div className="space-y-4">
          <p className="text-ios-gray">Appliquer "{selectedMelange}" à {FARMS.find(f => f.id === form.farm)?.name} ?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">Annuler</Button>
            <Button onClick={confirmApply} className="flex-1">Confirmer</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Sauvegarder">
        <div className="space-y-4">
          <Input label="Nom" value={newMelangeName} onChange={setNewMelangeName} placeholder="Mon mélange" />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSaveMelange} className="flex-1">Sauvegarder</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Melange;
