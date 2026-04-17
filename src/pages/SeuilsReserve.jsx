import { useState, useEffect } from 'react';
import { getProducts, updateProduct, calculateFarmStock } from '../lib/store';

export default function SeuilsReserve() {
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState({}); // { productId: { qtyPerApp: '', factor: 5 } }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');
  const [factorGlobal, setFactorGlobal] = useState(5);

  useEffect(() => {
    // Charger le stock AGB1 (magasin central)
    const ab1Stock = calculateFarmStock('AGRO BERRY 1');
    const allProducts = getProducts();

    // Garder seulement les produits présents dans le stock AGB1
    const stockProductNames = Object.keys(ab1Stock).filter(name => {
      const s = ab1Stock[name];
      return s && s.quantity > 0;
    });

    const prods = allProducts
      .filter(p => stockProductNames.includes(p.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    setProducts(prods);
    // Init rows avec valeurs existantes
    const init = {};
    prods.forEach(p => {
      const stockQty = ab1Stock[p.name]?.quantity || 0;
      init[p.id] = {
        qtyPerApp: '',
        factor: 5,
        stockQty,
        currentThreshold: p.threshold ?? ''
      };
    });
    setRows(init);
  }, []);

  const updateRow = (id, field, value) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const applyFactorGlobal = () => {
    setRows(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], factor: factorGlobal };
      });
      return updated;
    });
  };

  const getThreshold = (id) => {
    const row = rows[id];
    if (!row) return null;
    const qty = parseFloat(row.qtyPerApp);
    const factor = parseFloat(row.factor);
    if (!qty || !factor) return null;
    return Math.ceil(qty * factor);
  };

  const handleSave = () => {
    setSaving(true);
    let count = 0;
    products.forEach(p => {
      const threshold = getThreshold(p.id);
      if (threshold !== null) {
        updateProduct(p.id, { threshold });
        count++;
      }
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // Refresh products
    setProducts(getProducts().sort((a, b) => a.name.localeCompare(b.name)));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filledCount = products.filter(p => {
    const row = rows[p.id];
    return row && row.qtyPerApp && parseFloat(row.qtyPerApp) > 0;
  }).length;

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
          🧮 Réserve & Seuils d'alerte
        </h1>
        <p style={{ color: '#6e6e73', fontSize: 13, marginTop: 6 }}>
          Saisis la quantité consommée par application pour chaque produit. Le seuil = quantité × facteur de réserve.
        </p>
      </div>

      {/* Config barre */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            placeholder="🔍 Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: 10,
              border: '1px solid #e5e5e5', fontSize: 13, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#6e6e73', whiteSpace: 'nowrap' }}>Facteur global ×</span>
          <input
            type="number" min="1" value={factorGlobal}
            onChange={e => setFactorGlobal(e.target.value)}
            style={{
              width: 60, padding: '8px 10px', borderRadius: 10,
              border: '1px solid #e5e5e5', fontSize: 13, textAlign: 'center',
              outline: 'none', fontFamily: 'inherit'
            }}
          />
          <button
            onClick={applyFactorGlobal}
            style={{
              padding: '8px 14px', background: '#f5f5f7', border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: '#1d1d1f', whiteSpace: 'nowrap'
            }}
          >
            Appliquer à tous
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <div style={{
            background: '#f0fff4', borderRadius: 10, padding: '8px 14px',
            fontSize: 13, color: '#16a34a', fontWeight: 600
          }}>
            {filledCount} / {products.length} produits configurés
          </div>
          <button
            onClick={handleSave}
            disabled={saving || filledCount === 0}
            style={{
              padding: '8px 20px', background: filledCount > 0 ? '#16a34a' : '#ccc',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: filledCount > 0 ? 'pointer' : 'not-allowed', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {saved ? '✅ Enregistré !' : '💾 Valider les seuils'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 130px 80px 130px 100px',
          padding: '12px 20px', background: '#f5f5f7',
          borderBottom: '1px solid #e5e5e5', gap: 12
        }}>
          {['PRODUIT', 'UNITÉ', 'QTÉ / APPLICATION', '× FACTEUR', 'SEUIL CALCULÉ', 'SEUIL ACTUEL'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '.04em' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filteredProducts.map((p, i) => {
          const row = rows[p.id] || { qtyPerApp: '', factor: 5 };
          const threshold = getThreshold(p.id);

          return (
            <div
              key={p.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 130px 80px 130px 100px',
                padding: '11px 20px', gap: 12, alignItems: 'center',
                borderBottom: i < filteredProducts.length - 1 ? '1px solid #f0f0f0' : 'none',
                background: threshold ? '#f0fff4' : '#fff',
                transition: 'background 0.15s'
              }}
            >
              {/* Nom */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>
                  Stock: {row.stockQty % 1 === 0 ? row.stockQty : row.stockQty?.toFixed(2)} {p.unit || 'KG'}
                </div>
              </div>

              {/* Unité */}
              <div style={{ fontSize: 12, color: '#6e6e73' }}>{p.unit || 'KG'}</div>

              {/* Qty per app */}
              <input
                type="number" min="0" step="0.01"
                placeholder="ex: 50"
                value={row.qtyPerApp}
                onChange={e => updateRow(p.id, 'qtyPerApp', e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: `1px solid ${row.qtyPerApp ? '#16a34a' : '#e5e5e5'}`,
                  fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  background: row.qtyPerApp ? '#f0fff4' : '#fff', boxSizing: 'border-box'
                }}
              />

              {/* Factor */}
              <input
                type="number" min="1"
                value={row.factor}
                onChange={e => updateRow(p.id, 'factor', e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1px solid #e5e5e5', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box'
                }}
              />

              {/* Seuil calculé */}
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: threshold ? '#16a34a' : '#ccc'
              }}>
                {threshold ? `${threshold} ${p.unit || 'KG'}` : '—'}
              </div>

              {/* Seuil actuel */}
              <div style={{
                fontSize: 13, color: p.threshold ? '#f59e0b' : '#ccc',
                fontWeight: p.threshold ? 600 : 400
              }}>
                {p.threshold ? `${p.threshold} ${p.unit || 'KG'}` : '—'}
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 13 }}>
            Aucun produit trouvé
          </div>
        )}
      </div>

      {/* Footer note */}
      <p style={{ fontSize: 12, color: '#aaa', marginTop: 14, textAlign: 'center' }}>
        Seuil = Quantité par application × Facteur de réserve · Les alertes se déclenchent quand le stock descend en dessous du seuil
      </p>
    </div>
  );
}
