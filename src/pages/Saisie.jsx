import React, { useState } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { FARMS, CULTURES, DESTINATIONS, PRODUITS_CONNUS, getProductPrice } from '../lib/constants';
import { today, getMonthIdx } from '../lib/utils';
import { getAveragePrice } from '../lib/store';

const Saisie = () => {
  const { addMovement, showNotif } = useApp();
  const [form, setForm] = useState({ date: today(), farm: 'AGRO BERRY 1', culture: 'Myrtille', destination: 'Sol', lignes: [{ id: 1, produit: '', qte: '', unite: 'kg' }] });
  const [showConfirm, setShowConfirm] = useState(false);

  const addLigne = () => setForm(prev => ({ ...prev, lignes: [...prev.lignes, { id: Date.now(), produit: '', qte: '', unite: 'kg' }] }));
  const removeLigne = (id) => { if (form.lignes.length > 1) setForm(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) })); };
  const updateLigne = (id, field, value) => {
    setForm(prev => ({
      ...prev, lignes: prev.lignes.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'produit') { const c = PRODUITS_CONNUS.find(p => p.nom.toUpperCase() === value.toUpperCase()); if (c) updated.unite = c.unite; }
        return updated;
      })
    }));
  };
  const getPrice = (name) => { const avg = getAveragePrice(name); return avg > 0 ? avg : getProductPrice(name); };

  const handleSubmit = () => {
    const valid = form.lignes.filter(l => l.produit && parseFloat(l.qte) > 0);
    if (valid.length === 0) { showNotif('Ajoutez un produit', 'error'); return; }
    setShowConfirm(true);
  };

  const confirmSubmit = () => {
    const valid = form.lignes.filter(l => l.produit && parseFloat(l.qte) > 0);
    const moisIdx = getMonthIdx(form.date);
    valid.forEach(l => {
      addMovement({ date: form.date, type: 'consumption', product: l.produit.toUpperCase(), quantity: parseFloat(l.qte), price: getPrice(l.produit), farm: form.farm, culture: form.culture, destination: form.destination, moisIdx });
    });
    showNotif(`✅ ${valid.length} consommation(s)`);
    setForm({ date: today(), farm: form.farm, culture: form.culture, destination: form.destination, lignes: [{ id: Date.now(), produit: '', qte: '', unite: 'kg' }] });
    setShowConfirm(false);
  };

  const validLignes = form.lignes.filter(l => l.produit && parseFloat(l.qte) > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Saisie Consommation</h1>
        <p className="text-ios-gray text-sm mt-1">Enregistrer la consommation</p>
      </div>
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <Select label="Ferme" value={form.farm} onChange={(v) => setForm({ ...form, farm: v })} options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
          <Select label="Culture" value={form.culture} onChange={(v) => setForm({ ...form, culture: v })} options={CULTURES.map(c => ({ value: c.id, label: c.name }))} />
          <Select label="Destination" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} options={DESTINATIONS.map(d => ({ value: d.id, label: d.name }))} />
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-ios-dark">Produits</span>
          <Button size="sm" onClick={addLigne}>+ Ligne</Button>
        </div>
        <datalist id="produits-list">{PRODUITS_CONNUS.map(p => <option key={p.nom} value={p.nom} />)}</datalist>
        <div className="space-y-2">
          {form.lignes.map((l, i) => (
            <div key={l.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-xl">
              <Input label={i === 0 ? "Produit" : ""} value={l.produit} onChange={(v) => updateLigne(l.id, 'produit', v)} placeholder="Nom" list="produits-list" className="flex-1" />
              <Input label={i === 0 ? "Qté" : ""} type="number" value={l.qte} onChange={(v) => updateLigne(l.id, 'qte', v)} placeholder="0" className="w-24" />
              <Select label={i === 0 ? "Unité" : ""} value={l.unite} onChange={(v) => updateLigne(l.id, 'unite', v)} options={[{ value: 'kg', label: 'KG' }, { value: 'L', label: 'L' }]} className="w-20" />
              {form.lignes.length > 1 && <button onClick={() => removeLigne(l.id)} className="text-ios-red pb-1">🗑</button>}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <Button onClick={handleSubmit} disabled={validLignes.length === 0}>✅ Enregistrer ({validLignes.length})</Button>
        </div>
      </Card>
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmer">
        <div className="space-y-4">
          <p className="text-ios-gray">{validLignes.length} produit(s) pour {FARMS.find(f => f.id === form.farm)?.name}</p>
          <div className="bg-gray-50 p-3 rounded-xl text-sm">
            {validLignes.map((l, i) => <p key={i} className="text-ios-dark">• {l.produit}: <span className="font-semibold text-ios-green">{l.qte} {l.unite}</span></p>)}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">Annuler</Button>
            <Button onClick={confirmSubmit} className="flex-1">Confirmer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Saisie;
