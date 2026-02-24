import React, { useState } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { FARMS, CULTURES, DESTINATIONS, PRODUITS_CONNUS } from '../lib/constants';
import { today, getMonthIdx } from '../lib/utils';
import { getAveragePrice, addConsommation } from '../lib/store';

const Saisie = () => {
  const { products, addMovement, showNotif, loadData, triggerAutoBackup } = useApp();
  const [form, setForm] = useState({ 
    date: today(), 
    farm: 'AGRO BERRY 1', 
    culture: 'Myrtille', 
    destination: 'Sol', 
    lignes: [{ id: 1, produit: '', qte: '', unite: 'kg' }] 
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const addLigne = () => setForm(prev => ({ 
    ...prev, 
    lignes: [...prev.lignes, { id: Date.now(), produit: '', qte: '', unite: 'kg' }] 
  }));

  const removeLigne = (id) => { 
    if (form.lignes.length > 1) {
      setForm(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) }));
    }
  };

  const updateLigne = (id, field, value) => {
    setForm(prev => ({
      ...prev, 
      lignes: prev.lignes.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'produit') { 
          const c = PRODUITS_CONNUS.find(p => p.nom.toUpperCase() === value.toUpperCase()); 
          if (c) updated.unite = c.unite.toLowerCase(); 
        }
        return updated;
      })
    }));
  };

  const getPrice = (name) => { 
    const avg = getAveragePrice(name); 
    if (avg > 0) return avg;
    const known = PRODUITS_CONNUS.find(p => p.nom.toUpperCase() === name?.toUpperCase());
    return known?.prix || 0;
  };

  const validLignes = form.lignes.filter(l => l.produit && parseFloat(l.qte) > 0);

  const handleSubmit = () => {
    if (validLignes.length === 0) { 
      showNotif('Ajoutez au moins un produit', 'error'); 
      return; 
    }
    setShowConfirm(true);
  };

  const confirmSubmit = () => {
    const moisIdx = getMonthIdx(form.date);
    
    validLignes.forEach(l => {
      const productName = l.produit.toUpperCase();
      const qty = parseFloat(l.qte);
      const price = getPrice(l.produit);
      
      // Ajouter mouvement de consommation
      addMovement({ 
        date: form.date, 
        type: 'consumption', 
        product: productName, 
        quantity: qty, 
        price, 
        farm: form.farm, 
        culture: form.culture, 
        destination: form.destination, 
        moisIdx 
      });
      
      // Ajouter aussi dans consommations (pour compatibilité avec app coût)
      addConsommation({
        date: form.date,
        farm: form.farm,
        culture: form.culture,
        category: form.destination === 'Sol' ? 'Engrais Poudre Sol' : 
                  form.destination === 'Hydro' ? 'Engrais Poudre Hydroponic' : 
                  form.destination === 'Pesticide' ? 'Pesticides' : 'Engrais Foliaire',
        product: productName,
        quantity: qty,
        price,
        monthIndex: moisIdx
      });
    });
    
    showNotif(`✅ ${validLignes.length} consommation(s) enregistrée(s)`);
    loadData();
    triggerAutoBackup();
    setForm({ 
      date: today(), 
      farm: form.farm, 
      culture: form.culture, 
      destination: form.destination, 
      lignes: [{ id: Date.now(), produit: '', qte: '', unite: 'kg' }] 
    });
    setShowConfirm(false);
  };

  const totalValue = validLignes.reduce((sum, l) => sum + (parseFloat(l.qte) || 0) * getPrice(l.produit), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ios-dark">Saisie Consommation</h1>
        <p className="text-ios-gray text-sm mt-1">Enregistrer la consommation journalière</p>
      </div>

      <Card>
        {/* Paramètres */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <Select label="Ferme" value={form.farm} onChange={(v) => setForm({ ...form, farm: v })} 
            options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
          <Select label="Culture" value={form.culture} onChange={(v) => setForm({ ...form, culture: v })} 
            options={CULTURES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          <Select label="Destination" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} 
            options={DESTINATIONS.map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }))} />
        </div>

        {/* Lignes de produits */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-ios-dark">Produits</span>
          <Button size="sm" onClick={addLigne}>+ Ajouter ligne</Button>
        </div>

        <datalist id="produits-list">
          {[...new Set([...PRODUITS_CONNUS.map(p => p.nom), ...products.map(p => p.name)])].map(nom => 
            <option key={nom} value={nom} />
          )}
        </datalist>

        <div className="space-y-2">
          {form.lignes.map((l, i) => (
            <div key={l.id} className="flex gap-2 items-end p-3 bg-gray-50 rounded-xl">
              <Input 
                label={i === 0 ? "Produit" : ""} 
                value={l.produit} 
                onChange={(v) => updateLigne(l.id, 'produit', v)} 
                placeholder="Nom du produit" 
                list="produits-list" 
                className="flex-1" 
              />
              <Input 
                label={i === 0 ? "Quantité" : ""} 
                type="number" 
                value={l.qte} 
                onChange={(v) => updateLigne(l.id, 'qte', v)} 
                placeholder="0" 
                className="w-24" 
              />
              <Select 
                label={i === 0 ? "Unité" : ""} 
                value={l.unite} 
                onChange={(v) => updateLigne(l.id, 'unite', v)} 
                options={[{ value: 'kg', label: 'KG' }, { value: 'L', label: 'L' }, { value: 'unité', label: 'U' }]} 
                className="w-20" 
              />
              {l.produit && l.qte && (
                <span className="text-xs text-ios-gray pb-3 w-20">
                  {(parseFloat(l.qte) * getPrice(l.produit)).toFixed(0)} MAD
                </span>
              )}
              {form.lignes.length > 1 && (
                <button onClick={() => removeLigne(l.id)} className="text-ios-red pb-1 text-xl">×</button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <div className="text-sm">
            <span className="text-ios-gray">Total estimé: </span>
            <span className="font-bold text-ios-green">{totalValue.toFixed(0)} MAD</span>
          </div>
          <Button onClick={handleSubmit} disabled={validLignes.length === 0}>
            ✅ Enregistrer ({validLignes.length})
          </Button>
        </div>
      </Card>

      {/* Modal Confirmation */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmer la consommation">
        <div className="space-y-4">
          <div className="text-sm text-ios-gray">
            <p><strong>Date:</strong> {form.date}</p>
            <p><strong>Ferme:</strong> {FARMS.find(f => f.id === form.farm)?.name}</p>
            <p><strong>Culture:</strong> {form.culture}</p>
            <p><strong>Destination:</strong> {form.destination}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-xl max-h-48 overflow-y-auto">
            {validLignes.map((l, i) => (
              <div key={i} className="flex justify-between py-1 text-sm">
                <span className="text-ios-dark">{l.produit}</span>
                <span className="font-semibold text-ios-green">{l.qte} {l.unite}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-ios-green">{totalValue.toFixed(0)} MAD</span>
            </div>
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
