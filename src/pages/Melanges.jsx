import React, { useState, useEffect } from 'react';
import * as store from '../lib/store';
import { useApp } from '../App';

const FARM = 'AGRO BERRY 1';
const MULTIPLIER = 5;

const cleanUnit = (u) => {
  if (!u) return 'KG';
  if (String(u).startsWith('UNIT')) return 'UNITE';
  return u;
};

const Melanges = () => {
  const ctx = useApp();
  const triggerBackup = ctx?.triggerAutoBackup;
  const showNotif = ctx?.showNotif || (() => {});

  const [config, setConfig] = useState(() => store.getMelangesConfigAB1());
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProducts(store.getProducts());
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      store.setMelangesConfigAB1(config);
      if (triggerBackup) {
        await triggerBackup();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showNotif('✅ Mélanges AGB1 enregistrés', 'success');
    } catch (err) {
      showNotif('❌ Erreur: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const seuils = store.calcSeuilsFromMelanges(config, MULTIPLIER);

  const SECTIONS = [
    { key: 'myrtilleHorsSol', label: '🫐 Myrtille · 💧 Hors Sol', color: '#1e40af', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'rgba(59,130,246,0.2)' },
    { key: 'myrtilleSol',     label: '🫐 Myrtille · 🌱 Sol',     color: '#15803d', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: 'rgba(34,197,94,0.2)' },
    { key: 'fraise',          label: '🍓 Fraise',                 color: '#be123c', bg: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', border: 'rgba(244,63,94,0.2)' }
  ];

  const renderSection = ({ key: type, label, color, bg, border }) => {
    const items = config[type] || [];

    const updateItem = (idx, field, val) => {
      const next = { ...config, [type]: items.map((it, i) => i === idx ? { ...it, [field]: val } : it) };
      setConfig(next);
    };
    const addItem = () => {
      setConfig({ ...config, [type]: [...items, { product: '', qty: '', unit: 'KG' }] });
    };
    const removeItem = (idx) => {
      setConfig({ ...config, [type]: items.filter((_, i) => i !== idx) });
    };

    return (
      <div style={{ marginBottom: 24, background: '#fff', border: '1px solid ' + border, borderRadius: 16, overflow: 'visible', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 20px', background: bg, borderBottom: '1px solid ' + border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, color, fontSize: 15 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#86868b' }}>
              {items.length} produit{items.length > 1 ? 's' : ''} · Seuil total ×{MULTIPLIER} : <b style={{ color }}>{items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * MULTIPLIER, 0).toFixed(1)}</b>
            </span>
            <button onClick={addItem} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Ajouter</button>
          </div>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#86868b', fontSize: 13 }}>Aucun produit configuré — clique sur "+ Ajouter"</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 40px', padding: '8px 20px', background: '#f9fafb', fontSize: 10, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              <span>Produit</span><span style={{ textAlign: 'right' }}>Qté / mélange</span><span style={{ textAlign: 'center' }}>Unité</span><span></span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 40px', padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    value={item.product || ''}
                    onChange={e => {
                      const upper = e.target.value.toUpperCase();
                      const next = { ...config, [type]: items.map((it, i) => i === idx ? { ...it, product: upper, _showDrop: true } : it) };
                      setConfig(next);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        const next = { ...config, [type]: items.map((it, i) => i === idx ? { ...it, _showDrop: false } : it) };
                        setConfig(next);
                      }, 200);
                    }}
                    placeholder="Nom du produit..."
                    autoComplete="off"
                  />
                  {item.product && item.product.length >= 2 && item._showDrop !== false && (() => {
                    const matches = products.filter(p => p.name.toUpperCase().includes(item.product)).slice(0, 8);
                    if (matches.length === 0) return null;
                    return (
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, maxHeight: 200, overflowY: 'auto', zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                        {matches.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={e => {
                              e.preventDefault();
                              const next = { ...config, [type]: items.map((it, i) => i === idx ? { ...it, product: p.name.toUpperCase(), unit: cleanUnit(p.unit), _showDrop: false } : it) };
                              setConfig(next);
                            }}
                            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fff4'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: 500, color: '#1d1d1f' }}>{p.name.toUpperCase()}</span>
                            <span style={{ fontSize: 11, color: '#86868b' }}>{cleanUnit(p.unit)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <input
                  type="number"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, textAlign: 'right', outline: 'none' }}
                  value={item.qty || ''}
                  onChange={e => updateItem(idx, 'qty', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <select
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
                  value={item.unit || 'KG'}
                  onChange={e => updateItem(idx, 'unit', e.target.value)}
                >
                  <option>KG</option>
                  <option>L</option>
                  <option>UNITE</option>
                </select>
                <button
                  onClick={() => removeItem(idx)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, padding: 0 }}
                >✕</button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>⚗ Mélanges — AGB1</div>
          <div style={{ fontSize: 13, color: '#86868b', marginTop: 4 }}>Configure tes recettes — les seuils d'alerte se calculent automatiquement ×{MULTIPLIER}</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: saved ? '#16a34a' : '#06b6d4', border: 'none', color: '#fff', borderRadius: 12, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? '⏳ Enregistrement...' : saved ? '✅ Enregistré !' : '💾 Valider et Enregistrer'}
        </button>
      </div>

      {SECTIONS.map(section => <React.Fragment key={section.key}>{renderSection(section)}</React.Fragment>)}

      <div style={{ background: 'linear-gradient(135deg,#f0fff4,#dcfce7)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 13, marginBottom: 12 }}>📊 Aperçu des seuils calculés ×{MULTIPLIER}</div>
        {Object.entries(seuils).length === 0 ? (
          <div style={{ color: '#86868b', fontSize: 13 }}>Configure tes mélanges ci-dessus pour voir les seuils</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {Object.entries(seuils).map(([name, s]) => (
              <div key={name} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>{name}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                  {s.qty % 1 === 0 ? s.qty : s.qty.toFixed(1)} {cleanUnit(s.unit)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Melanges;
