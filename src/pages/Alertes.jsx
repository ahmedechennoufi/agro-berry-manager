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

const Alertes = () => {
  const ctx = useApp();
  const setPage = ctx?.setPage;
  const [config, setConfig] = useState(() => store.getMelangesConfigAB1());
  const [farmStock, setFarmStock] = useState({});

  useEffect(() => {
    setConfig(store.getMelangesConfigAB1());
    const stock = store.calculateFarmStock(FARM);
    setFarmStock(stock);
  }, []);

  const seuils = store.calcSeuilsFromMelanges(config, MULTIPLIER);

  // Compare with AGB1 stock
  const getStockQty = (productName) => {
    const key = Object.keys(farmStock).find(k => k.toUpperCase().trim() === productName.toUpperCase().trim());
    if (!key) return 0;
    return farmStock[key].quantity || 0;
  };

  const items = Object.entries(seuils).map(([name, seuil]) => {
    const qty = getStockQty(name);
    const pct = seuil.qty > 0 ? Math.min((qty / seuil.qty) * 100, 100) : 100;
    const isCritical = qty < seuil.qty;
    return { name, seuil, qty, pct, isCritical };
  });

  const criticals = items.filter(x => x.isCritical);

  // Export PDF
  const handleExportPDF = () => {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const makeRows = (list) => list.map(item => (
      `<tr><td>${item.name}</td><td style='text-align:center'>${cleanUnit(item.seuil.unit)}</td><td style='text-align:right;font-weight:700;color:#dc2626'>${item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)}</td><td style='text-align:right;color:#6e6e73'>${item.seuil.qty % 1 === 0 ? item.seuil.qty : item.seuil.qty.toFixed(1)}</td></tr>`
    )).join('');
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Alertes ${FARM}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#1d1d1f}table{width:100%;border-collapse:collapse}th{padding:8px 12px;background:#f5f5f7;font-size:10px;text-transform:uppercase;color:#6e6e73;text-align:left;border-bottom:2px solid #e5e7eb}td{padding:8px 12px;font-size:12px;border-bottom:1px solid #f0f0f0}.footer{margin-top:20px;font-size:10px;color:#86868b;display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body><h1 style='color:#f59e0b;font-size:20px;margin-bottom:4px'>Alertes Stock</h1><p style='color:#86868b;font-size:12px;margin-bottom:20px'>${FARM} - ${date}</p>${criticals.length > 0 ? `<h3 style='color:#dc2626;margin:16px 0 8px'>Produits à commander (${criticals.length})</h3><table><thead><tr><th>Produit</th><th>Unité</th><th style='text-align:right'>Stock actuel</th><th style='text-align:right'>Seuil ×${MULTIPLIER}</th></tr></thead><tbody>${makeRows(criticals)}</tbody></table>` : `<p style='color:#16a34a;font-weight:700'>Tous les stocks sont suffisants !</p>`}<div class='footer'><span>Agro Berry Manager</span><span>${date}</span></div><script>window.onload=function(){window.print()}<\/script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  // Export Excel (CSV)
  const handleExportExcel = () => {
    const header = ['Produit', 'Unité', 'Stock actuel', `Seuil ×${MULTIPLIER}`, 'Statut'];
    const rows = criticals.map(item => [
      item.name,
      cleanUnit(item.seuil.unit),
      item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2),
      item.seuil.qty % 1 === 0 ? item.seuil.qty : item.seuil.qty.toFixed(1),
      'CRITIQUE'
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alertes-AGB1-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Aucun mélange configuré
  if (Object.keys(seuils).length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>⚠ Alertes Stock — AGB1</div>
          <div style={{ fontSize: 13, color: '#86868b', marginTop: 4 }}>Seuil = {MULTIPLIER} mélanges · configuré dans Mélanges</div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚗</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f' }}>Aucun mélange configuré</div>
          <div style={{ fontSize: 13, color: '#86868b', marginTop: 8 }}>Va dans <b>Mélanges</b> pour configurer tes recettes</div>
          {setPage && (
            <button
              onClick={() => setPage('melanges')}
              style={{ marginTop: 16, background: '#06b6d4', border: 'none', color: '#fff', fontWeight: 600, borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}
            >⚗ Configurer les mélanges</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>⚠ Alertes Stock — AGB1</div>
          <div style={{ fontSize: 13, color: '#86868b', marginTop: 4 }}>Seuil = {MULTIPLIER} mélanges · configuré dans Mélanges</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportPDF}
            style={{ background: '#dc2626', border: 'none', color: '#fff', fontWeight: 600, borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}
          >📄 Export PDF</button>
          <button
            onClick={handleExportExcel}
            style={{ background: '#16a34a', border: 'none', color: '#fff', fontWeight: 600, borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}
          >📊 Export Excel</button>
        </div>
      </div>

      {criticals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🟢</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>Tous les stocks sont suffisants !</div>
          <div style={{ fontSize: 13, color: '#86868b', marginTop: 8 }}>Stock suffisant pour {MULTIPLIER} mélanges pour tous les produits</div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'linear-gradient(135deg,#fff5f5,#fee2e2)', borderRadius: '14px 14px 0 0', border: '1px solid rgba(220,38,38,0.2)', borderBottom: 'none' }}>
            <span style={{ fontSize: 20 }}>🔴</span>
            <div>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>Produits à commander — Stock insuffisant</div>
              <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>Stock {'<'} {MULTIPLIER} mélanges</div>
            </div>
            <span style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', borderRadius: 20, padding: '3px 12px', fontWeight: 700, fontSize: 13 }}>{criticals.length}</span>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.15)', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 120px', padding: '10px 20px', background: '#fef2f2', fontSize: 10, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              <span>Produit</span>
              <span style={{ textAlign: 'center' }}>Unité</span>
              <span style={{ textAlign: 'right' }}>Stock actuel</span>
              <span style={{ textAlign: 'right' }}>Seuil (×{MULTIPLIER})</span>
            </div>
            {criticals.map(item => (
              <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 120px', padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{item.name}</div>
                  <div style={{ height: 5, background: '#f0f0f0', borderRadius: 4, marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: item.pct + '%', background: '#dc2626', borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#86868b' }}>{cleanUnit(item.seuil.unit)}</div>
                <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>
                  {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)}
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#86868b', fontFamily: 'monospace' }}>
                  {item.seuil.qty % 1 === 0 ? item.seuil.qty : item.seuil.qty.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alertes;
